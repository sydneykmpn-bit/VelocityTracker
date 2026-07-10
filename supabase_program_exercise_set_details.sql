-- Per-set breakdown for the coach's per-athlete program exercise table (Detailed mode).
-- Mirrors the existing nullable exercises.set_details jsonb column/convention: sets/reps/weight
-- on athlete_program_exercises stay populated as a computed summary (max-weight set) even when
-- set_details holds the full per-set breakdown, so existing Simple-mode and read-only views keep
-- working unchanged.
alter table athlete_program_exercises add column if not exists set_details jsonb;
