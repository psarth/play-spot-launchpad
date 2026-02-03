import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "test_secret_key";

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
}

// HMAC-SHA256 implementation using Web Crypto API
async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataBuffer = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingId 
    }: VerifyPaymentRequest = await req.json();

    // Handle test mode
    if (razorpay_order_id.startsWith("order_test_")) {
      // Update booking as confirmed for test mode
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "completed",
          payment_intent_id: razorpay_payment_id || `pay_test_${Date.now()}`,
        })
        .eq("id", bookingId)
        .eq("customer_id", user.id);

      if (updateError) {
        throw new Error("Failed to update booking");
      }

      // Get booking to record transaction
      const { data: booking } = await supabase
        .from("bookings")
        .select("total_amount")
        .eq("id", bookingId)
        .single();

      // Create transaction record
      await supabase.from("transactions").insert({
        booking_id: bookingId,
        amount: booking?.total_amount || 0,
        status: "completed",
        payment_method: "razorpay_test",
        payment_intent_id: razorpay_payment_id,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment verified successfully (test mode)",
          testMode: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature for real payments
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = await createHmacSignature(RAZORPAY_KEY_SECRET, body);

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update booking status
    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "completed",
        payment_intent_id: razorpay_payment_id,
      })
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error("Failed to update booking");
    }

    // Create transaction record
    await supabase.from("transactions").insert({
      booking_id: bookingId,
      amount: booking.total_amount,
      status: "completed",
      payment_method: "razorpay",
      payment_intent_id: razorpay_payment_id,
    });

    // Update payment record
    await supabase
      .from("payments")
      .update({
        status: "completed",
        transaction_id: razorpay_payment_id,
      })
      .eq("booking_id", bookingId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment verified successfully",
        booking
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
