import { NextRequest, NextResponse } from "next/server";
import {db} from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
export async function POST(request: NextRequest) {
    const {studyId, modifiedCode, userId, originalCode, notes} = await request.json();
    if (!studyId || !modifiedCode || !userId || !originalCode || !notes) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    try{
        await addDoc(collection(db, "modifications"), {
            studyId: studyId,
            modifiedCode: modifiedCode,
            userId: userId,
            originalCode: originalCode,
            notes: notes,
            timestamp: new Date().toISOString()
        });
        return NextResponse.json({ message: "Modification saved successfully" }, { status: 200 });
    }
    catch (error) {
        console.error("Error saving modification:", error);
        return NextResponse.json({ error: "Failed to save modification" }, { status: 500 });
    }
}
