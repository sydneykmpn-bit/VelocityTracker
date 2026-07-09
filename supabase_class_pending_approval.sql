-- Self-joins now land in a 'pending' state that a coach/admin must approve; admin/coach-added
-- attendees (existing member or guest, via the roster page's Add Attendee flow) skip straight to
-- booked/scheduled since that action is itself an implicit approval.

alter table bball_class_signups alter column status drop default;
alter table bball_class_signups drop constraint if exists bball_class_signups_status_check;
alter table bball_class_signups add constraint bball_class_signups_status_check
  check (status in ('pending', 'booked', 'waitlist', 'no_show'));

alter table class_attendees alter column status drop default;
alter table class_attendees drop constraint if exists class_attendees_status_check;
alter table class_attendees add constraint class_attendees_status_check
  check (status in ('pending', 'scheduled', 'attended', 'absent', 'waitlist'));

-- bball_classes: self-join -> pending; admin/coach add (explicit status passed in) -> honored as-is;
-- any transition INTO 'booked' (Approve, Move to Booked, or a plain insert with no status from a
-- non-self caller) re-checks capacity and downgrades to 'waitlist' if the class is already full.
create or replace function check_bball_class_capacity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_max_slots int;
  v_booked_count int;
  v_wants_booked boolean;
begin
  if tg_op = 'INSERT' and new.status is null and new.user_id is not null and auth.uid() = new.user_id then
    new.status := 'pending';
    return new;
  end if;

  v_wants_booked := (
    (tg_op = 'INSERT' and (new.status = 'booked' or new.status is null))
    or (tg_op = 'UPDATE' and new.status = 'booked' and old.status is distinct from 'booked')
  );

  if v_wants_booked then
    select max_slots into v_max_slots from bball_classes where id = new.class_id;
    select count(*) into v_booked_count from bball_class_signups
      where class_id = new.class_id and occurrence_date = new.occurrence_date and status = 'booked'
        and id is distinct from new.id;
    if v_max_slots is not null and v_booked_count >= v_max_slots then
      new.status := 'waitlist';
    else
      new.status := 'booked';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_bball_class_capacity on bball_class_signups;
create trigger enforce_bball_class_capacity
  before insert or update on bball_class_signups
  for each row execute function check_bball_class_capacity();

-- scheduled_classes: same shape, 'scheduled' is the booked-equivalent status.
create or replace function check_scheduled_class_capacity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_max_slots int;
  v_class_id uuid;
  v_booked_count int;
  v_wants_booked boolean;
begin
  if tg_op = 'INSERT' and new.status is null and new.member_id is not null and auth.uid() = new.member_id then
    new.status := 'pending';
    return new;
  end if;

  v_wants_booked := (
    (tg_op = 'INSERT' and (new.status = 'scheduled' or new.status is null))
    or (tg_op = 'UPDATE' and new.status = 'scheduled' and old.status is distinct from 'scheduled')
  );

  if v_wants_booked then
    v_class_id := coalesce((select parent_class_id from scheduled_classes where id = new.class_id), new.class_id);
    select max_slots into v_max_slots from scheduled_classes where id = v_class_id;
    select count(*) into v_booked_count from class_attendees
      where class_id = new.class_id and occurrence_date = new.occurrence_date and status = 'scheduled'
        and id is distinct from new.id;
    if v_max_slots is not null and v_booked_count >= v_max_slots then
      new.status := 'waitlist';
    else
      new.status := 'scheduled';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_scheduled_class_capacity on class_attendees;
create trigger trg_check_scheduled_class_capacity
  before insert or update on class_attendees
  for each row execute function check_scheduled_class_capacity();
