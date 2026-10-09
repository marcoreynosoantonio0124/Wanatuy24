-- DueMeet: store the AI ID-check verdict so the Verified badge can require a
-- real government ID whose name matches the account. id_verified is true only
-- when a clear government ID is confirmed AND its name matches the typed name
-- (middle name may differ). id_is_government lets the profile tell a
-- non-government ID apart from a name mismatch. id_doc_type records the kind
-- (e.g. "Driver's License", "Company ID") for the user-facing notice.
alter table public.users
  add column if not exists id_verified      boolean not null default false,
  add column if not exists id_is_government boolean,
  add column if not exists id_doc_type      text;
