import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ESCALATION_EMAIL = Deno.env.get("ESCALATION_EMAIL") || "personalfinanceai.il@gmail.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get posts for the upcoming week (next 7 days)
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: posts, error: fetchErr } = await supabase
      .from("marketing_posts")
      .select("*, puzzles(*)")
      .eq("status", "ready_to_post")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", weekEnd.toISOString())
      .order("scheduled_at", { ascending: true });

    if (fetchErr) throw fetchErr;

    if (!posts || posts.length === 0) {
      // Log and skip — no posts this week
      await supabase.from("activity_log").insert({
        action_type: "weekly_digest_empty",
        details: { message: "No posts scheduled for this week" },
        status: "warning",
      });
      return new Response(JSON.stringify({ message: "No posts this week" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate a shared approval token for this week's batch
    const approvalToken = crypto.randomUUID();

    // Tag all this week's posts with the token
    const postIds = posts.map((p: any) => p.id);
    const { error: tokenErr } = await supabase
      .from("marketing_posts")
      .update({ approval_token: approvalToken })
      .in("id", postIds);

    if (tokenErr) throw tokenErr;

    // Build the approval URL
    const approveUrl = `${SUPABASE_URL}/functions/v1/approve-posts?token=${approvalToken}`;

    // Build the email HTML
    const postCards = posts
      .map((p: any) => {
        const date = new Date(p.scheduled_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jerusalem",
        });
        const title = p.copy_text.split("\n")[0];
        const description = p.copy_text.substring(title.length).trim().substring(0, 200);
        const etsyLink = p.puzzles?.etsy_listing_url || "https://www.etsy.com/shop/GrandGridStudio";
        const imageUrl = p.image_url || "";

        return `
        <div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin:16px 0;background:#fafafa;">
          <div style="display:flex;gap:16px;">
            ${imageUrl ? `<img src="${imageUrl}" alt="Pin image" style="width:120px;height:120px;object-fit:cover;border-radius:6px;">` : ""}
            <div>
              <p style="margin:0 0 4px;color:#666;font-size:13px;">${p.platform.toUpperCase()} — ${date}</p>
              <p style="margin:0 0 8px;font-weight:bold;font-size:16px;">${title}</p>
              <p style="margin:0;color:#555;font-size:14px;">${description}${description.length >= 200 ? "..." : ""}</p>
              <p style="margin:8px 0 0;font-size:13px;"><a href="${etsyLink}" style="color:#0066cc;">Etsy listing →</a></p>
            </div>
          </div>
        </div>`;
      })
      .join("");

    const weekRange = `${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
      <h1 style="color:#1a1a2e;margin-bottom:4px;">Weekly Pin Preview</h1>
      <p style="color:#666;margin-top:0;">Week of ${weekRange} · ${posts.length} post(s) scheduled</p>

      ${postCards}

      <div style="margin:32px 0;text-align:center;">
        <a href="${approveUrl}"
           style="background:#28a745;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">
          ✓ Approve All ${posts.length} Posts
        </a>
      </div>

      <p style="color:#999;font-size:12px;text-align:center;">
        Posts will only be published after you approve. If you don't approve by the first scheduled date, nothing will be posted.
        <br>— GrandGridStudio Automated Marketing
      </p>
    </div>`;

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GrandGridStudio Bot <onboarding@resend.dev>",
        to: [ESCALATION_EMAIL],
        subject: `📌 ${posts.length} pins ready for this week (${weekRange}) — tap to approve`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      throw new Error(`Resend error: ${errText}`);
    }

    const emailData = await emailRes.json();

    // Log success
    await supabase.from("activity_log").insert({
      action_type: "weekly_digest_sent",
      details: {
        post_count: posts.length,
        post_ids: postIds,
        email_id: emailData.id,
        approval_token: approvalToken,
      },
      status: "success",
    });

    return new Response(
      JSON.stringify({ success: true, posts: posts.length, email_id: emailData.id }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
