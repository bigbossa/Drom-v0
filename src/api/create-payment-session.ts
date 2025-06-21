import Stripe from "stripe";
import express from "express";
import { config } from 'dotenv';

// Try to load environment variables again
config();

const stripeSecretKey = process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('Available environment variables:', process.env);
  throw new Error("Missing Stripe secret key");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-05-28.basil",
});

export const createPaymentSession = async (
  req: express.Request,
  res: express.Response
) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { amount, billingId, description } = req.body;

    if (!amount || !billingId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log('Creating payment session with:', { amount, billingId, description });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name: "ค่าเช่าห้องพัก",
              description: description || "Room rental payment",
            },
            unit_amount: Math.round(amount * 100), // Convert to smallest currency unit (satang)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:8080' ||'http://172.20.10.6:8080'}/billing?success=true&billing_id=${billingId}`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:8080' ||'http://172.20.10.6:8080'}/billing?canceled=true`,
      metadata: {
        billingId: billingId.toString(),
      },
    });

    console.log('Payment session created:', session.id);
    return res.status(200).json({ id: session.id });
  } catch (error) {
    console.error("Error creating payment session:", error);
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
    return res.status(500).json({ message: "Error creating payment session" });
  }
};
