// Children CRUD API route (Simplified for Demo - no parent relationship)
// GET: list all children, POST: create child

import { NextResponse } from "next/server";
import { db, children } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(children);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/children] Error fetching children:", error);
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, age, grade, pin } = body as {
    name: string;
    age: number;
    grade: number;
    pin: string;
  };

  if (!name || !age || !grade || !pin) {
    return NextResponse.json(
      { error: "name, age, grade, and pin are required" },
      { status: 400 }
    );
  }

  try {
    const [newChild] = await db
      .insert(children)
      .values({ name, age, grade, pin })
      .returning();

    return NextResponse.json(newChild);
  } catch (error) {
    console.error("[api/children] Error creating child:", error);
    return NextResponse.json({ error: "Failed to create child" }, { status: 500 });
  }
}
