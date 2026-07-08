-- Run this in the Supabase SQL Editor before deploying the /classes feature.

create table if not exists bball_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  day_of_week text not null check (day_of_week in ('sunday','monday','tuesday','wednesday','thursday','friday','saturday')),
  start_time time not null,
  end_time time not null,
  gender_restriction text not null default 'mixed' check (gender_restriction in ('mixed','men','women')),
  max_slots int not null default 10,
  is_recurring boolean not null default true,
  specific_date date,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  constraint bball_classes_specific_date_check check (is_recurring or specific_date is not null)
);

create table if not exists bball_class_signups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references bball_classes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  occurrence_date date not null,
  created_at timestamptz default now(),
  unique (class_id, user_id, occurrence_date)
);

-- Enforce capacity atomically so a race-condition join gets a DB error, not a silent overbook.
create or replace function check_bball_class_capacity() returns trigger as $$
declare
  v_max_slots int;
  v_count int;
begin
  select max_slots into v_max_slots from bball_classes where id = new.class_id;
  select count(*) into v_count from bball_class_signups where class_id = new.class_id and occurrence_date = new.occurrence_date;
  if v_count >= v_max_slots then
    raise exception 'Class is full';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_bball_class_capacity on bball_class_signups;
create trigger enforce_bball_class_capacity
before insert on bball_class_signups
for each row execute function check_bball_class_capacity();

alter table bball_classes enable row level security;
alter table bball_class_signups enable row level security;

drop policy if exists "Anyone can view classes" on bball_classes;
create policy "Anyone can view classes" on bball_classes for select using (true);

drop policy if exists "Admins manage classes" on bball_classes;
create policy "Admins manage classes" on bball_classes for all using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

drop policy if exists "Anyone can view signups" on bball_class_signups;
create policy "Anyone can view signups" on bball_class_signups for select using (true);

drop policy if exists "Users create own signups" on bball_class_signups;
create policy "Users create own signups" on bball_class_signups for insert with check (user_id = auth.uid());

drop policy if exists "Users delete own signups" on bball_class_signups;
create policy "Users delete own signups" on bball_class_signups for delete using (user_id = auth.uid());

drop policy if exists "Admins manage all signups" on bball_class_signups;
create policy "Admins manage all signups" on bball_class_signups for all using (get_my_role() = 'admin') with check (get_my_role() = 'admin');
