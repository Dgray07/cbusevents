// supabase/functions/stripeconnectonboard/index.ts
// Deploy: supabase functions deploy stripeconnectonboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authErr } = await sb.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { action } = await req.json();

    // Determine role from user_roles table
    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = roleData?.role || "vendor";
    const validRoles = ["vendor", "planner"];
    const connectRole = validRoles.includes(role) ? role : "vendor";

    // Load existing connect account record
    const { data: existing } = await sb
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // ── STATUS ─────────────────────────────────────────────────
    if (action === "status") {
      if (!existing?.stripe_account_id) {
        return json({ connected: false, status: "none" });
      }

      // Refresh from Stripe
      const account = await stripe.accounts.retrieve(existing.stripe_account_id);
      const isActive = account.charges_enabled && account.payouts_enabled;
      const status = isActive ? "active" : account.details_submitted ? "pending" : "incomplete";

      // Update our record
      await sb.from("stripe_connect_accounts").update({
        status,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      return json({
        connected: isActive,
        status,
        stripe_account_id: existing.stripe_account_id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      });
    }

    // ── ONBOARD ────────────────────────────────────────────────
    if (action === "onboard") {
      let stripeAccountId = existing?.stripe_account_id;

      // Get vendor/planner email for prefill
      const tableName = connectRole === "vendor" ? "vendors" : "planners";
      const { data: profile } = await sb
        .from(tableName)
        .select("email, business_name, name")
        .eq("user_id", user.id)
        .maybeSingle();

      const email = profile?.email || user.email;
      const businessName = profile?.business_name || profile?.name || null;

      // Create Stripe Express account if doesn't exist
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email,
          business_profile: {
            name: businessName || undefined,
            url: "https://cbusevents.com",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            user_id: user.id,
            role: connectRole,
            platform: "cbusevents",
          },
        });

        stripeAccountId = account.id;

        // Upsert connect account record
        await sb.from("stripe_connect_accounts").upsert({
          user_id: user.id,
          role: connectRole,
          stripe_account_id: stripeAccountId,
          status: "pending",
          charges_enabled: false,
          payouts_enabled: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }

      // Generate onboarding link
      const returnUrl = connectRole === "vendor"
        ? "https://cbusevents.com/cbus-vendor-portal.html?connect=success"
        : "https://cbusevents.com/cbus-planner-portal.html?connect=success";

      const refreshUrl = connectRole === "vendor"
        ? "https://cbusevents.com/cbus-vendor-portal.html?connect=refresh"
        : "https://cbusevents.com/cbus-planner-portal.html?connect=refresh";

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      return json({ url: accountLink.url });
    }

    // ── DASHBOARD ──────────────────────────────────────────────
    if (action === "dashboard") {
      if (!existing?.stripe_account_id) {
        return json({ error: "No connected account found" }, 400);
      }

      const loginLink = await stripe.accounts.createLoginLink(
        existing.stripe_account_id
      );

      return json({ url: loginLink.url });
    }

    return json({ error: "Invalid action" }, 400);

  } catch (err: any) {
    console.error("stripeconnectonboard error:", err);
    return json({ error: err.message }, 500);
  }
});
