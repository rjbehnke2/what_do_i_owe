"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Copy, Check, Key, Users, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
  ownerId: string;
}

interface AccessCode {
  id: string;
  code: string;
  accountId: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Redeem code state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");

  // Fetch accounts (only owned accounts for sharing)
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const data = await response.json();
          // Filter to only owned accounts (we'll need to check ownership separately)
          setAccounts(data);
          if (data.length > 0) {
            setSelectedAccountId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch access codes when account changes
  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchAccessCodes = async () => {
      try {
        const response = await fetch(`/api/access-codes?accountId=${selectedAccountId}`);
        if (response.ok) {
          const data = await response.json();
          setAccessCodes(data);
        }
      } catch (error) {
        console.error("Error fetching access codes:", error);
      }
    };
    fetchAccessCodes();
  }, [selectedAccountId]);

  const generateAccessCode = async () => {
    if (!selectedAccountId) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });

      if (response.ok) {
        const newCode = await response.json();
        setAccessCodes([...accessCodes, newCode]);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to generate code");
      }
    } catch (error) {
      console.error("Error generating access code:", error);
      alert("An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      alert("Failed to copy code");
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError("");
    setRedeemSuccess("");

    if (!redeemCode.trim()) {
      setRedeemError("Please enter an access code");
      return;
    }

    setRedeeming(true);
    try {
      const response = await fetch("/api/access-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setRedeemSuccess(`Access granted to "${data.accountName}"`);
        setRedeemCode("");
        // Refresh accounts
        const accountsRes = await fetch("/api/accounts");
        if (accountsRes.ok) {
          setAccounts(await accountsRes.json());
        }
      } else {
        setRedeemError(data.error || "Failed to redeem code");
      }
    } catch {
      setRedeemError("An error occurred. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Redeem Access Code Section */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Key className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Redeem Access Code
            </h2>
            <p className="text-sm text-gray-500">
              Enter a code to access someone else&apos;s account
            </p>
          </div>
        </div>

        <form onSubmit={handleRedeemCode} className="space-y-3">
          <Input
            id="redeemCode"
            type="text"
            placeholder="Enter access code (e.g., ABC123)"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center text-lg tracking-widest font-mono"
          />

          {redeemError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {redeemError}
            </div>
          )}

          {redeemSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
              {redeemSuccess}
            </div>
          )}

          <Button type="submit" className="w-full" loading={redeeming}>
            Redeem Code
          </Button>
        </form>
      </div>

      {/* Share Account Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Share2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Share Your Account
            </h2>
            <p className="text-sm text-gray-500">
              Generate access codes to share with others
            </p>
          </div>
        </div>

        {/* Account Selector */}
        {accounts.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          onClick={generateAccessCode}
          loading={generating}
          className="w-full mb-4"
        >
          Generate Access Code
        </Button>

        {/* Active Access Codes */}
        {accessCodes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Active Access Codes
            </h3>
            <div className="space-y-2">
              {accessCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-mono text-lg font-semibold tracking-widest text-gray-900">
                      {code.code}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {format(new Date(code.expiresAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <button
                    onClick={() => copyCode(code.code)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Copy code"
                  >
                    {copiedCode === code.code ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {accessCodes.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">
            No active access codes. Generate one to share access.
          </p>
        )}
      </div>
    </div>
  );
}
