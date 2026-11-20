-- =====================================================================
-- Beauty Salon — carte client publique (lien secret / QR code)
--
-- Chaque client reçoit un share_token aléatoire (24 caractères, 144 bits).
-- La page /carte/<token> appelle get_loyalty_card(token), accessible sans
-- connexion, qui ne renvoie QUE : prénom, progression, statut, date de la
-- dernière visite, nom et téléphone du salon. Rien d'autre n'est exposé.
-- =====================================================================

create or replace function public.new_share_token()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 18 octets aléatoires → 24 caractères base64url, sans "="
  select translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
$$;

alter table public.clients
  add column if not exists share_token text;

update public.clients set share_token = public.new_share_token() where share_token is null;

alter table public.clients
  alter column share_token set default public.new_share_token(),
  alter column share_token set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_share_token_unique') then
    alter table public.clients add constraint clients_share_token_unique unique (share_token);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- get_loyalty_card : lecture publique, en lecture seule, par lien secret.
-- ---------------------------------------------------------------------
create or replace function public.get_loyalty_card(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client   public.clients%rowtype;
  v_settings public.salon_settings%rowtype;
  v_last     timestamptz;
begin
  -- Refuse les jetons mal formés sans interroger la table.
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{24}$' then
    return null;
  end if;

  select * into v_client from public.clients where share_token = p_token;
  if not found then
    return null;
  end if;

  select * into v_settings from public.salon_settings where id = 1;
  select max(created_at) into v_last from public.visits where client_id = v_client.id;

  return jsonb_build_object(
    'first_name',       split_part(v_client.full_name, ' ', 1),
    'cycle_position',   v_client.cycle_position,
    'cycle_number',     v_client.cycle_number,
    'completed_cycles', v_client.cycle_number - 1,
    'total_haircuts',   v_client.total_haircuts,
    'last_visit_at',    v_last,
    'member_since',     v_client.created_at,
    'salon_name',       v_settings.salon_name,
    'salon_phone',      v_settings.phone
  );
end;
$$;

revoke all on function public.get_loyalty_card(text) from public;
grant execute on function public.get_loyalty_card(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- regenerate_share_token : l'admin invalide l'ancien lien (ex. s'il a fuité).
-- ---------------------------------------------------------------------
create or replace function public.regenerate_share_token(p_client_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  update public.clients
     set share_token = public.new_share_token()
   where id = p_client_id
  returning share_token into v_token;

  if v_token is null then
    raise exception 'Client introuvable' using errcode = 'P0002';
  end if;
  return v_token;
end;
$$;

revoke all on function public.regenerate_share_token(uuid) from public;
revoke all on function public.regenerate_share_token(uuid) from anon;
grant execute on function public.regenerate_share_token(uuid) to authenticated;

-- Nécessaire : la valeur par défaut de share_token est calculée avec les droits
-- de l'admin connecté lors de l'ajout d'un client.
revoke all on function public.new_share_token() from public;
revoke all on function public.new_share_token() from anon;
grant execute on function public.new_share_token() to authenticated;
