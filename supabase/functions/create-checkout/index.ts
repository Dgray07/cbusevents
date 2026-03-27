// supabase/functions/create-checkout/index.ts
// Deploy: supabase functions deploy create-checkout

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

const PLATFORM_FEE_PERCENT = 6.5;
const PLATFORM_FEE_FLAT = 1.00;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { items, success_url, cancel_url, buyer_email } = await req.json();

    // items: [{ product_id, quantity }]
    if (!items || !items.length) {
      return new Response(JSON.stringify({ error: "No items in cart" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    // Fetch all products from Supabase to verify prices server-side
    const productIds = items.map((i: any) => i.product_id);
    const { data: products, error: prodErr } = await sb
      .from("vendor_products")
      .select("id, name, price, images, vendor_id, status, inventory_count, product_type")
      .in("id", productIds);

    if (prodErr || !products?.length) {
      return new Response(JSON.stringify({ error: "Could not load products" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    // Validate all products are active
    const inactive = products.filter(p => p.status !== "active");
    if (inactive.length) {
      return new Response(JSON.stringify({
        error: `Some items are no longer available: ${inactive.map(p => p.name).join(", ")}`
      }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Build Stripe line items using server-side prices
    const lineItems = items.map((cartItem: any) => {
      const product = products.find(p => p.id === cartItem.product_id);
      if (!product) throw new Error(`Product not found: ${cartItem.product_id}`);
      return {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(product.price * 100),
          product_data: {
            name: product.name,
            images: product.images?.slice(0, 1) || [],
            metadata: { product_id: product.id, vendor_id: product.vendor_id },
          },
        },
        quantity: cartItem.quantity || 1,
      };
    });

    // Calculate platform fee
    const subtotal = items.reduce((sum: number, cartItem: any) => {
      const product = products.find(p => p.id === cartItem.product_id)!;
      return sum + (product.price * (cartItem.quantity || 1));
    }, 0);
    const platformFee = Math.round(((subtotal * (PLATFORM_FEE_PERCENT / 100)) + PLATFORM_FEE_FLAT) * 100);

    // Build cart metadata for order record
    const orderItems = items.map((cartItem: any) => {
      const product = products.find(p => p.id === cartItem.product_id)!;
      return {
        product_id: product.id,
        vendor_id: product.vendor_id,
        name: product.name,
        price: product.price,
        quantity: cartItem.quantity || 1,
      };
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      customer_email: buyer_email || undefined,
      success_url: success_url || `https://cbusevents.com/marketplace.html?order=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `https://cbusevents.com/marketplace.html?order=cancelled`,
      metadata: {
        order_items: JSON.stringify(orderItems),
        platform_fee: platformFee.toString(),
        total_amount: subtotal.toFixed(2),
        buyer_email: buyer_email || "",
      },
    });

    // Insert pending order record
    await sb.from("orders").insert({
      stripe_session_id: session.id,
      buyer_email: buyer_email || null,
      items: orderItems,
      total_amount: subtotal,
      platform_fee: (platformFee / 100),
      status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});
