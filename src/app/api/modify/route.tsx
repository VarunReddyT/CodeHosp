import { NextRequest } from "next/server";
import {db} from "@/lib/firebase";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
    const {studyId, modifiedCode, userId, originalCode, notes} = await request.json();
    if (!studyId || !modifiedCode || !userId || !originalCode || !notes) {
        return errorResponse("Missing required fields", 400);
    }
    try{
        await addDoc(collection(db, "modifications"), {
            studyId: studyId,
            modifiedCode: modifiedCode,
            userId: userId,
            originalCode: originalCode,
            notes: notes,
            timestamp: new Date().toISOString(),
            approved : "none"
        });
        return successResponse({ message: "Modification saved successfully" });
    }
    catch (error) {
        console.error("Error saving modification:", error);
        return errorResponse("Failed to save modification", 500);
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get("studyId");
    if (!studyId) {
        return errorResponse("Missing study ID", 400);
    }
    try {
        const modificationsRef = collection(db, "modifications");
        const querySnapshot = await getDocs(query(modificationsRef, where("studyId", "==", studyId)));
        const modifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (modifications.length === 0) {
            return errorResponse("No modifications found for this study", 404);
        }
        return successResponse(modifications);
    } catch (error) {
        console.error("Error fetching modifications:", error);
        return errorResponse("Failed to fetch modifications", 500);
    }
}