import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, payments, purchases } from "@/lib/db";
import { getAccountById } from "@/lib/accounts";
import { eq, asc, gt, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(accountId, session.user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const accountPayments = await db.query.payments.findMany({
      where: eq(payments.accountId, accountId),
      orderBy: [desc(payments.date), desc(payments.createdAt)],
    });

    return NextResponse.json(accountPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, amount, date } = await request.json();

    if (!accountId || !amount || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const account = await getAccountById(accountId, session.user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const now = new Date();
    const paymentDate = new Date(date);
    const paymentAmount = parseFloat(amount);

    // Create the payment
    const newPayment = await db
      .insert(payments)
      .values({
        id: uuid(),
        accountId,
        amount: paymentAmount,
        date: paymentDate,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Apply payment to purchases (oldest first by date)
    await applyPaymentToPurchases(accountId, paymentAmount);

    return NextResponse.json(newPayment[0], { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function applyPaymentToPurchases(accountId: string, paymentAmount: number) {
  // Get all purchases with remaining amount, sorted by date (oldest first)
  const unpaidPurchases = await db.query.purchases.findMany({
    where: eq(purchases.accountId, accountId),
    orderBy: [asc(purchases.date), asc(purchases.createdAt)],
  });

  let remainingPayment = paymentAmount;

  for (const purchase of unpaidPurchases) {
    if (remainingPayment <= 0) break;
    if (purchase.amountRemaining <= 0) continue;

    const amountToApply = Math.min(remainingPayment, purchase.amountRemaining);
    const newRemaining = Math.round((purchase.amountRemaining - amountToApply) * 100) / 100;

    await db
      .update(purchases)
      .set({
        amountRemaining: newRemaining,
        updatedAt: new Date(),
      })
      .where(eq(purchases.id, purchase.id));

    remainingPayment -= amountToApply;
  }
}
