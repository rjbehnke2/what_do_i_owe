import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, accessCodes, accounts } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import crypto from "crypto";

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

    // Verify user owns this account
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.id, accountId),
        eq(accounts.ownerId, session.user.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get all active (not expired, not used) access codes for this account
    const codes = await db.query.accessCodes.findMany({
      where: and(
        eq(accessCodes.accountId, accountId),
        gt(accessCodes.expiresAt, new Date())
      ),
    });

    // Filter out used codes
    const activeCodes = codes.filter((code) => !code.usedAt);

    return NextResponse.json(activeCodes);
  } catch (error) {
    console.error("Error fetching access codes:", error);
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

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID required" },
        { status: 400 }
      );
    }

    // Verify user owns this account
    const account = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.id, accountId),
        eq(accounts.ownerId, session.user.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Generate a unique access code (6 characters alphanumeric)
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newCode = await db
      .insert(accessCodes)
      .values({
        id: uuid(),
        code,
        accountId,
        createdBy: session.user.id,
        expiresAt,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(newCode[0], { status: 201 });
  } catch (error) {
    console.error("Error creating access code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
