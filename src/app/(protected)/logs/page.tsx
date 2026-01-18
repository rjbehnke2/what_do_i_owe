"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Trash2,
  Filter,
  ChevronDown,
  ShoppingCart,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";

interface Purchase {
  id: string;
  accountId: string;
  amount: number;
  amountRemaining: number;
  description: string;
  date: string;
  createdAt: string;
}

interface Payment {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
}

interface UserInfo {
  defaultAccountId: string | null;
}

type LogEntry = (Purchase & { type: "purchase" }) | (Payment & { type: "payment" });

export default function LogsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyPurchases, setShowOnlyPurchases] = useState(false);
  const [showOnlyPayments, setShowOnlyPayments] = useState(false);
  const [hidePaidPurchases, setHidePaidPurchases] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Fetch accounts and user info on initial load
  useEffect(() => {
    const initializePage = async () => {
      try {
        const [accountsRes, userRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/user"),
        ]);

        let accountsData: Account[] = [];
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
          setSelectedAccountId(defaultAccount?.id || accountsData[0].id);
        }
      } catch (error) {
        console.error("Error initializing page:", error);
      } finally {
        setInitialLoadDone(true);
      }
    };

    initializePage();
  }, []);

  // Fetch logs when account changes
  const fetchLogs = useCallback(async () => {
    if (!selectedAccountId) return;

    setLoading(true);
    try {
      const [purchasesRes, paymentsRes] = await Promise.all([
        fetch(`/api/purchases?accountId=${selectedAccountId}`),
        fetch(`/api/payments?accountId=${selectedAccountId}`),
      ]);

      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        setPurchases(data);
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Generate available months from logs
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    [...purchases, ...payments].forEach((item) => {
      const date = new Date(item.date);
      const monthKey = format(date, "yyyy-MM");
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [purchases, payments]);

  // Combined and filtered logs
  const filteredLogs = useMemo(() => {
    let logs: LogEntry[] = [];

    if (!showOnlyPayments) {
      let filteredPurchases = purchases;
      if (hidePaidPurchases) {
        filteredPurchases = purchases.filter((p) => p.amountRemaining > 0);
      }
      logs = [
        ...logs,
        ...filteredPurchases.map((p) => ({ ...p, type: "purchase" as const })),
      ];
    }

    if (!showOnlyPurchases) {
      logs = [
        ...logs,
        ...payments.map((p) => ({ ...p, type: "payment" as const })),
      ];
    }

    // Filter by month
    if (selectedMonth) {
      logs = logs.filter((log) => {
        const date = new Date(log.date);
        const monthKey = format(date, "yyyy-MM");
        return monthKey === selectedMonth;
      });
    }

    // Sort by date (newest first)
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return logs;
  }, [purchases, payments, showOnlyPurchases, showOnlyPayments, hidePaidPurchases, selectedMonth]);

  const handleDelete = async (id: string, type: "purchase" | "payment") => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    setDeletingId(id);
    try {
      const endpoint = type === "purchase" ? `/api/purchases/${id}` : `/api/payments/${id}`;
      const response = await fetch(endpoint, { method: "DELETE" });

      if (response.ok) {
        fetchLogs();
      } else {
        alert("Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transaction Logs</h1>

      {/* Account Selector (if multiple accounts) */}
      {accounts.length > 1 && (
        <div className="mb-4">
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

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
      >
        <Filter className="w-4 h-4" />
        Filters
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
        />
      </button>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-4">
          {/* Type Filters */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Show</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setShowOnlyPurchases(!showOnlyPurchases);
                  if (!showOnlyPurchases) setShowOnlyPayments(false);
                }}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  showOnlyPurchases
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Only Purchases
              </button>
              <button
                onClick={() => {
                  setShowOnlyPayments(!showOnlyPayments);
                  if (!showOnlyPayments) setShowOnlyPurchases(false);
                }}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  showOnlyPayments
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Only Payments
              </button>
            </div>
          </div>

          {/* Hide Paid Purchases */}
          {!showOnlyPayments && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hidePaidPurchases}
                onChange={(e) => setHidePaidPurchases(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Hide paid purchases</span>
            </label>
          )}

          {/* Month Filter */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Month</p>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All months</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {format(parseISO(`${month}-01`), "MMMM yyyy")}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Logs List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No entries found</p>
          {(showOnlyPurchases || showOnlyPayments || hidePaidPurchases || selectedMonth) && (
            <button
              onClick={() => {
                setShowOnlyPurchases(false);
                setShowOnlyPayments(false);
                setHidePaidPurchases(false);
                setSelectedMonth("");
              }}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={`${log.type}-${log.id}`}
              className="bg-white rounded-xl shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      log.type === "purchase"
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {log.type === "purchase" ? (
                      <ShoppingCart className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {log.type === "purchase"
                        ? (log as Purchase).description
                        : "Payment"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(log.date), "MMM d, yyyy")}
                    </p>
                    {log.type === "purchase" && (log as Purchase).amountRemaining > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        ${(log as Purchase).amountRemaining.toFixed(2)} remaining
                      </p>
                    )}
                    {log.type === "purchase" && (log as Purchase).amountRemaining === 0 && (
                      <p className="text-xs text-green-600 mt-1">Paid</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      log.type === "purchase" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {log.type === "purchase" ? "-" : "+"}${log.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(log.id, log.type)}
                    disabled={deletingId === log.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === log.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
