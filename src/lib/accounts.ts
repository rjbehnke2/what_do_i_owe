import { db, accounts, accountAccess, purchases, payments } from "@/lib/db";
import { eq, or, and, asc } from "drizzle-orm";

export async function getUserAccounts(userId: string) {
  // Get accounts the user owns
  const ownedAccounts = await db.query.accounts.findMany({
    where: eq(accounts.ownerId, userId),
  });

  // Get accounts shared with the user
  const sharedAccessRecords = await db.query.accountAccess.findMany({
    where: eq(accountAccess.userId, userId),
    with: {
      account: true,
    },
  });

  const sharedAccounts = sharedAccessRecords.map((record) => record.account);

  return [...ownedAccounts, ...sharedAccounts];
}

export async function getAccountById(accountId: string, userId: string) {
  // Check if user owns this account or has access
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (!account) return null;

  // Check if user is owner
  if (account.ownerId === userId) return account;

  // Check if user has shared access
  const access = await db.query.accountAccess.findFirst({
    where: and(
      eq(accountAccess.accountId, accountId),
      eq(accountAccess.userId, userId)
    ),
  });

  return access ? account : null;
}

export async function calculateAmountDue(accountId: string) {
  const accountPurchases = await db.query.purchases.findMany({
    where: eq(purchases.accountId, accountId),
  });

  const totalRemaining = accountPurchases.reduce(
    (sum, p) => sum + p.amountRemaining,
    0
  );

  return Math.round(totalRemaining * 100) / 100;
}

export async function getAccountStats(accountId: string) {
  const [accountPurchases, accountPayments] = await Promise.all([
    db.query.purchases.findMany({
      where: eq(purchases.accountId, accountId),
      orderBy: [asc(purchases.date)],
    }),
    db.query.payments.findMany({
      where: eq(payments.accountId, accountId),
      orderBy: [asc(payments.date)],
    }),
  ]);

  const totalPurchases = accountPurchases.reduce((sum, p) => sum + p.amount, 0);
  const totalPayments = accountPayments.reduce((sum, p) => sum + p.amount, 0);
  const amountDue = accountPurchases.reduce(
    (sum, p) => sum + p.amountRemaining,
    0
  );

  return {
    totalPurchases: Math.round(totalPurchases * 100) / 100,
    totalPayments: Math.round(totalPayments * 100) / 100,
    amountDue: Math.round(amountDue * 100) / 100,
    purchaseCount: accountPurchases.length,
    paymentCount: accountPayments.length,
  };
}
