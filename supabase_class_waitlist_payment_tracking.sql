-- Capacity concept doesn't exist yet on scheduled_classes — add it (nullable = no cap, no waitlist)
alter table scheduled_classes add column if not exists max_slots integer;

-- Payment + status fields on both signup tables
alter table bball_class_signups add column if not exists status text not null default 'booked' check (status in ('booked','waitlist','no_show'));
alter table bball_class_signups add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid_online','paid_cash'));
alter table bball_class_signups add column if not exists amount_paid numeric;

alter table class_attendees add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid_online','paid_cash'));
alter table class_attendees add column if not exists amount_paid numeric;
-- class_attendees.status already exists ('scheduled'/'attended'/'absent') — add 'waitlist' as a valid value:
alter table class_attendees drop constraint if exists class_attendees_status_check;
alter table class_attendees add constraint class_attendees_status_check check (status in ('scheduled','attended','absent','waitlist'));

-- Replace the old hard-reject capacity trigger with auto-waitlist logic (bball_classes)
create or replace function check_bball_class_capacity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_max_slots int;
  v_booked_count int;
begin
  select max_slots into v_max_slots from bball_classes where id = new.class_id;
  select count(*) into v_booked_count from bball_class_signups
    where class_id = new.class_id and occurrence_date = new.occurrence_date and status = 'booked';
  if v_max_slots is not null and v_booked_count >= v_max_slots then
    new.status := 'waitlist';
  else
    new.status := coalesce(new.status, 'booked');
  end if;
  return new;
end;
$$;

-- Same auto-waitlist logic for scheduled_classes (new trigger, since it never had capacity enforcement before)
create or replace function check_scheduled_class_capacity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_max_slots int;
  v_class_id uuid;
  v_booked_count int;
begin
  v_class_id := coalesce((select parent_class_id from scheduled_classes where id = new.class_id), new.class_id);
  select max_slots into v_max_slots from scheduled_classes where id = v_class_id;
  select count(*) into v_booked_count from class_attendees
    where class_id = new.class_id and occurrence_date = new.occurrence_date and status = 'scheduled';
  if v_max_slots is not null and v_booked_count >= v_max_slots then
    new.status := 'waitlist';
  else
    new.status := coalesce(new.status, 'scheduled');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_scheduled_class_capacity on class_attendees;
create trigger trg_check_scheduled_class_capacity
  before insert on class_attendees
  for each row execute function check_scheduled_class_capacity();
