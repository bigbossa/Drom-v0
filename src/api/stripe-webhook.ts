import Stripe from "stripe";
import express from "express";
import { supabase } from "@/lib/supabase";

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (
  req: express.Request,
  res: express.Response
) => {
  const sig = req.headers["stripe-signature"];

  if (!sig || !endpointSecret) {
    return res.status(400).json({ message: "Missing signature or endpoint secret" });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const billingId = session.metadata?.billingId;

      if (!billingId) {
        throw new Error("Missing billing ID in session metadata");
      }

      // Update billing status in database
      const { error } = await supabase
        .from("billings")
        .update({
          status: "paid",
          paid_date: new Date().toISOString(),
          payment_id: session.payment_intent as string,
        })
        .eq("id", billingId);

      if (error) {
        console.error("Error updating billing status:", error);
        throw error;
      }

      console.log(`Updated billing ${billingId} status to paid`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).json({
      message: "Webhook error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
