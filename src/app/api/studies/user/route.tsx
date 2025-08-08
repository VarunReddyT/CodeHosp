import { NextRequest } from "next/server";
import {db} from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
        return errorResponse("Missing user ID", 400);
    }
    
    try{
        const q = query(collection(db, "studies"), where("userId", "==", uid));
        const snapshot = await getDocs(q);

        const studies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (studies.length === 0) {
            return errorResponse("No studies found", 404);
        }

        return successResponse(studies);
    }
    catch (error) {
        console.error("Error fetching studies:", error);
        return errorResponse("Failed to fetch studies", 500);
    }
}