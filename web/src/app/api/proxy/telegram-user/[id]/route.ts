import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const telegramId = params.id;
    const response = await fetch(
      `http://localhost:4000/telegram-user/${telegramId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying telegram-user request:", error);
    return NextResponse.json(
      { error: "Failed to get user data", success: false },
      { status: 500 }
    );
  }
}
