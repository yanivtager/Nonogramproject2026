import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REVIEW_TOKEN = Deno.env.get("VIDEO_FACTORY_REVIEW_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-review-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Decision = "approved" | "needs-fix" | "rejected";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  try {
    if (req.method === "GET" && path === "/listings") {
      return json(await selectAll(supabase, "listings", "id"), 200);
    }
    if (req.method === "GET" && path === "/templates") {
      return json(await selectAll(supabase, "templates", "id", (q) => q.eq("active", true)), 200);
    }
    if (req.method === "GET" && path === "/voices") {
      return json(await selectAll(supabase, "voices", "display_name", (q) => q.eq("approved", true)), 200);
    }
    if (req.method === "GET" && path === "/music") {
      return json(await selectAll(supabase, "tracks", "title", (q) => q.eq("approved", true)), 200);
    }
    if (req.method === "GET" && path === "/variants") {
      const status = url.searchParams.get("status");
      let query = supabase
        .from("variants")
        .select("*, listings(*), templates(*), voices(*), tracks(*), renders(*)")
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return json({ data }, 200);
    }

    if (req.method === "POST") {
      assertReviewToken(req);

      if (path === "/variants") {
        const body = await req.json();
        const { data, error } = await supabase
          .from("variants")
          .insert({
            listing_id: requiredString(body.listing_id, "listing_id"),
            template_id: requiredString(body.template_id, "template_id"),
            language_code: requiredString(body.language_code, "language_code"),
            voice_id: requiredString(body.voice_id, "voice_id"),
            track_id: requiredString(body.track_id, "track_id"),
            hook_text: optionalString(body.hook_text),
            narration_script_json: body.narration_script_json ?? {},
            on_screen_copy_json: body.on_screen_copy_json ?? {},
            validation_json: body.validation_json ?? {},
          })
          .select("*")
          .single();
        if (error) throw error;
        return json({ data }, 201);
      }

      const renderMatch = path.match(/^\/variants\/([^/]+)\/render$/);
      if (renderMatch) {
        const variantId = decodeURIComponent(renderMatch[1]!);
        const { error: variantError } = await supabase.from("variants").update({ status: "queued" }).eq("id", variantId);
        if (variantError) throw variantError;
        const { data, error } = await supabase
          .from("renders")
          .insert({ variant_id: variantId, status: "queued" })
          .select("*")
          .single();
        if (error) throw error;
        return json({ data }, 201);
      }

      const decisionMatch = path.match(/^\/variants\/([^/]+)\/decision$/);
      if (decisionMatch) {
        const variantId = decodeURIComponent(decisionMatch[1]!);
        const body = await req.json();
        const decision = requiredString(body.decision, "decision") as Decision;
        if (!["approved", "needs-fix", "rejected"].includes(decision)) {
          return json({ error: "decision must be approved, needs-fix, or rejected" }, 400);
        }
        const reason = optionalString(body.reason);
        if (decision === "needs-fix" && (!reason || reason.length < 10)) {
          return json({ error: "reason must be at least 10 characters for needs-fix" }, 400);
        }

        const { data: decisionRow, error: decisionError } = await supabase
          .from("decisions")
          .insert({ variant_id: variantId, decision, reason })
          .select("*")
          .single();
        if (decisionError) throw decisionError;

        const { error: variantError } = await supabase
          .from("variants")
          .update({
            status: decision,
            feedback_history_json: reason
              ? [{ decision, reason, decided_at: new Date().toISOString() }]
              : [],
          })
          .eq("id", variantId);
        if (variantError) throw variantError;

        return json({ data: decisionRow }, 200);
      }

      const exportedMatch = path.match(/^\/variants\/([^/]+)\/exported$/);
      if (exportedMatch) {
        const variantId = decodeURIComponent(exportedMatch[1]!);
        const { data, error } = await supabase
          .from("variants")
          .update({ status: "exported" })
          .eq("id", variantId)
          .select("*")
          .single();
        if (error) throw error;
        return json({ data }, 200);
      }
    }

    return json({ error: "Not found", path }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.startsWith("Unauthorized") ? 401 : message.includes("required") ? 400 : 500;
    return json({ error: message }, status);
  }
});

function normalizePath(pathname: string): string {
  const marker = "/video-factory-api";
  const index = pathname.indexOf(marker);
  const normalized = index >= 0 ? pathname.slice(index + marker.length) : pathname;
  return normalized === "" ? "/" : normalized;
}

async function selectAll(
  supabase: ReturnType<typeof createClient>,
  table: string,
  orderBy: string,
  refine?: (query: any) => any,
) {
  let query = supabase.from(table).select("*").order(orderBy, { ascending: true });
  if (refine) query = refine(query);
  const { data, error } = await query;
  if (error) throw error;
  return { data };
}

function assertReviewToken(req: Request): void {
  if (!REVIEW_TOKEN) return;
  if (req.headers.get("x-review-token") !== REVIEW_TOKEN) {
    throw new Error("Unauthorized: invalid x-review-token");
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
