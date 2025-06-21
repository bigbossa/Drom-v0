import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Replace with your Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface Billing {
  id: string;
  sum: number;
  billing_month: string;
  rooms: {
    room_number: string;
  };
}

interface BillingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billing: Billing | null;
  onPaymentSuccess: () => void;
}

const BillingPaymentDialog = ({
  open,
  onOpenChange,
  billing,
  onPaymentSuccess,
}: BillingPaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!billing) {
    return null;
  }

  const description = billing.rooms?.room_number
    ? `ค่าเช่าห้อง ${billing.rooms.room_number} ประจำเดือน ${new Date(billing.billing_month).toLocaleDateString("th-TH", { year: "numeric", month: "long" })}`
    : "ชำระค่าเช่าห้องพัก";

  const handlePayment = async () => {
    try {
      setLoading(true);
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }

      const response = await fetch("http://localhost:3000/api/create-payment-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: billing.sum,
          billingId: billing.id,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment session");
      }

      const session = await response.json();

      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      onPaymentSuccess();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "เกิดข้อผิดพลาดในการชำระเงิน กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ชำระค่าเช่า</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-lg font-semibold">
            ยอดชำระ: {billing.sum.toLocaleString()} บาท
          </div>
          <Button
            onClick={handlePayment}
            className="w-full"
            disabled={loading}
          >
            {loading ? "กำลังดำเนินการ..." : "ชำระเงิน"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillingPaymentDialog;
