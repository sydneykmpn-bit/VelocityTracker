-- Whole-program Done/Pending tracking, mirroring workout_plans.status/completed_at.
-- Distinct from athlete_program_completions (which tracks per-day, per-week "Mark Done" occurrences) —
-- this is the member marking the entire assigned program as done vs still in progress.
alter table athlete_programs add column if not exists status text not null default 'pending' check (status in ('pending', 'completed'));
alter table athlete_programs add column if not exists completed_at timestamptz;
