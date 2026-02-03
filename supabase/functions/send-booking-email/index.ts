import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  type: "booking_confirmation" | "booking_reminder" | "booking_cancelled";
  bookingId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, bookingId }: SendEmailRequest = await req.json();

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        venue:venues (name, location, address),
        customer:profiles!bookings_customer_id_fkey (full_name, phone)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer email from auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(booking.customer_id);
    const customerEmail = userData?.user?.email;

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Customer email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date and time
    const bookingDate = new Date(booking.booking_date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const slotTime = `${booking.start_time} - ${booking.end_time}`;

    // Build email content based on type
    let subject = "";
    let htmlContent = "";

    const baseStyles = `
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #14b8a6 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; border-radius: 0 0 16px 16px; text-align: center; color: #6b7280; font-size: 14px; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
        .detail-label { color: #6b7280; }
        .detail-value { font-weight: 600; color: #111827; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #dcfce7; color: #16a34a; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        .btn { display: inline-block; padding: 14px 28px; background: #16a34a; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; }
      </style>
    `;

    switch (type) {
      case "booking_confirmation":
        subject = `✅ Booking Confirmed - ${booking.venue?.name}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🎉 Booking Confirmed!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Your slot has been reserved</p>
              </div>
              <div class="content">
                <p>Hi ${booking.customer?.full_name || "there"},</p>
                <p>Great news! Your booking at <strong>${booking.venue?.name}</strong> has been confirmed.</p>
                
                <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <div class="detail-row">
                    <span class="detail-label">Venue</span>
                    <span class="detail-value">${booking.venue?.name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${bookingDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time</span>
                    <span class="detail-value">${slotTime}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${booking.venue?.location}</span>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span class="detail-label">Amount Paid</span>
                    <span class="detail-value" style="color: #16a34a;">₹${booking.total_amount}</span>
                  </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">Please arrive 10 minutes before your slot time. Show this email at the venue for verification.</p>
              </div>
              <div class="footer">
                <p>Thanks for booking with SportSpot! 🏆</p>
                <p style="margin-top: 10px;">Questions? Reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "booking_reminder":
        subject = `⏰ Reminder: Your booking is tomorrow - ${booking.venue?.name}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">⏰ Reminder</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Your game is coming up!</p>
              </div>
              <div class="content">
                <p>Hi ${booking.customer?.full_name || "there"},</p>
                <p>Just a friendly reminder that you have a booking tomorrow at <strong>${booking.venue?.name}</strong>.</p>
                
                <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${bookingDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time</span>
                    <span class="detail-value">${slotTime}</span>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${booking.venue?.location}</span>
                  </div>
                </div>
                
                <p>Don't forget to bring your gear! 🏸</p>
              </div>
              <div class="footer">
                <p>See you on the court! - SportSpot</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "booking_cancelled":
        subject = `❌ Booking Cancelled - ${booking.venue?.name}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #f87171 100%);">
                <h1 style="margin: 0; font-size: 24px;">Booking Cancelled</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">We're sorry to see you go</p>
              </div>
              <div class="content">
                <p>Hi ${booking.customer?.full_name || "there"},</p>
                <p>Your booking at <strong>${booking.venue?.name}</strong> has been cancelled.</p>
                
                <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <div class="detail-row">
                    <span class="detail-label">Venue</span>
                    <span class="detail-value">${booking.venue?.name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${bookingDate}</span>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span class="detail-label">Time</span>
                    <span class="detail-value">${slotTime}</span>
                  </div>
                </div>
                
                <p>If you requested a refund, it will be processed within 5-7 business days.</p>
                <p style="margin-top: 20px;">We hope to see you again soon!</p>
              </div>
              <div class="footer">
                <p>Need help? Reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid email type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log email (in production, integrate with an email service like Resend, SendGrid, etc.)
    console.log("Email would be sent:", {
      to: customerEmail,
      subject,
      htmlLength: htmlContent.length,
    });

    // For now, just log the email. In production, integrate with Resend:
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({ from: "noreply@sportspot.in", to: customerEmail, subject, html: htmlContent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email notification queued",
        to: customerEmail,
        subject,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
