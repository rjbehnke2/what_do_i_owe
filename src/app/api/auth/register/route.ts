import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db, users, accounts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const userId = uuid();
    const now = new Date();

    await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
      name: name || null,
      createdAt: now,
      updatedAt: now,
    });

    // Create default account for user
    await db.insert(accounts).values({
      id: uuid(),
      name: "My Account",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
