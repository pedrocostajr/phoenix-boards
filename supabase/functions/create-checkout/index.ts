import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mercadoPagoToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    logStep("MercadoPago token verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Create MercadoPago preference
    const preference = {
      items: [
        {
          title: "Phoenix Board - Assinatura Mensal",
          description: "Acesso completo ao Phoenix Board",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 19.90
        }
      ],
      payer: {
        email: user.email
      },
      payment_methods: {
        excluded_payment_types: [],
        installments: 1
      },
      back_urls: {
        success: `${req.headers.get("origin")}/payment-success`,
        failure: `${req.headers.get("origin")}/payment-failure`,
        pending: `${req.headers.get("origin")}/payment-pending`
      },
      auto_return: "approved",
      external_reference: user.id,
      statement_descriptor: "Phoenix Board"
    };

    logStep("Creating MercadoPago preference", { preference });

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mercadoPagoToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorData = await response.text();
      logStep("MercadoPago API error", { status: response.status, error: errorData });
      throw new Error(`MercadoPago API error: ${response.status} - ${errorData}`);
    }

    const data_preference = await response.json();
    logStep("MercadoPago preference created", { preferenceId: data_preference.id });

    return new Response(JSON.stringify({ 
      preference_id: data_preference.id,
      init_point: data_preference.init_point,
      sandbox_init_point: data_preference.sandbox_init_point
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});