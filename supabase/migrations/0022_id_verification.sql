-- DueMeet: store the AI ID-check verdict so the Verified badge can require a
-- real government ID. id_verified is true only when a clear government-issued ID
-- was confirmed; id_doc_type records what kind of ID it is (e.g. "Driver's
-- License", "Company ID") for the user-facing notice.
alter table public.users
  add column if not exists id_verified boolean not null default false,
  add column if not exists id_doc_type text;
