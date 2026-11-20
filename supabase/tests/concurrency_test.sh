#!/usr/bin/env bash
# Concurrency test. Usage: concurrency_test.sh "<psql connection string>"
# Phase A: client at position 5 (next = discount). 5 different requests at the same instant.
#          Expect 5 visits, exactly 1 discount, position 10.
# Phase B: 10 identical submissions (same idempotency key) at the same instant.
#          Expect exactly 1 extra visit.
set -e
DB="$1"
CID=11111111-1111-1111-1111-111111111111
AS_ADMIN="set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);"
psql -q "$DB" -v ON_ERROR_STOP=1 >/dev/null <<SQL
delete from public.clients where id = '$CID';
select set_config('app.loyalty_write','on',false);
insert into public.clients (id, full_name, phone, cycle_position) values ('$CID','Concurrent','55000000',5);
SQL
for i in $(seq 1 5); do psql -q "$DB" -c "$AS_ADMIN select public.register_visit('$CID', gen_random_uuid());" >/dev/null & done; wait
A=$(psql -tA "$DB" -c "select count(*)||'|'||(select count(*) from rewards where client_id='$CID' and reward_type='discount_10')||'|'||(select cycle_position from clients where id='$CID') from visits where client_id='$CID'")
echo "Phase A (visits|discounts|position): $A  expected 5|1|10"
for i in $(seq 1 10); do psql -q "$DB" -c "$AS_ADMIN select public.register_visit('$CID', '22222222-2222-2222-2222-222222222222');" >/dev/null 2>&1 & done; wait
B=$(psql -tA "$DB" -c "select count(*) from visits where client_id='$CID'")
echo "Phase B (visits): $B  expected 6"
[ "$A" = "5|1|10" ] && [ "$B" = "6" ] && echo "CONCURRENCY TESTS PASSED" || { echo "CONCURRENCY TESTS FAILED"; exit 1; }
