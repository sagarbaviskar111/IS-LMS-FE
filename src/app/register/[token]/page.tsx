"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "../../signup/signup.module.css";

declare global {
  interface Window {
    Razorpay: any;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error("Failed to load Razorpay checkout script"));
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

type Step = "form" | "payment" | "done";

export default function RegisterViaLeadPage() {
  const { token } = useParams<{ token: string }>();

  const [loadState, setLoadState] = useState<"loading" | "ready" | "invalid">("loading");
  const [coachingClassName, setCoachingClassName] = useState("");
  const [feeAmount, setFeeAmount] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<Step>("form");
  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined);
  const [paymentError, setPaymentError] = useState("");
  const [payingNow, setPayingNow] = useState(false);

  useEffect(() => {
    api
      .leadInfo(token)
      .then((res) => {
        setCoachingClassName(res.coachingClassName);
        setName(res.name);
        setPhone(res.phone);
        setEmail(res.email || "");
        setFeeAmount(res.feeAmount || 0);
        setLoadState("ready");
      })
      .catch(() => setLoadState("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.registerViaLead({ token, name, email, password, phone });
      if (res.requiresPayment) {
        setPaymentAmount(res.amount);
        setStep("payment");
      } else {
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    setPaymentError("");
    setPayingNow(true);
    try {
      await loadRazorpayScript();
      const order = await api.createLeadPaymentOrder(token);

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: coachingClassName,
        description: "Registration fee",
        order_id: order.orderId,
        prefill: {
          name: order.name,
          email: order.email,
        },
        handler: async (response: any) => {
          try {
            await api.verifyLeadPayment({
              token,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStep("done");
          } catch (err) {
            setPaymentError(
              err instanceof ApiError
                ? `Payment verification failed: ${err.message}`
                : "Payment verification failed. Please try again."
            );
          }
        },
        modal: {
          ondismiss: () => {
            // let them retry
          },
        },
      });
      rzp.open();
    } catch (err) {
      setPaymentError(
        err instanceof ApiError
          ? `Payment is not available yet — contact your coaching class. (${err.message})`
          : "Could not start payment. Please try again."
      );
    } finally {
      setPayingNow(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <ThemeToggle className={styles.themeToggleFixed} />
      <div className={styles.stack}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark} />
          <span className={styles.brandName}>InstituteSathi</span>
        </div>

        {loadState === "loading" && (
          <div className={styles.card}>
            <p className={styles.subtitle}>Loading...</p>
          </div>
        )}

        {loadState === "invalid" && (
          <div className={styles.card}>
            <h1 className={styles.title}>Link not valid</h1>
            <p className={styles.subtitle}>
              This registration link is invalid or has already been used. Contact the coaching
              class that sent it to you for a new one.
            </p>
            <Link href="/login">
              <button className={styles.button} type="button" style={{ width: "100%" }}>
                Back to login
              </button>
            </Link>
          </div>
        )}

        {loadState === "ready" && step === "done" && (
          <div className={`${styles.card} ${styles.success}`}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>You&apos;re registered</h1>
            <p className={styles.subtitle}>Your account is active — you can log in now.</p>
            <Link href="/login">
              <button className={styles.button} type="button" style={{ width: "100%" }}>
                Go to login
              </button>
            </Link>
          </div>
        )}

        {loadState === "ready" && step === "payment" && (
          <div className={styles.card}>
            <h1 className={styles.title}>Almost there</h1>
            <p className={styles.subtitle}>
              Pay ₹{paymentAmount} to complete your registration with {coachingClassName}.
            </p>

            {paymentError && <p className={styles.error}>{paymentError}</p>}

            <button className={styles.button} type="button" onClick={handlePayNow} disabled={payingNow}>
              {payingNow ? "Starting payment..." : "Pay now"}
            </button>

            <p className={styles.footerLink}>
              Already paid? <Link href="/login">Sign in</Link>
            </p>
          </div>
        )}

        {loadState === "ready" && step === "form" && (
          <form className={styles.card} onSubmit={handleSubmit}>
            <h1 className={styles.title}>Complete your registration</h1>
            <p className={styles.subtitle}>Joining {coachingClassName} as a student</p>
            {feeAmount > 0 && <p className={styles.subtitle}>Registration fee: ₹{feeAmount}</p>}

            <div className={styles.row}>
              <label className={styles.label}>
                Full name
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label className={styles.label}>
                Phone
                <input
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>

            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Create account"}
            </button>

            <p className={styles.footerLink}>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
