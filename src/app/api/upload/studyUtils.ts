import { db } from "@/lib/firebaseAdmin";


export interface StudyDocumentInput {
    title: string;
    authors: string[];
    institution: string;
    date: string;
    category: string;
    status: string;
    participants: number;
    reproductions: number;
    issues: string[];
    tags: string[];
    abstract: string;
    studyType: string;
    dataFile: string;
    codeFile: string | null;
    readmeFile: string | null;
    expectedOutput: string | null;
    methodology: string;
    verification: unknown;
    userId: string;
}

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
}: StudyDocumentInput) {
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

export function calculatePoints(studyType: string, verificationResult: unknown) {
    if (studyType === 'research' && verificationResult && typeof verificationResult === 'object' && verificationResult !== null) {
        const status = (verificationResult as { status?: string }).status;
        if (status === "match" || status === "close") {
            return 100;
        } else if (status === "partial") {
            return 40;
        }
    } else if (studyType === 'data-only') {
        return 25;
    }
    return 0;
}
