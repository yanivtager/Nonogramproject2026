-- Add 'approved' status to marketing_posts workflow
-- Flow: ready_to_post → (weekly email) → approved → (cron publishes) → posted
-- Also add approval_token for secure email approval links

ALTER TABLE marketing_posts DROP CONSTRAINT IF EXISTS marketing_posts_status_check;
ALTER TABLE marketing_posts ADD CONSTRAINT marketing_posts_status_check
  CHECK (status IN ('draft', 'ready_to_post', 'approved', 'posted', 'failed', 'blocked'));

-- Token used in approval links to prevent unauthorized approvals
ALTER TABLE marketing_posts ADD COLUMN IF NOT EXISTS approval_token UUID;
