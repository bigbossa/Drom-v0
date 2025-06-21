import Stripe from "stripe";
import express from "express";
import { config } from "dotenv";
import { supabase } from "../integrations/supabase/client.js";
config();

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export const verifyPayment = async (req: express.Request, res: express.Response) => {
  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Missing session_id" });
  }

  try {
    // 1. ดึง session จาก Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    // 2. ดึงข้อมูลจาก session
    const paymentIntentId = session.payment_intent as string;
    const amount = session.amount_total ?? 0;
    const billingId = session.metadata?.billingId;

    if (!billingId) {
      return res.status(400).json({ success: false, message: "Missing billingId in session metadata" });
    }

    // 3. อัปเดต billing record ใน Supabase ด้วย billingId
    const { data, error } = await supabase
      .from("billing")
      .update({
        status: "paid",
        paid_date: new Date().toISOString(),
        payment_id: paymentIntentId,
      })
      .eq("id", billingId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error updating billing:", error);
      return res.status(500).json({ success: false, message: "Database update error" });
    }
    if (!data?.id) {
      console.warn("No billing record found for billingId:", billingId);
      // ไม่ต้อง throw error ให้สำเร็จแต่แจ้งเตือน
    }

    return res.status(200).json({
      success: true,
      id: paymentIntentId,
      amount: amount,
      status: session.payment_status,
      billingId: billingId,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ success: false, message: "Error verifying payment" });
  }
};