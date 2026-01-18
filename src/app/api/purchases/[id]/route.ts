import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, purchases } from "@/lib/db";
import { getAccountById } from "@/lib/accounts";
import { eq } from "drizzle-orm";

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

    // Get the purchase to verify access
    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.id, id),
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this account
    const account = await getAccountById(purchase.accountId, session.user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await db.delete(purchases).where(eq(purchases.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
