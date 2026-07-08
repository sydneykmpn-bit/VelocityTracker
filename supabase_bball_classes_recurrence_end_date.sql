-- Run this in the Supabase SQL Editor to add an optional "recurs until" date to bball_classes.
-- NULL (the default) means the class keeps recurring weekly indefinitely, matching current behavior.

alter table bball_classes add column if not exists recurrence_end_date date;
