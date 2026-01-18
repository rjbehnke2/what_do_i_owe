"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface PayFormProps {
  accountId: string;
  maxAmount?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PayForm({ accountId, maxAmount, onSuccess, onCancel }: PayFormProps) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to add payment");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayFull = () => {
    if (maxAmount && maxAmount > 0) {
      setAmount(maxAmount.toFixed(2));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="date"
        type="date"
        label="Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <div>
        <Input
          id="amount"
          type="number"
          label="Amount"
          placeholder="0.00"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {maxAmount && maxAmount > 0 && (
          <button
            type="button"
            onClick={handlePayFull}
            className="mt-1 text-sm text-blue-600 hover:underline"
          >
            Pay full amount (${maxAmount.toFixed(2)})
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Add Payment
        </Button>
      </div>
    </form>
  );
}
