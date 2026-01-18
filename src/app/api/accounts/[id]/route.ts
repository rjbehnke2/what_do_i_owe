import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, accounts } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid name is required" },
        { status: 400 }
      );
    }

    // Check if user owns this account
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, id),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (account.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the account owner can rename it" },
        { status: 403 }
      );
    }

    // Update the account name
    const updated = await db
      .update(accounts)
      .set({
        name: name.trim(),
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
