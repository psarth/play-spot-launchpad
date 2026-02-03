import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Razorpay Test Keys - Replace with real keys in production
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_1234567890";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "test_secret_key";

interface CreateOrderRequest {
  amount: number; // Amount in INR
  bookingId: string;
  venueId: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
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

    const { amount, bookingId, venueId, customerEmail, customerPhone, description }: CreateOrderRequest = await req.json();

    // Calculate amounts
    const baseAmount = amount;
    const convenienceFee = Math.round(baseAmount * 0.02); // 2% convenience fee
    const totalAmountPaise = (baseAmount + convenienceFee) * 100; // Convert to paise

    // Create Razorpay order
    const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${razorpayAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: totalAmountPaise,
        currency: "INR",
        receipt: `booking_${bookingId}`,
        notes: {
          booking_id: bookingId,
          venue_id: venueId,
          customer_id: user.id,
          base_amount: baseAmount.toString(),
          convenience_fee: convenienceFee.toString(),
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error("Razorpay order creation failed:", errorData);
      
      // Return mock order for testing when Razorpay fails
      const mockOrderId = `order_test_${Date.now()}`;
      return new Response(
        JSON.stringify({
          orderId: mockOrderId,
          amount: totalAmountPaise,
          currency: "INR",
          keyId: RAZORPAY_KEY_ID,
          baseAmount,
          convenienceFee,
          totalAmount: baseAmount + convenienceFee,
          testMode: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderData = await orderResponse.json();

    // Update booking with order ID
    await supabase
      .from("bookings")
      .update({ 
        payment_intent_id: orderData.id,
        payment_status: "pending"
      })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: RAZORPAY_KEY_ID,
        baseAmount,
        convenienceFee,
        totalAmount: baseAmount + convenienceFee,
        testMode: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error creating order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
