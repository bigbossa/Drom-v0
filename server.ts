import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
config({ path: join(__dirname, '.env') });

if (!process.env.VITE_STRIPE_SECRET_KEY) {
  throw new Error("Missing required environment variable: VITE_STRIPE_SECRET_KEY");
}

// Import after loading environment variables
import { createPaymentSession } from './src/api/create-payment-session.js';
import { handleStripeWebhook } from './src/api/stripe-webhook.js';

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS with specific origin
app.use(cors({
  origin: ['http://localhost:8080', 'http://172.20.10.6:8080'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Parse JSON requests
app.use((req, res, next) => {
  if (req.path === '/api/webhook/stripe') {
    // For Stripe webhook, use raw body
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    // For other endpoints, parse JSON
    express.json()(req, res, next);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    stripeKey: process.env.VITE_STRIPE_SECRET_KEY ? 'configured' : 'missing'
  });
});

// Payment endpoint with error handling
app.post('/api/create-payment-session', async (req, res) => {
  try {
    await createPaymentSession(req, res);
  } catch (error) {
    console.error('Payment session error:', error);
    res.status(500).json({ 
      message: 'Error creating payment session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Stripe webhook endpoint
// app.post('/api/webhook/stripe', handleStripeWebhook);

// Global error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Environment variables loaded:', {
    STRIPE_KEY: process.env.VITE_STRIPE_SECRET_KEY ? 'configured' : 'missing',
    NODE_ENV: process.env.NODE_ENV,
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'missing'
  });
});
