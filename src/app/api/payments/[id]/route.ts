import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, payments, purchases } from "@/lib/db";
import { getAccountById } from "@/lib/accounts";
import { eq, asc } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the payment to verify access
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, id),
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify user has access to this account
    const account = await getAccountById(payment.accountId, session.user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete the payment
    await db.delete(payments).where(eq(payments.id, id));

    // Recalculate all purchase amounts after deleting payment
    await recalculateAccountPurchases(payment.accountId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function recalculateAccountPurchases(accountId: string) {
  // Get all purchases and payments for this account
  const [allPurchases, allPayments] = await Promise.all([
    db.query.purchases.findMany({
      where: eq(purchases.accountId, accountId),
      orderBy: [asc(purchases.date), asc(purchases.createdAt)],
    }),
    db.query.payments.findMany({
      where: eq(payments.accountId, accountId),
      orderBy: [asc(payments.date), asc(payments.createdAt)],
    }),
  ]);

  // Reset all purchase amountRemaining to original amount
  for (const purchase of allPurchases) {
    await db
      .update(purchases)
      .set({ amountRemaining: purchase.amount, updatedAt: new Date() })
      .where(eq(purchases.id, purchase.id));
  }

  // Re-apply all payments in order
  let totalPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);

  // Get fresh purchase data
  const freshPurchases = await db.query.purchases.findMany({
    where: eq(purchases.accountId, accountId),
    orderBy: [asc(purchases.date), asc(purchases.createdAt)],
  });

  for (const purchase of freshPurchases) {
    if (totalPayments <= 0) break;

    const amountToApply = Math.min(totalPayments, purchase.amountRemaining);
    const newRemaining = Math.round((purchase.amountRemaining - amountToApply) * 100) / 100;

    await db
      .update(purchases)
      .set({ amountRemaining: newRemaining, updatedAt: new Date() })
      .where(eq(purchases.id, purchase.id));

    totalPayments -= amountToApply;
  }
}
