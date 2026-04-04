// Email notifications via Resend API

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ESCALATION_EMAIL = process.env.ESCALATION_EMAIL || 'yanivtager@gmail.com';

export async function sendEscalationEmail({ customerMessage, sender, platform, threadUrl, draftResponse, escalationId, isReminder = false }) {
  const subject = isReminder
    ? `REMINDER: Customer escalation pending — ${platform}`
    : `New customer escalation — ${platform}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1B1F3B;">${isReminder ? 'Reminder: ' : ''}Customer Message Needs Your Response</h2>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 4px;"><strong>Platform:</strong> ${platform}</p>
        <p style="margin: 0 0 4px;"><strong>From:</strong> ${sender}</p>
        <p style="margin: 0;"><strong>ID:</strong> ${escalationId}</p>
      </div>
      <h3 style="color: #333;">Customer's Message:</h3>
      <div style="background: #fff3cd; padding: 16px; border-left: 4px solid #ffc107; border-radius: 4px;">
        <p style="margin: 0;">${customerMessage}</p>
      </div>
      <h3 style="color: #333;">Suggested Response:</h3>
      <div style="background: #d4edda; padding: 16px; border-left: 4px solid #28a745; border-radius: 4px;">
        <p style="margin: 0;">${draftResponse}</p>
      </div>
      ${threadUrl ? `<div style="margin: 24px 0;">
        <a href="${threadUrl}" style="background: #1B1F3B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reply on ${platform}</a>
      </div>` : ''}
      <p style="color: #666; font-size: 12px;">SLA: Please respond within 48 hours.<br>— GrandGridStudio Automated System</p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'GrandGridStudio Bot <onboarding@resend.dev>',
      to: [ESCALATION_EMAIL],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
  return await res.json();
}

export async function sendDailySummary({ postsPublished, messagesHandled, escalationsPending, topContent, errors }) {
  const today = new Date().toISOString().split('T')[0];

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1B1F3B;">GrandGridStudio Daily Report — ${today}</h2>

      <h3>Posts Published Today (${postsPublished.length})</h3>
      ${postsPublished.length ? `<ul>${postsPublished.map(p => `<li><a href="${p.url}">${p.platform}: ${p.title}</a></li>`).join('')}</ul>` : '<p>No posts today.</p>'}

      <h3>Messages Handled (${messagesHandled.total})</h3>
      <ul>
        <li>Auto-responded: ${messagesHandled.autoResponded}</li>
        <li>Escalated: ${messagesHandled.escalated}</li>
        <li>Spam filtered: ${messagesHandled.spam}</li>
      </ul>

      <h3>Pending Escalations (${escalationsPending.length})</h3>
      ${escalationsPending.length ? `<ul>${escalationsPending.map(e => {
        const hoursLeft = Math.max(0, 48 - ((Date.now() - new Date(e.created_at).getTime()) / 3600000));
        return `<li>${e.platform} from ${e.sender} — ${Math.round(hoursLeft)}h remaining</li>`;
      }).join('')}</ul>` : '<p>None — all clear!</p>'}

      ${errors.length ? `<h3 style="color: red;">Errors (${errors.length})</h3><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}

      <p style="color: #666; font-size: 12px;">— GrandGridStudio Automated System</p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'GrandGridStudio Bot <onboarding@resend.dev>',
      to: [ESCALATION_EMAIL],
      subject: `GrandGridStudio Daily Report — ${today}`,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Daily summary email failed: ${await res.text()}`);
  return await res.json();
}
