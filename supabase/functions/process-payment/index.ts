import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key to perform writes in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { payment_id, external_reference } = await req.json();
    
    if (!payment_id || !external_reference) {
      throw new Error("Missing payment_id or external_reference");
    }

    logStep("Processing payment", { payment_id, external_reference });

    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");

    // Get payment details from MercadoPago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: {
        "Authorization": `Bearer ${mercadoPagoToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment: ${response.status}`);
    }

    const payment = await response.json();
    logStep("Payment details retrieved", { status: payment.status, amount: payment.transaction_amount });

    // If payment is approved, update subscription
    if (payment.status === "approved") {
      const subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // Add 1 month

      await supabaseClient
        .from("subscribers")
        .upsert({
          user_id: external_reference,
          email: payment.payer.email,
          subscribed: true,
          subscription_tier: "Premium",
          subscription_end: subscriptionEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

      logStep("Subscription activated", { user_id: external_reference, end_date: subscriptionEnd });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      payment_status: payment.status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});