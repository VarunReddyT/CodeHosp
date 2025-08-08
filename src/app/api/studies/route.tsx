import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // Max 50 items
        const offset = parseInt(searchParams.get("offset") || "0");
        const category = searchParams.get("category");
        const status = searchParams.get("status");
        const search = searchParams.get("search");
        
        let query = db.collection("studies")
            .orderBy("createdAt", "desc")
            .limit(limit)
            .offset(offset);
            
        if (category && category !== "all") {
            query = query.where("category", "==", category);
        }
        if (status && status !== "all") {
            query = query.where("status", "==", status);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            return successResponse({ studies: [], total: 0, hasMore: false });
        }

        interface Study {
            id: string;
            title?: string;
            authors?: string[];
            institution?: string;
            [key: string]: unknown;
        }
        
        let studies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Study[];
        
        // Client-side search if search term provided
        if (search) {
            const searchLower = search.toLowerCase();
            studies = studies.filter((study: Study) => 
                study.title?.toLowerCase().includes(searchLower) ||
                study.authors?.some((author: string) => author.toLowerCase().includes(searchLower)) ||
                study.institution?.toLowerCase().includes(searchLower)
            );
        }
        
        // Get total count for pagination
        const totalSnapshot = await db.collection("studies").count().get();
        const total = totalSnapshot.data().count;
        
        const result = {
            studies,
            total,
            hasMore: studies.length === limit,
            pagination: {
                limit,
                offset,
                total
            }
        };
        
        return successResponse(result);
        
    } catch (error) {
        console.error("Error fetching studies:", error);
        return errorResponse("Failed to fetch studies", 500);
    }
}