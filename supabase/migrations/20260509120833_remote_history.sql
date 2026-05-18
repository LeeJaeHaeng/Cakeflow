-- Remote migration history marker.
--
-- Supabase Preview requires every version recorded in the linked remote
-- project's migration history to exist in this directory. The remote database
-- already has this version recorded, but the original SQL file was not present
-- in the repository. Keep this no-op file so preview checks can reconcile the
-- local migration directory with the remote history.

SELECT 1;
