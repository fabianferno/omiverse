import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("Proxying request to backend:", data);

    const backendResponse = await fetch(
      "https://omiverse-gem1.onrender.com/user/auth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    const responseData = await backendResponse.json();
    console.log("Backend response:", responseData);

    return NextResponse.json(responseData, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend", success: false },
      { status: 500 }
    );
  }
}
