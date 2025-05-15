import { NextResponse } from "next/server";
import {db} from "@/lib/firebaseAdmin";

export async function GET() {
    try{
        const snapshot = await db.collection("studies").get();
        if(snapshot.empty) {
            return NextResponse.json({ message : "No studies found" }, { status: 404 });
        }
    
        const studies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    
        return NextResponse.json(studies, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching studies:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}