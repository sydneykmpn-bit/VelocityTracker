-- Run this in the Supabase SQL Editor if you hit:
--   "invalid input syntax for type integer: 'wednesday'"
-- That means bball_classes.day_of_week already exists as an integer column
-- (0=Sunday..6=Saturday) instead of the text day-name column the app expects.
-- This converts it in place, preserving existing rows.
-- Skip this file if you've already run it successfully.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'bball_classes' and column_name = 'day_of_week' and data_type = 'integer'
  ) then
    alter table bball_classes drop constraint if exists bball_classes_day_of_week_check;
    alter table bball_classes alter column day_of_week type text using (
      case day_of_week
        when 0 then 'sunday' when 1 then 'monday' when 2 then 'tuesday'
        when 3 then 'wednesday' when 4 then 'thursday' when 5 then 'friday' when 6 then 'saturday'
      end
    );
    alter table bball_classes add constraint bball_classes_day_of_week_check
      check (day_of_week in ('sunday','monday','tuesday','wednesday','thursday','friday','saturday'));
  end if;
end $$;
