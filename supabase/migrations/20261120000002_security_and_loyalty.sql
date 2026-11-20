-- =====================================================================
-- Beauty Salon — sécurité (RLS) et logique de fidélité côté serveur
-- =====================================================================

-- ---------------------------------------------------------------------
-- is_admin() : vrai uniquement si l'utilisateur connecté a role = 'admin'
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.salon_settings enable row level security;
alter table public.clients        enable row level security;
alter table public.visits         enable row level security;
alter table public.rewards        enable row level security;

-- profiles : chacun lit son propre profil (pour savoir s'il est admin).
-- Aucune écriture depuis l'application : le rôle admin se donne en SQL.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- salon_settings : lecture et modification par l'admin.
drop policy if exists settings_admin_select on public.salon_settings;
create policy settings_admin_select on public.salon_settings
  for select to authenticated using (public.is_admin());

drop policy if exists settings_admin_update on public.salon_settings;
create policy settings_admin_update on public.salon_settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- clients : CRUD complet pour l'admin.
drop policy if exists clients_admin_all on public.clients;
create policy clients_admin_all on public.clients
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- visits / rewards : lecture seule pour l'admin.
-- Les insertions passent exclusivement par register_visit().
drop policy if exists visits_admin_select on public.visits;
create policy visits_admin_select on public.visits
  for select to authenticated using (public.is_admin());

drop policy if exists rewards_admin_select on public.rewards;
create policy rewards_admin_select on public.rewards
  for select to authenticated using (public.is_admin());

-- Droits de table : rien pour anon ; pas d'écriture directe sur visits/rewards.
revoke all on public.profiles, public.salon_settings, public.clients,
              public.visits, public.rewards from anon;
revoke insert, update, delete on public.visits, public.rewards from authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles, public.salon_settings, public.clients,
               public.visits, public.rewards to authenticated;
grant update on public.salon_settings to authenticated;
grant insert, update, delete on public.clients to authenticated;

-- ---------------------------------------------------------------------
-- loyalty_rule(position) : nature de la n-ième coupe du cycle (1..17)
--   1-5   → 'paid'
--   6     → 'discount' (10 DT de remise)
--   7-16  → 'paid'     (10 coupes payées supplémentaires)
--   17    → 'free'     (puis remise à zéro)
-- ---------------------------------------------------------------------
create or replace function public.loyalty_rule(p_position integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_position = 6  then 'discount'
    when p_position = 17 then 'free'
    when p_position between 1 and 16 then 'paid'
    else null
  end;
$$;

-- ---------------------------------------------------------------------
-- register_visit : enregistre une coupe de façon atomique.
--
--  * verrouille la ligne du client (FOR UPDATE) : deux requêtes
--    simultanées pour le même client sont traitées l'une après l'autre ;
--  * idempotency_key : si la même confirmation arrive deux fois,
--    la visite existante est renvoyée sans rien créer ;
--  * contraintes uniques (slot de cycle, récompense par cycle) :
--    filet de sécurité final contre toute récompense en double.
-- ---------------------------------------------------------------------
create or replace function public.register_visit(
  p_client_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client     public.clients%rowtype;
  v_existing   public.visits%rowtype;
  v_price      numeric(10, 3);
  v_position   integer;
  v_type       text;
  v_discount   numeric(10, 3) := 0;
  v_paid       numeric(10, 3);
  v_visit_id   uuid;
  v_reward_id  uuid;
  v_new_pos    integer;
  v_new_cycle  integer;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  if p_client_id is null or p_idempotency_key is null then
    raise exception 'Paramètres manquants' using errcode = '22023';
  end if;

  -- Verrou sur le client : sérialise les enregistrements concurrents.
  select * into v_client from public.clients
  where id = p_client_id
  for update;

  if not found then
    raise exception 'Client introuvable' using errcode = 'P0002';
  end if;

  -- Double soumission : on renvoie la visite déjà créée.
  select * into v_existing from public.visits
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.client_id <> p_client_id then
      raise exception 'Clé de requête déjà utilisée' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'duplicate', true,
      'visit_id', v_existing.id,
      'visit_type', v_existing.visit_type,
      'base_price', v_existing.base_price,
      'discount_amount', v_existing.discount_amount,
      'amount_paid', v_existing.amount_paid,
      'cycle_number', v_existing.cycle_number,
      'cycle_position', v_existing.cycle_position,
      'new_cycle_position', v_client.cycle_position,
      'new_cycle_number', v_client.cycle_number,
      'total_haircuts', v_client.total_haircuts
    );
  end if;

  select haircut_price into v_price from public.salon_settings where id = 1;
  v_price := coalesce(v_price, 0);

  v_position := v_client.cycle_position + 1;   -- 1..17
  v_type := public.loyalty_rule(v_position);

  if v_type = 'discount' then
    v_discount := least(10, v_price);
  elsif v_type = 'free' then
    v_discount := v_price;
  end if;
  v_paid := v_price - v_discount;

  insert into public.visits (
    client_id, visit_type, base_price, discount_amount, amount_paid,
    cycle_number, cycle_position, idempotency_key, created_by
  ) values (
    v_client.id, v_type, v_price, v_discount, v_paid,
    v_client.cycle_number, v_position, p_idempotency_key, auth.uid()
  )
  returning id into v_visit_id;

  if v_type = 'discount' then
    insert into public.rewards (client_id, visit_id, reward_type, amount, cycle_number)
    values (v_client.id, v_visit_id, 'discount_10', v_discount, v_client.cycle_number)
    returning id into v_reward_id;
  elsif v_type = 'free' then
    insert into public.rewards (client_id, visit_id, reward_type, amount, cycle_number)
    values (v_client.id, v_visit_id, 'free_haircut', v_discount, v_client.cycle_number)
    returning id into v_reward_id;
  end if;

  -- Remise à zéro uniquement APRÈS la coupe offerte validée.
  if v_type = 'free' then
    v_new_pos := 0;
    v_new_cycle := v_client.cycle_number + 1;
  else
    v_new_pos := v_position;
    v_new_cycle := v_client.cycle_number;
  end if;

  perform set_config('app.loyalty_write', 'on', true);
  update public.clients
     set cycle_position = v_new_pos,
         cycle_number   = v_new_cycle,
         total_haircuts = total_haircuts + 1
   where id = v_client.id;
  perform set_config('app.loyalty_write', 'off', true);

  return jsonb_build_object(
    'duplicate', false,
    'visit_id', v_visit_id,
    'reward_id', v_reward_id,
    'visit_type', v_type,
    'base_price', v_price,
    'discount_amount', v_discount,
    'amount_paid', v_paid,
    'cycle_number', v_client.cycle_number,
    'cycle_position', v_position,
    'new_cycle_position', v_new_pos,
    'new_cycle_number', v_new_cycle,
    'total_haircuts', v_client.total_haircuts + 1
  );
end;
$$;

revoke all on function public.register_visit(uuid, uuid) from public;
revoke all on function public.register_visit(uuid, uuid) from anon;
grant execute on function public.register_visit(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- dashboard_stats : chiffres du tableau de bord en un seul appel.
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_clients',   (select count(*) from public.clients),
    'total_visits',    (select count(*) from public.visits),
    'total_discounts', (select count(*) from public.rewards where reward_type = 'discount_10'),
    'total_free',      (select count(*) from public.rewards where reward_type = 'free_haircut'),
    'discount_amount', (select coalesce(sum(amount), 0) from public.rewards where reward_type = 'discount_10'),
    'visits_today',    (select count(*) from public.visits
                        where created_at >= date_trunc('day', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis')
  );
end;
$$;

revoke all on function public.dashboard_stats() from public;
revoke all on function public.dashboard_stats() from anon;
grant execute on function public.dashboard_stats() to authenticated;

-- Les fonctions internes ne sont pas appelables par anon.
revoke all on function public.normalize_phone(text) from anon;
revoke all on function public.loyalty_rule(integer) from anon;
