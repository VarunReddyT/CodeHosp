import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getDocs, getDoc, doc, updateDoc, collection, query, where } from "firebase/firestore";


export async function PUT(request: NextRequest) {
    const { studyId, status } = await request.json();
    if (!studyId) {
        return NextResponse.json({ error: "Missing study ID" }, { status: 400 });
    }

    try {
        const q = query(collection(db, "modifications"), where("studyId", "==", studyId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return NextResponse.json({ error: "No modifications found for this study" }, { status: 404 });
        }
        const modData = querySnapshot.docs[0].data();
        const modRef = doc(db, "modifications", querySnapshot.docs[0].id);
        await updateDoc(modRef, {
            approved: status,
            lastUpdated: new Date().toISOString()
        });

        if(status === "true") {
            const userRef = doc(db, "users", modData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                await updateDoc(userRef, {
                    points: (userData.points || 0) + 10,
                    contributions: (userData.contributions || 0) + 1,
                    lastUpdated: new Date().toISOString()
                });
            }
        }
        
        return NextResponse.json({ message: "Modification status updated successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error fetching modifications:", error);
        return NextResponse.json({ error: "Failed to fetch modifications" }, { status: 500 });
    }
}