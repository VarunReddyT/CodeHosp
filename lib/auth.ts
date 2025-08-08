import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { DecodedIdToken } from "firebase-admin/auth";

export async function validateToken(request: NextRequest): Promise<{user: DecodedIdToken | null, error?: string}> {
    let token = "";
    
    // Check cookies first, then Authorization header
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|; )token=([^;]*)/);
        if (match) token = decodeURIComponent(match[1]);
    }
    
    if (!token) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.split("Bearer ")[1];
        }
    }
    
    if (!token) {
        return { user: null, error: "No token provided" };
    }
    
    try {
        const user = await adminAuth.verifyIdToken(token);
        return { user };
    } catch {
        return { user: null, error: "Invalid or expired token" };
    }
}
