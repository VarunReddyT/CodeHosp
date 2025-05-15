import { NextResponse, NextRequest } from "next/server";
import {db} from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
    try{
        const formData = await request.json();
        const {
            title,
            authors,
            institution,
            date,
            category,
            status,
            participants,
            reproductions,
            issues,
            tags,
            description,
            abstract,
            dataFile,
            codeFile,
            methodology
        } = formData;

        await db.collection("studies").add({
            title,
            authors,
            institution,
            date,
            category,
            status,
            participants,
            reproductions,
            issues,
            tags,
            description,
            abstract,
            dataFile,
            codeFile,
            methodology,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ message: "Study published successfully" }, { status: 200 });
    }
    catch (error) {
        console.error("Error publishing study:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}