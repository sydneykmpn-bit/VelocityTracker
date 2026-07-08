-- Run this in the Supabase SQL Editor to add one-time (non-recurring) class support.
-- Existing rows default to is_recurring = true, preserving current weekly-recurring behavior.

alter table bball_classes add column if not exists is_recurring boolean not null default true;
alter table bball_classes add column if not exists specific_date date;

alter table bball_classes drop constraint if exists bball_classes_specific_date_check;
alter table bball_classes add constraint bball_classes_specific_date_check
  check (is_recurring or specific_date is not null);
