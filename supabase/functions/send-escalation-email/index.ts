import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ESCALATION_EMAIL = Deno.env.get("ESCALATION_EMAIL") || "personalfinanceai.il@gmail.com";

interface EscalationPayload {
  customer_message: string;
  sender: string;
  platform: string;
  thread_url: string;
  draft_response: string;
  escalation_id: string;
  message_id: string;
  is_reminder?: boolean;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: EscalationPayload = await req.json();
    const subject = payload.is_reminder
      ? `⏰ REMINDER: Customer escalation pending — ${payload.platform}`
      : `🔔 New customer escalation — ${payload.platform}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">${payload.is_reminder ? "⏰ Reminder: " : ""}Customer Message Needs Your Response</h2>

        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 4px;"><strong>Platform:</strong> ${payload.platform}</p>
          <p style="margin: 0 0 4px;"><strong>From:</strong> ${payload.sender}</p>
          <p style="margin: 0;"><strong>Escalation ID:</strong> ${payload.escalation_id}</p>
        </div>

        <h3 style="color: #333;">Customer's Message:</h3>
        <div style="background: #fff3cd; padding: 16px; border-left: 4px solid #ffc107; border-radius: 4px;">
          <p style="margin: 0;">${payload.customer_message}</p>
        </div>

        <h3 style="color: #333;">Suggested Response:</h3>
        <div style="background: #d4edda; padding: 16px; border-left: 4px solid #28a745; border-radius: 4px;">
          <p style="margin: 0;">${payload.draft_response}</p>
        </div>

        ${payload.thread_url ? `
        <div style="margin: 24px 0;">
          <a href="${payload.thread_url}"
             style="background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            → Reply on ${payload.platform}
          </a>
        </div>
        ` : ""}

        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          SLA: Please respond within 48 hours. A holding response has already been sent to the customer.
          <br>— GrandGridStudio Automated System
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GrandGridStudio Bot <onboarding@resend.dev>",
        to: [ESCALATION_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, email_id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
