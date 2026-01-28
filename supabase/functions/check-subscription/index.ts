import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role key to perform writes (upsert) in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // For now, we'll set up basic subscription tracking
    // MercadoPago webhook integration would be needed for real-time updates
    // This is a simplified version that assumes subscription is active after payment
    
    // Check if user has a subscription record
    const { data: existingSubscription } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("email", user.email)
      .single();

    logStep("Existing subscription check", { existingSubscription });

    // For demo purposes, we'll create a basic subscription entry
    // In production, this would be updated via MercadoPago webhooks
    const subscriptionData = {
      email: user.email,
      user_id: user.id,
      subscribed: existingSubscription?.subscribed || false,
      subscription_tier: existingSubscription?.subscription_tier || "Premium",
      subscription_end: existingSubscription?.subscription_end || null,
      updated_at: new Date().toISOString(),
    };

    await supabaseClient
      .from("subscribers")
      .upsert(subscriptionData, { onConflict: 'email' });

    logStep("Updated database with subscription info", { 
      subscribed: subscriptionData.subscribed, 
      subscriptionTier: subscriptionData.subscription_tier 
    });

    return new Response(JSON.stringify({
      subscribed: subscriptionData.subscribed,
      subscription_tier: subscriptionData.subscription_tier,
      subscription_end: subscriptionData.subscription_end
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});