import { NextRequest } from "next/server";
import { validateToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/errorHandler";
import { clearCache } from "@/lib/cache";
import { db } from "@/lib/firebaseAdmin";

export async function PUT(request: NextRequest) {
    const { user, error } = await validateToken(request);
    if (error) {
        return errorResponse(error, 401);
    }

    try {
        const { studyId, status } = await request.json();
        if (!studyId) {
            return errorResponse("Missing study ID", 400);
        }

        const modificationsSnapshot = await db.collection("modifications")
            .where("studyId", "==", studyId)
            .get();
            
        if (modificationsSnapshot.empty) {
            return errorResponse("No modifications found for this study", 404);
        }
        
        const modDoc = modificationsSnapshot.docs[0];
        const modData = modDoc.data();
        
        await modDoc.ref.update({
            approved: status,
            lastUpdated: new Date().toISOString()
        });

        if (status === "true") {
            const userRef = db.collection("users").doc(modData.userId);
            const userDoc = await userRef.get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData) {
                    await userRef.update({
                        points: (userData.points || 0) + 10,
                        contributions: (userData.contributions || 0) + 1,
                        lastUpdated: new Date().toISOString()
                    });
                }
            }
        }
        
        // Clear caches
        clearCache('modifications');
        clearCache('leaderboard');
        
        return successResponse(
            { modificationId: modDoc.id, status }, 
            "Modification status updated successfully"
        );
        
    } catch (error) {
        const { status, message } = handleApiError(error);
        return errorResponse(message, status);
    }
}