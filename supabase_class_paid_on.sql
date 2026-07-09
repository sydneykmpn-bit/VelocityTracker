-- "Paid On" date, alongside the existing payment_status/amount_paid fields.
alter table bball_class_signups add column if not exists paid_on date;
alter table class_attendees add column if not exists paid_on date;
