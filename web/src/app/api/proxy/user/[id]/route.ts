import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    console.log("Fetching user data for ID:", userId);

    const backendResponse = await fetch(
      `https://omiverse-gem1.onrender.com/user/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
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
      { error: "Failed to fetch user data", success: false },
      { status: 500 }
    );
  }
}
