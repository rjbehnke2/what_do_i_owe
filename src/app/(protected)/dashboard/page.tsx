"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Minus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { OweForm } from "@/components/owe-form";
import { PayForm } from "@/components/pay-form";

interface AccountWithStats {
  id: string;
  name: string;
  ownerId: string;
  totalPurchases: number;
  totalPayments: number;
  amountDue: number;
  purchaseCount: number;
  paymentCount: number;
}

interface UserInfo {
  defaultAccountId: string | null;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOweModal, setShowOweModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
        if (selectedAccount) {
          // Update selected account with fresh data
          const updated = data.find((a: AccountWithStats) => a.id === selectedAccount.id);
          if (updated) {
            setSelectedAccount(updated);
          }
        }
        return data;
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
    return [];
  }, [selectedAccount]);

  // Initial load: fetch accounts and user info, then set default account
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const [accountsRes, userRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/user"),
        ]);

        let accountsData: AccountWithStats[] = [];
        let userData: UserInfo | null = null;

        if (accountsRes.ok) {
          accountsData = await accountsRes.json();
          setAccounts(accountsData);
        }

        if (userRes.ok) {
          userData = await userRes.json();
        }

        // Set initial account: prefer default, fallback to first
        if (accountsData.length > 0) {
          const defaultAccount = userData?.defaultAccountId
            ? accountsData.find((a) => a.id === userData.defaultAccountId)
            : null;
          setSelectedAccount(defaultAccount || accountsData[0]);
        }
      } catch (error) {
        console.error("Error initializing dashboard:", error);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    initializeDashboard();
  }, []);

  const handleTransactionSuccess = () => {
    setShowOweModal(false);
    setShowPayModal(false);
    fetchAccounts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No accounts found
          </h2>
          <p className="text-gray-600">
            Please contact support if this issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Account Selector (if multiple accounts) */}
      {accounts.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account
          </label>
          <select
            value={selectedAccount.id}
            onChange={(e) => {
              const account = accounts.find((a) => a.id === e.target.value);
              if (account) setSelectedAccount(account);
            }}
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

      {/* Amount Due Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
          Amount Due
        </p>
        <p
          className={`text-4xl font-bold ${
            selectedAccount.amountDue > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          ${selectedAccount.amountDue.toFixed(2)}
        </p>
        {selectedAccount.amountDue === 0 && (
          <p className="text-sm text-green-600 mt-1">All paid up!</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Purchases</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${selectedAccount.totalPurchases.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {selectedAccount.purchaseCount} purchase
            {selectedAccount.purchaseCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="text-2xl font-semibold text-gray-900">
            ${selectedAccount.totalPayments.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {selectedAccount.paymentCount} payment
            {selectedAccount.paymentCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="danger"
          className="h-16 text-lg"
          onClick={() => setShowOweModal(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Owe
        </Button>
        <Button
          size="lg"
          className="h-16 text-lg bg-green-600 hover:bg-green-700 focus:ring-green-500"
          onClick={() => setShowPayModal(true)}
        >
          <Minus className="w-5 h-5 mr-2" />
          Pay
        </Button>
      </div>

      {/* Owe Modal */}
      <Modal
        isOpen={showOweModal}
        onClose={() => setShowOweModal(false)}
        title="Add Purchase"
      >
        <OweForm
          accountId={selectedAccount.id}
          onSuccess={handleTransactionSuccess}
          onCancel={() => setShowOweModal(false)}
        />
      </Modal>

      {/* Pay Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Add Payment"
      >
        <PayForm
          accountId={selectedAccount.id}
          maxAmount={selectedAccount.amountDue}
          onSuccess={handleTransactionSuccess}
          onCancel={() => setShowPayModal(false)}
        />
      </Modal>
    </div>
  );
}
