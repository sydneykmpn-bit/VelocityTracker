-- Run in Supabase SQL Editor
alter table exercises add column if not exists set_details jsonb;
