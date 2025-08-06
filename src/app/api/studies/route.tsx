import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getCache, setCache } from "@/lib/cache";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // Max 50 items
        const offset = parseInt(searchParams.get("offset") || "0");
        const category = searchParams.get("category");
        const status = searchParams.get("status");
        const search = searchParams.get("search");
        
        // Create cache key based on query params
        const cacheKey = `studies:${limit}:${offset}:${category}:${status}:${search}`;
        const cached = getCache(cacheKey);
        
        if (cached) {
            return successResponse(cached);
        }
        
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
        
        let studies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];
        
        // Client-side search if search term provided
        if (search) {
            const searchLower = search.toLowerCase();
            studies = studies.filter((study: any) => 
                study.title?.toLowerCase().includes(searchLower) ||
                study.authors?.some((author: string) => author.toLowerCase().includes(searchLower)) ||
                study.institution?.toLowerCase().includes(searchLower)
            );
        }
        
        // Get total count for pagination (cached separately)
        const totalCacheKey = `studies:total:${category}:${status}`;
        let total = getCache(totalCacheKey);
        
        if (!total) {
            const totalSnapshot = await db.collection("studies").count().get();
            total = totalSnapshot.data().count;
            setCache(totalCacheKey, total, 10); // Cache total for 10 minutes
        }
        
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
        
        // Cache for 2 minutes
        setCache(cacheKey, result, 2);
        
        return successResponse(result);
        
    } catch (error) {
        console.error("Error fetching studies:", error);
        return errorResponse("Failed to fetch studies", 500);
    }
}