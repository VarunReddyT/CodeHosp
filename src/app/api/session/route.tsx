import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/errorHandler";

export async function POST(request: Request) {
    try {
        const { token } = await request.json();
        if (!token) {
            return errorResponse("Token is required", 400);
        }
        
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (!decodedToken) {
            return errorResponse("Invalid token", 401);
        }
        
        const response = successResponse({ success: true }, "Session created successfully");
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
        const { status, message } = handleApiError(error);
        return errorResponse(message, status);
    }
}