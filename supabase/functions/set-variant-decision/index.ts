import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Decision = "approved" | "needs-fix" | "rejected";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const variantId = String(body.variant_id ?? "");
    const decision = String(body.decision ?? "") as Decision;
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!variantId) return json({ error: "variant_id is required" }, 400);
    if (!["approved", "needs-fix", "rejected"].includes(decision)) {
      return json({ error: "decision must be approved, needs-fix, or rejected" }, 400);
    }
    if (decision === "needs-fix" && (!reason || reason.length < 10)) {
      return json({ error: "reason must be at least 10 characters for needs-fix" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: decisionRow, error: decisionError } = await supabase
      .from("decisions")
      .insert({
        variant_id: variantId,
        decision,
        reason,
      })
      .select("*")
      .single();

    if (decisionError) throw decisionError;

    const { error: updateError } = await supabase
      .from("variants")
      .update({
        status: decision,
        feedback_history_json: reason
          ? [{ decision, reason, decided_at: new Date().toISOString() }]
          : [],
      })
      .eq("id", variantId);

    if (updateError) throw updateError;

    return json({ success: true, decision: decisionRow }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
