import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export async function GET(request: NextRequest) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("points", ">", 0));
        const querySnapshot = await getDocs(q);
        
        const leaderboard = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as { points?: number })
        })).sort((a, b) => (b.points || 0) - (a.points || 0));

        let currentUserRank = 0;
        const currentUserId = request.headers.get("x-user-id"); 
        if (currentUserId) {
            const rank = leaderboard.findIndex(user => user.id === currentUserId);
            if (rank !== -1) {
                currentUserRank = rank + 1;
            }
        }
        if(leaderboard.length > 10) {
            leaderboard.length = 10;
        }
        return NextResponse.json({ leaderboard, currentUserRank }, { status: 200 });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}