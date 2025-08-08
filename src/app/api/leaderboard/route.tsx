import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";
import { validateToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        // Try to get current user if authenticated (optional)
        const { user } = await validateToken(request);
        const currentUserId = user?.uid;
        
        // Get users with points, ordered by points desc, limit to 100
        const usersSnapshot = await db.collection("users")
            .where("points", ">", 0)
            .orderBy("points", "desc")
            .limit(100)
            .get();
        
        if (usersSnapshot.empty) {
            return successResponse({ leaderboard: [], currentUserRank: currentUserId ? 0 : -1 });
        }
        
        const leaderboard = usersSnapshot.docs.map((doc, index) => ({
            id: doc.id,
            displayName: doc.data().displayName || "Anonymous",
            points: doc.data().points || 0,
            contributions: doc.data().contributions || 0,
            rank: index + 1
        }));
        
        // Find current user's rank if authenticated
        let currentUserRank = -1;
        if (currentUserId) {
            const userIndex = leaderboard.findIndex(user => user.id === currentUserId);
            currentUserRank = userIndex !== -1 ? userIndex + 1 : 0;
        }
        
        const result = { 
            leaderboard: leaderboard.slice(0, 10), 
            currentUserRank 
        };
        
        return successResponse(result);
        
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return errorResponse("Failed to fetch leaderboard", 500);
    }
}