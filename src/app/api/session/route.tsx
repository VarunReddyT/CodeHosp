import { NextResponse } from "next/server";
import {adminAuth} from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
    try {
        const { token } = await request.json();
        if (!token) {
            console.error("Token is required");
            return NextResponse.json({ message: "Token is required" }, { status: 400 });
        }
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (!decodedToken) {
            console.error("Invalid token");
            return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }
        const response = NextResponse.json({success: true});
        response.cookies.set({
            name: "token",
            value: token,
            httpOnly: true,
            maxAge: 60 * 60 * 24,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        return response;
    } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}