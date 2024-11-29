import { NextResponse } from "next/server";
import crypto from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function verifyTelegramData(data: any) {
  const { hash, ...rest } = data;

  // Check if required data exists
  if (!hash || !BOT_TOKEN) return false;

  // Create check string from remaining data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  // Create secret key using SHA256
  const secretKey = crypto
    .createHmac("sha256", BOT_TOKEN || "")
    .update("WebAppSignature")
    .digest("hex"); // Convert to hex string for compatibility

  // Calculate HMAC-SHA256 signature
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  return hmac === hash;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Verify the authentication data
    if (!verifyTelegramData(data)) {
      return NextResponse.json(
        { error: "Invalid authentication data" },
        { status: 400 }
      );
    }

    // At this point, the user is authenticated
    // You can store the user data in your database
    // data contains: id, first_name, last_name (optional), username (optional), photo_url (optional), auth_date

    // Create a session or JWT token here if needed

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        photo_url: data.photo_url,
        auth_date: data.auth_date,
      },
    });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
