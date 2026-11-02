-- Run only against an isolated test database, never the product DB.
insert into auth.users (id) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
insert into public.areas(id,user_id,name) values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Owner A');
insert into public.metrics(id,user_id,area_id,title,kind,value_type) values
('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Private goal','goal','number');
insert into public.actual_observations(id,user_id,metric_id,value) values
('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','{"type":"number","amount":1}');
insert into public.target_revisions(id,user_id,metric_id,value) values
('44444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','{"type":"number","amount":4}');
insert into public.personal_notes(user_id,title,body) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Private','secret');
insert into public.user_preferences(user_id,purpose_text) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Private');
insert into public.vision_images(user_id,storage_path) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','user-a/photo.jpg');

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false);
do $$
declare n int;
begin
  select count(*) into n from public.areas;
  if n <> 0 then raise exception 'RLS: cross-owner areas exposed'; end if;
  select count(*) into n from public.metrics;
  if n <> 0 then raise exception 'RLS: cross-owner metrics exposed'; end if;
  select count(*) into n from public.actual_observations;
  if n <> 0 then raise exception 'RLS: cross-owner observations exposed'; end if;
  select count(*) into n from public.target_revisions;
  if n <> 0 then raise exception 'RLS: cross-owner targets exposed'; end if;
  select count(*) into n from public.personal_notes;
  if n <> 0 then raise exception 'RLS: cross-owner notes exposed'; end if;
  select count(*) into n from public.user_preferences;
  if n <> 0 then raise exception 'RLS: cross-owner preferences exposed'; end if;
  select count(*) into n from public.vision_images;
  if n <> 0 then raise exception 'RLS: cross-owner vision images exposed'; end if;
end $$;

-- Cross-tenant references must be rejected by the owner-bound FK.
do $$
begin
  begin
    insert into public.metrics(user_id,area_id,title,kind,value_type)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','Attack','goal','number');
    raise exception 'Security regression: cross-owner metric was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.actual_observations(user_id,metric_id,value)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','{"type":"number","amount":5}');
    raise exception 'Security regression: cross-owner observation was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.metrics set title='Malicious' where id='22222222-2222-4222-8222-222222222222';
    if found then raise exception 'Security regression: cross-owner update allowed'; end if;
  end;
end $$;

-- A should still see all their records.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false);
do $$
declare n int;
begin
 select count(*) into n from public.metrics;
 if n <> 1 then raise exception 'Owner cannot see own metric'; end if;
end $$;
reset role;
