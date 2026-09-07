/**
 * Razorpay-ready payment interface.
 *
 * The rest of the app (subscription route/pages) is built against this
 * interface, not against Razorpay directly, so swapping providers later
 * only touches this file. To go live:
 *   npm install razorpay
 *   import Razorpay from "razorpay";
 *   const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
 * and implement the two functions below using client.orders.create(...) and
 * a webhook handler that calls verifyPaymentSignature.
 */
export interface CreateOrderResult {
  orderId: string;
  amountInPaise: number;
  currency: "INR";
}

export async function createOrder(amountInPaise: number): Promise<CreateOrderResult> {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw new Error("Razorpay is not configured — set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and implement src/lib/payments.ts");
  }
  // TODO: return client.orders.create({ amount: amountInPaise, currency: "INR" })
  throw new Error("createOrder() not yet implemented — see src/lib/payments.ts");
}

export function verifyPaymentSignature(_orderId: string, _paymentId: string, _signature: string): boolean {
  // TODO: verify using crypto.createHmac("sha256", RAZORPAY_KEY_SECRET) per Razorpay's docs.
  throw new Error("verifyPaymentSignature() not yet implemented — see src/lib/payments.ts");
}
