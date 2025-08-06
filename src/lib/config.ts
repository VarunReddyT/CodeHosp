export const config = {
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    apis: {
        piston: process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute",
        comparator: process.env.COMPARATOR_API_URL || "https://varunreddy24-comparator.hf.space/compare",
    },
    limits: {
        maxCsvSize: 5 * 1024 * 1024,
        maxPySize: 1 * 1024 * 1024,
        maxReadmeSize: 5 * 1024 * 1024,
    }
};
