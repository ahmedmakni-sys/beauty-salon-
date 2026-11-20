-- Tests de la carte client publique. À lancer après loyalty_test.sql.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$
declare c uuid; t text; t2 text; card jsonb;
begin
  insert into public.clients (full_name, phone) values ('Sami Ben Salah', '98111222') returning id, share_token into c, t;
  assert t ~ '^[A-Za-z0-9_-]{24}$', 'token format';
  perform public.register_visit(c, gen_random_uuid());
  perform public.register_visit(c, gen_random_uuid());
  t2 := public.regenerate_share_token(c);
  assert t2 <> t, 'token changed';
  perform set_config('test.old', t, false);
  perform set_config('test.new', t2, false);
  raise notice 'ADMIN CARD TESTS PASSED';
end $$;

-- Visiteur anonyme
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$
declare card jsonb;
begin
  card := public.get_loyalty_card(current_setting('test.new'));
  assert card->>'first_name' = 'Sami', 'first name only';
  assert (card->>'cycle_position')::int = 2, 'position 2';
  assert card->>'last_visit_at' is not null, 'last visit';
  assert not (card ? 'phone') and not (card ? 'notes') and not (card ? 'full_name'), 'no private data';
  assert public.get_loyalty_card(current_setting('test.old')) is null, 'old link revoked';
  assert public.get_loyalty_card('abc') is null, 'malformed token';
  assert public.get_loyalty_card(repeat('A', 24)) is null, 'unknown token';
  begin
    perform public.regenerate_share_token(gen_random_uuid());
    raise exception 'ANON REGENERATED A TOKEN';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ANON CARD TESTS PASSED';
end $$;
reset role;
