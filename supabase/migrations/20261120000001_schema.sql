-- =====================================================================
-- Beauty Salon — schéma principal
-- Tables : profiles, salon_settings, clients, visits, rewards
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles : un profil par utilisateur Supabase Auth.
-- Seul un profil avec role = 'admin' a accès aux données.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'none' check (role in ('admin', 'none')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- salon_settings : une seule ligne (id = 1).
-- ---------------------------------------------------------------------
create table if not exists public.salon_settings (
  id             smallint primary key default 1 check (id = 1),
  salon_name     text not null default 'Beauty Salon',
  address        text,
  phone          text,
  haircut_price  numeric(10, 3) not null default 15 check (haircut_price >= 0),
  updated_at     timestamptz not null default now()
);

insert into public.salon_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- clients
--   cycle_position : nombre de coupes déjà faites dans le cycle en cours
--                    (0 à 16). Le cycle complet compte 17 coupes :
--                    1-5 payées, 6 = remise 10 DT, 7-16 payées, 17 = offerte.
--   cycle_number   : numéro du cycle en cours (commence à 1).
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone           text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  notes           text,
  total_haircuts  integer not null default 0 check (total_haircuts >= 0),
  cycle_position  smallint not null default 0 check (cycle_position between 0 and 16),
  cycle_number    integer not null default 1 check (cycle_number >= 1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint clients_phone_unique unique (phone)
);

create index if not exists clients_full_name_idx on public.clients (lower(full_name));
create index if not exists clients_created_at_idx on public.clients (created_at desc);
create index if not exists clients_cycle_position_idx on public.clients (cycle_position);

-- ---------------------------------------------------------------------
-- visits : chaque coupe enregistrée.
--   idempotency_key : générée par le navigateur pour chaque confirmation ;
--                     une double soumission renvoie la même visite.
-- ---------------------------------------------------------------------
create table if not exists public.visits (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  visit_type       text not null check (visit_type in ('paid', 'discount', 'free')),
  base_price       numeric(10, 3) not null check (base_price >= 0),
  discount_amount  numeric(10, 3) not null default 0 check (discount_amount >= 0),
  amount_paid      numeric(10, 3) not null check (amount_paid >= 0),
  cycle_number     integer not null,
  cycle_position   smallint not null check (cycle_position between 1 and 17),
  idempotency_key  uuid not null,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint visits_idempotency_key_unique unique (idempotency_key),
  constraint visits_cycle_slot_unique unique (client_id, cycle_number, cycle_position)
);

create index if not exists visits_client_id_idx on public.visits (client_id, created_at desc);
create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_type_idx on public.visits (visit_type);

-- ---------------------------------------------------------------------
-- rewards : une ligne par récompense accordée.
-- La contrainte unique empêche d'accorder deux fois la même récompense
-- dans le même cycle.
-- ---------------------------------------------------------------------
create table if not exists public.rewards (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  visit_id     uuid not null references public.visits (id) on delete cascade,
  reward_type  text not null check (reward_type in ('discount_10', 'free_haircut')),
  amount       numeric(10, 3) not null check (amount >= 0),
  cycle_number integer not null,
  created_at   timestamptz not null default now(),
  constraint rewards_once_per_cycle unique (client_id, cycle_number, reward_type),
  constraint rewards_visit_unique unique (visit_id)
);

create index if not exists rewards_client_id_idx on public.rewards (client_id, created_at desc);
create index if not exists rewards_created_at_idx on public.rewards (created_at desc);

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists salon_settings_touch on public.salon_settings;
create trigger salon_settings_touch before update on public.salon_settings
  for each row execute function public.touch_updated_at();

-- Les compteurs de fidélité ne peuvent pas être modifiés à la main
-- depuis l'application : seule register_visit() les fait évoluer.
create or replace function public.protect_loyalty_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.loyalty_write', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.total_haircuts := 0;
      new.cycle_position := 0;
      new.cycle_number := 1;
    else
      new.total_haircuts := old.total_haircuts;
      new.cycle_position := old.cycle_position;
      new.cycle_number := old.cycle_number;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_protect_loyalty on public.clients;
create trigger clients_protect_loyalty before insert or update on public.clients
  for each row execute function public.protect_loyalty_columns();

-- ---------------------------------------------------------------------
-- Normalisation du téléphone : "+216 22 345 678", "0021622345678" et
-- "22 345 678" deviennent tous "22345678". Les numéros étrangers gardent
-- leur "+". Ainsi l'unicité ne peut pas être contournée par le format.
-- ---------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  if p is null then
    return null;
  end if;
  v := regexp_replace(btrim(p), '[^0-9+]', '', 'g');
  v := regexp_replace(v, '(?!^)\+', '', 'g');
  if v like '00%' then
    v := '+' || substr(v, 3);
  end if;
  if v ~ '^\+216[0-9]{8}$' then
    v := substr(v, 5);
  end if;
  return v;
end;
$$;

create or replace function public.clients_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.full_name := regexp_replace(btrim(new.full_name), '\s+', ' ', 'g');
  new.notes := nullif(btrim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

drop trigger if exists clients_normalize on public.clients;
create trigger clients_normalize before insert or update on public.clients
  for each row execute function public.clients_normalize();
