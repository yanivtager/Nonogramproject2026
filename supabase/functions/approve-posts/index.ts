import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(page("Missing approval token.", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find posts with this token that are still ready_to_post
  const { data: posts, error: findErr } = await supabase
    .from("marketing_posts")
    .select("id, copy_text, scheduled_at, platform")
    .eq("approval_token", token)
    .eq("status", "ready_to_post");

  if (findErr) {
    return new Response(page(`Error: ${findErr.message}`, false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!posts || posts.length === 0) {
    // Check if already approved
    const { data: approved } = await supabase
      .from("marketing_posts")
      .select("id")
      .eq("approval_token", token)
      .eq("status", "approved");

    if (approved && approved.length > 0) {
      return new Response(page("These posts were already approved! They will be published on schedule.", true), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(page("No pending posts found for this approval link. It may have expired or already been used.", false), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Approve all posts with this token
  const { error: updateErr } = await supabase
    .from("marketing_posts")
    .update({ status: "approved" })
    .eq("approval_token", token)
    .eq("status", "ready_to_post");

  if (updateErr) {
    return new Response(page(`Failed to approve: ${updateErr.message}`, false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Log it
  await supabase.from("activity_log").insert({
    action_type: "posts_approved",
    platform: "pinterest",
    details: { count: posts.length, post_ids: posts.map((p: any) => p.id) },
    status: "success",
  });

  const postList = posts
    .map((p: any) => {
      const date = new Date(p.scheduled_at).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const title = p.copy_text.split("\n")[0].substring(0, 60);
      return `<li><strong>${date}</strong>: ${title}...</li>`;
    })
    .join("");

  return new Response(
    page(
      `<h2>Approved ${posts.length} post(s)!</h2>
       <p>These will be published automatically on their scheduled dates:</p>
       <ul>${postList}</ul>
       <p>You're all set for this week. No further action needed.</p>`,
      true,
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
});

function page(body: string, success: boolean): string {
  const color = success ? "#28a745" : "#dc3545";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GrandGridStudio — Post Approval</title>
<style>
  body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}
  .status{padding:20px;border-radius:8px;border-left:4px solid ${color};background:${success ? "#d4edda" : "#f8d7da"};margin:20px 0}
  h1{color:#222}li{margin:8px 0}
</style></head>
<body>
<h1>GrandGridStudio</h1>
<div class="status">${body}</div>
<p style="color:#666;font-size:13px">— GrandGridStudio Automated Marketing System</p>
</body></html>`;
}
