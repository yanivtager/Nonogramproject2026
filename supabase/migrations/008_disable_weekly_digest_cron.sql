-- Disable Pinterest weekly-approval-email cron.
-- Pinterest API trial was denied; manual scheduling via UI is now the workflow.
-- The weekly-digest Edge Function still exists but is no longer triggered automatically.
--
-- NOTE: This project uses Supabase scheduled functions (Dashboard > Edge Functions),
-- not pg_cron directly. The cron schedule must be removed from the Supabase dashboard:
--   Dashboard → Edge Functions → weekly-digest → Settings → disable/delete the schedule.
-- This migration is intentionally a no-op SQL comment; action required is in the dashboard.

SELECT 1; -- placeholder so migration applies cleanly
