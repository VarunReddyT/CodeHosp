import { NextResponse, NextRequest } from "next/server";
import { validateToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/errorHandler";
import { validateFile, FILE_TYPES } from "@/lib/fileValidation";
import { config } from "@/lib/config";
import { uploadFileToSupabase } from "./fileUpload";
import { verifyStudy } from "./verification";
import { createStudyDocument, updateUserPoints, calculatePoints } from "./studyUtils";


export async function POST(request: NextRequest) {
    // Use centralized auth validation
    const { user, error } = await validateToken(request);
    if (error) {
        return errorResponse(error, 401);
    }
    
    try {
        const formData = await request.formData();
        
        // Extract form data
        const title = formData.get('title') as string;
        const authors = formData.getAll('authors[]') as string[];
        const institution = formData.get('institution') as string;
        const date = formData.get('date') as string;
        const category = formData.get('category') as string;
        const participants = parseInt(formData.get('participants') as string);
        const reproductions = parseInt(formData.get('reproductions') as string);
        const issues = formData.getAll('issues[]') as string[];
        const tags = formData.getAll('tags[]') as string[];
        const abstract = formData.get('abstract') as string;
        const methodology = formData.get('methodology') as string;
        const studyType = formData.get('studyType') as string; // 'data-only' or 'research'
        const expectedOutput = formData.get('expectedOutput') as string;

        // Extract and validate files
        const dataFile = formData.get('dataFile') as File;
        const codeFile = formData.get('codeFile') as File;
        const readmeFile = formData.get('readmeFile') as File;

        // Validate required fields based on study type
        if (!dataFile) {
            return errorResponse("Data file is required for all studies", 400);
        }

        if (!studyType || !['data-only', 'research'].includes(studyType)) {
            return errorResponse("Study type must be 'data-only' or 'research'", 400);
        }

        if (studyType === 'research' && !codeFile) {
            return errorResponse("Code file is required for research studies", 400);
        }

        if (studyType === 'research' && !expectedOutput) {
            return errorResponse("Expected output is required for research studies", 400);
        }

        // Validate files using utility
        const dataValidation = validateFile(dataFile, FILE_TYPES.SPREADSHEET, config.limits.maxDataFileSize);
        if (!dataValidation.valid) {
            return errorResponse(dataValidation.error!, 400);
        }
        // Validate code file only for research studies
        if (studyType === 'research' && codeFile) {
            const codeValidation = validateFile(codeFile, FILE_TYPES.PYTHON, config.limits.maxPySize);
            if (!codeValidation.valid) {
                return errorResponse(codeValidation.error!, 400);
            }
        }
        
        if (readmeFile) {
            const readmeValidation = validateFile(readmeFile, [...FILE_TYPES.MARKDOWN, "application/octet-stream"], config.limits.maxReadmeSize);
            if (!readmeValidation.valid) {
                return errorResponse(readmeValidation.error!, 400);
            }
        }

        // Get data content for all spreadsheet files
        const dataContent = await dataFile.text();
        
        let codeContent = null;
        let verificationResult = null;

        // Only process code and verification for research studies
        if (studyType === 'research' && codeFile) {
            codeContent = await codeFile.text();
            verificationResult = await verifyStudy(
                codeContent,
                dataContent,
                expectedOutput,
            );
            
            if (verificationResult.status === "error") {
                return NextResponse.json({ message: verificationResult.details }, { status: 400 });
            }
        }
        
        const dataFileUrl = await uploadFileToSupabase(dataFile, "studies");
        const codeFileUrl = (studyType === 'research' && codeFile) ? await uploadFileToSupabase(codeFile, "codes") : null;
        const readmeFileUrl = readmeFile ? await uploadFileToSupabase(readmeFile, "readmes") : null;

        // Determine status based on study type and verification
        let status = "published"; // Default for data-only studies
        if (studyType === 'research' && verificationResult) {
            status = verificationResult.status === "match" ||
                verificationResult.status === "close" ? "verified" :
                verificationResult.status === "partial" ? "partial" : "issues";
        }

        if (!user) {
            return errorResponse("User not found", 401);
        }
        const response = await createStudyDocument({
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
            dataFile: dataFileUrl,
            codeFile: codeFileUrl,
            readmeFile: readmeFileUrl,
            expectedOutput: studyType === 'research' ? expectedOutput : null,
            methodology,
            verification: studyType === 'research' ? verificationResult : null,
            userId: user.uid,
        });

        // Calculate points based on study type and verification
        const additionalPoints = calculatePoints(studyType, verificationResult);
        await updateUserPoints(user.uid, additionalPoints);

        return successResponse({
            id: response.id,
            status: status,
            studyType: studyType,
            verification: studyType === 'research' ? verificationResult : null,
            dataFileUrl,
            codeFileUrl,
            readmeFileUrl,
            studyId: response.id
        }, "Study published successfully");
    }
    catch (error) {
        const { status, message } = handleApiError(error);
        return errorResponse(message, status);
    }
}