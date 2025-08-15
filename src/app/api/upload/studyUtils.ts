import { db } from "@/lib/firebaseAdmin";

export async function createStudyDocument({
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
    abstract,
    studyType,
    dataFile,
    codeFile,
    readmeFile,
    expectedOutput,
    methodology,
    verification,
    userId
}: any) {
    return db.collection("studies").add({
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
        abstract,
        studyType,
        dataFile,
        codeFile,
        readmeFile,
        expectedOutput,
        methodology,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        verification: studyType === 'research' ? verification : null,
        verifications: studyType === 'research' ? 1 : 0,
        userId,
    });
}

export async function updateUserPoints(userId: string, additionalPoints: number) {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        const currentPoints = userData?.points || 0;
        await userRef.update({
            points: currentPoints + additionalPoints + 50,
            studies: (userData?.studies || 0) + 1,
            contributions: (userData?.contributions || 0) + 1,
            lastUpdated: new Date().toISOString(),
        });
    }
}

export function calculatePoints(studyType: string, verificationResult: any) {
    if (studyType === 'research' && verificationResult) {
        if (verificationResult.status === "match" || verificationResult.status === "close") {
            return 100;
        } else if (verificationResult.status === "partial") {
            return 40;
        }
    } else if (studyType === 'data-only') {
        return 25;
    }
    return 0;
}
