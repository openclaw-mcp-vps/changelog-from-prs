"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UnlockPurchaseFormProps = {
  onSuccess?: () => void;
};

export function UnlockPurchaseForm({ onSuccess }: UnlockPurchaseFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/auth/verify-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to verify payment.");
      }

      setMessage(payload.message ?? "Purchase confirmed. Access unlocked.");
      setEmail("");
      onSuccess?.();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to verify payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="unlock-email" className="block text-sm font-medium text-slate-200">
        Enter the purchase email used in Stripe
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="unlock-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@project.io"
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Checking..." : "Unlock"}
        </Button>
      </div>
      {message ? <p className={`text-sm ${isError ? "text-rose-300" : "text-emerald-300"}`}>{message}</p> : null}
    </form>
  );
}
