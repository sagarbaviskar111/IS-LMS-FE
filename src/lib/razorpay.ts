// Razorpay Checkout in the browser. The order is created by our server with the
// INSTITUTE's own keys; the student pays in Razorpay's window and we get back the
// three values the server needs to confirm the payment really happened.

export interface RazorpayOrder {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  name?: string;
  email?: string;
}

export interface RazorpayProof {
  orderId: string;
  paymentId: string;
  signature: string;
}

// Result of asking the server to start a payment.
export type PaymentOrder = { mode: "dev" } | ({ mode: "gateway" } & RazorpayOrder);

interface CheckoutInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
}
type CheckoutConstructor = new (options: Record<string, unknown>) => CheckoutInstance;

let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  const w = window as unknown as { Razorpay?: CheckoutConstructor };
  if (w.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the payment window. Check your internet connection and try again."));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export class PaymentCancelled extends Error {
  constructor() {
    super("Payment cancelled. No money was taken.");
  }
}

export async function payWithRazorpay(
  order: RazorpayOrder,
  opts: { title: string; description?: string; phone?: string; themeColor?: string }
): Promise<RazorpayProof> {
  await loadCheckoutScript();
  const Checkout = (window as unknown as { Razorpay: CheckoutConstructor }).Razorpay;

  return new Promise<RazorpayProof>((resolve, reject) => {
    const checkout = new Checkout({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: opts.title,
      description: opts.description,
      prefill: { name: order.name, email: order.email, contact: opts.phone },
      theme: opts.themeColor ? { color: opts.themeColor } : undefined,
      handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        resolve({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => reject(new PaymentCancelled()) },
    });
    checkout.on("payment.failed", (r) => reject(new Error(r.error?.description || "The payment failed. Please try again.")));
    checkout.open();
  });
}
