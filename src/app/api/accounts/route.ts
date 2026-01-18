import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserAccounts, getAccountStats } from "@/lib/accounts";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await getUserAccounts(session.user.id);

    // Get stats for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const stats = await getAccountStats(account.id);
        return {
          ...account,
          ...stats,
        };
      })
    );

    return NextResponse.json(accountsWithStats);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
