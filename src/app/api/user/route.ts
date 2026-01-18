import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { getUserAccounts } from "@/lib/accounts";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      defaultAccountId: user.defaultAccountId,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { defaultAccountId } = await request.json();

    // If setting a default account, verify user has access to it
    if (defaultAccountId) {
      const userAccounts = await getUserAccounts(session.user.id);
      const hasAccess = userAccounts.some((a) => a.id === defaultAccountId);

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You don't have access to this account" },
          { status: 403 }
        );
      }
    }

    const updated = await db
      .update(users)
      .set({
        defaultAccountId: defaultAccountId || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning();

    return NextResponse.json({
      id: updated[0].id,
      email: updated[0].email,
      name: updated[0].name,
      defaultAccountId: updated[0].defaultAccountId,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
