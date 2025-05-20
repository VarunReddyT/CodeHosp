import { NextRequest, NextResponse } from "next/server";
import {db} from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { adminAuth } from "@/lib/firebaseAdmin";
export async function GET(req: NextRequest, context : { params: { uid: string } }) {
    const { uid } = await context.params;
    if (!uid) {
        return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }
    // const token = req.headers.get("Authorization");
    // if (!token) {
    //     return NextResponse.json({ error: "Missing token" }, { status: 401 });
    // }
    // console.log("Token:", token);
    // try {
    //     const decodedToken = await adminAuth.verifyIdToken(token);
    //     if (decodedToken.uid !== uid) {
    //         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    //     }
    // } catch (error) {
    //     console.error("Error verifying token:", error);
    //     return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    // }
    try{
        const q = query(collection(db, "studies"), where("userId", "==", uid));
        const snapshot = await getDocs(q);

        const studies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (studies.length === 0) {
            return NextResponse.json({ message: "No studies found" }, { status: 404 });
        }

        return NextResponse.json(studies, { status: 200 });
    }
    catch (error) {
        console.error("Error fetching studies:", error);
        return NextResponse.json({ error: "Failed to fetch studies" }, { status: 500 });
    }
}