import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getCache, setCache } from "@/lib/cache";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studyId = searchParams.get("id");
        
        if (!studyId) {
            return errorResponse("Study ID is required", 400);
        }
        
        // Check cache first
        const cacheKey = `study:${studyId}`;
        const cached = getCache(cacheKey);
        
        if (cached) {
            return successResponse(cached);
        }
        
        const studySnapshot = await db.collection("studies").doc(studyId).get();
        
        if (!studySnapshot.exists) {
            return errorResponse("Study not found", 404);
        }
        
        const studyData = studySnapshot.data();
        if (!studyData) {
            return errorResponse("Study data not found", 404);
        }
        
        const result = { study: { id: studyId, ...studyData } };
        
        // Cache for 10 minutes
        setCache(cacheKey, result, 10);
        
        return successResponse(result);
        
    } catch (error) {
        console.error("Error fetching study:", error);
        return errorResponse("Failed to fetch study", 500);
    }
}