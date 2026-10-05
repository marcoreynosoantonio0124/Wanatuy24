-- Keep the exact text of each reminder we send, so the lessor and tenant can
-- open a month's record and see the real messages (not just that one was sent).
alter table public.notifications
  add column if not exists body text;
