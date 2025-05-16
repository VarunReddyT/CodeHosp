import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
        console.error("Token is required");
        return NextResponse.json({ message: "Token is required" }, { status: 400 });
    }
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) {
        console.error("Invalid token");
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying token:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
