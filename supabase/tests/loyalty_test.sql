-- Loyalty program tests. Run after supabase_stub.sql and the migrations.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'admin@test.tn'),
                              ('00000000-0000-0000-0000-00000000000b', 'intrus@test.tn');
insert into public.profiles (id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');
update public.salon_settings set haircut_price = 15;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$
declare
  c uuid; r jsonb; i int; k uuid; t text;
  expected text;
begin
  -- Client creation + phone normalisation
  insert into public.clients (full_name, phone, cycle_position) values ('  Karim   Ben Ali ', '+216 22 345 678', 9)
  returning id into c;
  assert (select phone from public.clients where id = c) = '22345678', 'phone normalised';
  assert (select full_name from public.clients where id = c) = 'Karim Ben Ali', 'name normalised';
  assert (select cycle_position from public.clients where id = c) = 0, 'loyalty columns cannot be set on insert';

  -- Duplicate phone, different format
  begin
    insert into public.clients (full_name, phone) values ('Autre', '0021622345678');
    raise exception 'DUPLICATE PHONE NOT REJECTED';
  exception when unique_violation then null;
  end;

  -- Manual tampering with counters is ignored
  update public.clients set cycle_position = 16, total_haircuts = 99 where id = c;
  assert (select cycle_position from public.clients where id = c) = 0, 'cannot tamper cycle_position';

  -- Two full cycles (34 visits) + 3 into a third
  for i in 1..37 loop
    k := gen_random_uuid();
    r := public.register_visit(c, k);
    expected := case when ((i - 1) % 17) + 1 = 6 then 'discount'
                     when ((i - 1) % 17) + 1 = 17 then 'free' else 'paid' end;
    assert r->>'visit_type' = expected, format('visit %s: expected %s got %s', i, expected, r->>'visit_type');
    if expected = 'discount' then
      assert (r->>'discount_amount')::numeric = 10 and (r->>'amount_paid')::numeric = 5, 'discount exactly 10 DT';
    elsif expected = 'free' then
      assert (r->>'amount_paid')::numeric = 0, 'free costs 0';
      assert (r->>'new_cycle_position')::int = 0, 'reset after free';
    else
      assert (r->>'discount_amount')::numeric = 0, 'paid has no discount';
    end if;
    -- Re-sending the same request does nothing
    r := public.register_visit(c, k);
    assert (r->>'duplicate')::boolean, 'duplicate flagged';
  end loop;

  assert (select count(*) from public.visits where client_id = c) = 37, 'exactly 37 visits';
  assert (select total_haircuts from public.clients where id = c) = 37, 'total 37';
  assert (select cycle_position from public.clients where id = c) = 3, 'position 3 in cycle 3';
  assert (select cycle_number from public.clients where id = c) = 3, 'cycle 3';
  assert (select count(*) from public.rewards where client_id = c and reward_type = 'discount_10') = 2, '2 discounts (cycles 1,2 ; cycle 3 is only at position 3)';
  assert (select count(*) from public.rewards where client_id = c and reward_type = 'free_haircut') = 2, '2 free';

  -- Direct inserts into rewards/visits are forbidden
  begin
    insert into public.rewards (client_id, visit_id, reward_type, amount, cycle_number)
    select c, id, 'free_haircut', 0, 99 from public.visits limit 1;
    raise exception 'DIRECT REWARD INSERT NOT BLOCKED';
  exception when insufficient_privilege then null;
  end;

  raise notice 'ALL LOYALTY TESTS PASSED';
end $$;

-- Non-admin user sees nothing and cannot register
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  assert (select count(*) from public.clients) = 0, 'non-admin sees no clients';
  begin
    perform public.register_visit((select gen_random_uuid()), gen_random_uuid());
    raise exception 'NON-ADMIN REGISTERED A VISIT';
  exception when insufficient_privilege then null;
  end;
  raise notice 'NON-ADMIN TESTS PASSED';
end $$;

reset role;
set role anon;
do $$
begin
  begin
    perform count(*) from public.clients;
    raise exception 'ANON CAN READ CLIENTS';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ANON TESTS PASSED';
end $$;
reset role;
