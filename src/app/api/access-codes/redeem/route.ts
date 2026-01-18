import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, accessCodes, accountAccess, accounts } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    // Find the access code
    const accessCode = await db.query.accessCodes.findFirst({
      where: and(
        eq(accessCodes.code, code.toUpperCase()),
        gt(accessCodes.expiresAt, new Date())
      ),
    });

    if (!accessCode) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    if (accessCode.usedAt) {
      return NextResponse.json(
        { error: "This code has already been used" },
        { status: 400 }
      );
    }

    // Check if user is trying to access their own account
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accessCode.accountId),
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (account.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "You already own this account" },
        { status: 400 }
      );
    }

    // Check if user already has access
    const existingAccess = await db.query.accountAccess.findFirst({
      where: and(
        eq(accountAccess.accountId, accessCode.accountId),
        eq(accountAccess.userId, session.user.id)
      ),
    });

    if (existingAccess) {
      return NextResponse.json(
        { error: "You already have access to this account" },
        { status: 400 }
      );
    }

    // Grant access and mark code as used
    await db.insert(accountAccess).values({
      id: uuid(),
      userId: session.user.id,
      accountId: accessCode.accountId,
      createdAt: new Date(),
    });

    await db
      .update(accessCodes)
      .set({ usedAt: new Date() })
      .where(eq(accessCodes.id, accessCode.id));

    return NextResponse.json({
      message: "Access granted",
      accountName: account.name,
    });
  } catch (error) {
    console.error("Error redeeming access code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
