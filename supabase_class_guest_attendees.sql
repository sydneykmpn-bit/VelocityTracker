-- Allow walk-in attendees with no account: user_id/member_id becomes nullable, paired with a
-- guest_name text column. Exactly one of (user_id, guest_name) / (member_id, guest_name) must be set.
alter table bball_class_signups alter column user_id drop not null;
alter table bball_class_signups add column if not exists guest_name text;
alter table bball_class_signups drop constraint if exists bball_class_signups_member_or_guest_check;
alter table bball_class_signups add constraint bball_class_signups_member_or_guest_check
  check ((user_id is not null and guest_name is null) or (user_id is null and guest_name is not null));

alter table class_attendees alter column member_id drop not null;
alter table class_attendees add column if not exists guest_name text;
alter table class_attendees drop constraint if exists class_attendees_member_or_guest_check;
alter table class_attendees add constraint class_attendees_member_or_guest_check
  check ((member_id is not null and guest_name is null) or (member_id is null and guest_name is not null));
