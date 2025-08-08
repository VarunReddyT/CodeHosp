import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studyId = searchParams.get("id");
        
        if (!studyId) {
            return errorResponse("Study ID is required", 400);
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
        
        return successResponse(result);
        
    } catch (error) {
        console.error("Error fetching study:", error);
        return errorResponse("Failed to fetch study", 500);
    }
}