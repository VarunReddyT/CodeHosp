import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studyId = searchParams.get("id");
        if (!studyId) {
            return NextResponse.json({ message: "Study ID is required" }, { status: 400 });
        }
        const studySnapshot = await db.collection("studies").doc(studyId).get();
        if (!studySnapshot.exists) {
            return NextResponse.json({ message: "Study not found" }, { status: 404 });
        }
        const studyData = studySnapshot.data();
        if (!studyData) {
            return NextResponse.json({ message: "Study data not found" }, { status: 404 });
        }
        return NextResponse.json({ study: studyData }, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching study:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}