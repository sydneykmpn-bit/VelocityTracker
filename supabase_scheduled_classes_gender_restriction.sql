-- Run this in the Supabase SQL Editor to add gender restriction to scheduled_classes,
-- matching the same concept already used on bball_classes.

alter table scheduled_classes add column if not exists gender_restriction text not null default 'mixed';

alter table scheduled_classes drop constraint if exists scheduled_classes_gender_restriction_check;
alter table scheduled_classes add constraint scheduled_classes_gender_restriction_check
  check (gender_restriction in ('mixed', 'men', 'women'));
