import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, purchases } from "@/lib/db";
import { getAccountById } from "@/lib/accounts";
import { eq, and, asc, desc } from "drizzle-orm";
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

    const accountPurchases = await db.query.purchases.findMany({
      where: eq(purchases.accountId, accountId),
      orderBy: [desc(purchases.date), desc(purchases.createdAt)],
    });

    return NextResponse.json(accountPurchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
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

    const { accountId, amount, description, date } = await request.json();

    if (!accountId || !amount || !description || !date) {
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
    const purchaseDate = new Date(date);

    const newPurchase = await db
      .insert(purchases)
      .values({
        id: uuid(),
        accountId,
        amount: parseFloat(amount),
        amountRemaining: parseFloat(amount),
        description,
        date: purchaseDate,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newPurchase[0], { status: 201 });
  } catch (error) {
    console.error("Error creating purchase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
