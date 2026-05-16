UPDATE tracks
SET approved = TRUE,
    approval_status = 'approved',
    approval_reason = COALESCE(approval_reason, 'Bulk-approved for matrix render (out-of-time, 2026-05-16)')
WHERE approval_status <> 'approved';

UPDATE template_music_approvals
SET status = 'approved',
    reason = COALESCE(reason, 'Bulk-approved for matrix render (2026-05-16)')
WHERE status = 'pending';
