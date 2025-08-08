import { NextResponse, NextRequest } from "next/server";
import { validateToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/errorHandler";
import { validateFile, FILE_TYPES } from "@/lib/fileValidation";
import { config } from "@/lib/config";
import { db } from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabase";
import axios from "axios";

const DANGEROUS_KEYWORDS = [
    'os.system', 'subprocess', 'eval', 'exec', 'open(',
    'import socket', 'import os', 'import subprocess',
    'shutil', 'pickle', 'marshal', 'sys.', 'import sys',
    '__import__', 'globals', 'locals', 'compile', 'execfile'
];
const ALLOWED_PYTHON_LIBS = [
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'scipy',
    'sklearn', 'statsmodels', 'math', 'datetime', 'string', 
    're', 'json', 'csv', 'itertools', 'collections', 
    'functools', 'random', 'time', 'datetime', 'statistics', 
    'stringio', 'io'
];

function sanitizeCode(code: string): string {
    return code.replace(/\0/g, '');
}

async function uploadFileToSupabase(file: File, bucket: string): Promise<string> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
        });
    console.log("Upload response:", data);
    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    return supabase.storage
        .from(bucket)
        .getPublicUrl(fileName).data.publicUrl;
}

async function executeWithPiston(codeContent: string, dataContent: string): Promise<{ stdout: string, stderr: string | null }> {
    try {
        const modifiedCode = codeContent
            .replace(/pd\.read_csv\(['"].*?['"]\)/g, `pd.read_csv("data.csv")`)
            .replace(/pd\.read_csv\(StringIO\(.*?\)\)/g, `pd.read_csv("data.csv")`);

        const response = await axios.post(config.apis.piston, {
            language: 'python',
            version: '3.10.0',
            files: [
                {
                    name: 'main.py',
                    content: modifiedCode
                },
                {
                    name: 'data.csv',
                    content: dataContent
                }
            ],
            stdin: '',
            args: [],
            compile_timeout: 10000,
            run_timeout: 10000,
            compile_memory_limit: -1,
            run_memory_limit: -1
        });

        console.log("Piston API response:", response.data);

        return {
            stdout: response.data.run.stdout || "",
            stderr: response.data.run.stderr || null
        };
    } catch (error) {
        console.error("Error executing code with Piston:", error);
        if (axios.isAxiosError(error)) {
            return {
                stdout: "",
                stderr: `Piston API error: ${error.response?.data?.message || error.message}`
            };
        }
        return {
            stdout: "",
            stderr: "Unknown execution error"
        };
    }
}

async function compareOutputsAPI(output: string, expectedOutput: string) {
    try {
        const response = await axios.post(config.apis.comparator, {
            expected: expectedOutput,
            actual: output
        });
        
        return {
            similarity: response.data.composite_score,
            result: response.data.result
        };
    } catch (error) {
        console.error("Error comparing outputs:", error);
        return {
            similarity: 0,
            result: "Comparison failed"
        };
    }
}

async function verifyStudy(codeContent: string, dataContent: string, expectedOutput: string) {
    for (const keyword of DANGEROUS_KEYWORDS) {
        if (codeContent.includes(keyword)) {
            return {
                status: "error",
                details: `Code contains prohibited operation: ${keyword}`
            };
        }
    }

    const importRegex = /import\s+([a-zA-Z0-9_]+)/g;
    let match;
    const foundImports = new Set<string>();
    while ((match = importRegex.exec(codeContent)) !== null) {
        foundImports.add(match[1].toLowerCase());
    }
    const nonAllowedImports = [...foundImports].filter(
        (imp) => !ALLOWED_PYTHON_LIBS.includes(imp)
    );
    if (nonAllowedImports.length > 0) {
        return {
            status: "error",
            details: `Code contains non-allowed imports: ${nonAllowedImports.join(", ")}`
        };
    }

    const sanitizedCode = sanitizeCode(codeContent);
    try {
        const { stdout, stderr } = await executeWithPiston(sanitizedCode, dataContent);

        if (stderr) {
            return {
                status: "error",
                details: `Execution Error: ${stderr}`,
                output: stdout
            };
        }

        return await compareOutputs(stdout, expectedOutput);
    } catch (error) {
        return {
            status: "error",
            details: error instanceof Error ? error.message : "Execution failed"
        };
    }
}

async function compareOutputs(output: string, expectedOutput: string) {
    if (output === expectedOutput) {
        return {
            status: "match",
            output,
            expectedOutput,
            details: "Perfect or near-perfect match. Auto-verified."
        }
    }

    const actualNum = extractNumber(output);
    const expectedNum = extractNumber(expectedOutput);

    if (actualNum !== null && expectedNum !== null) {
        const diff = Math.abs(actualNum - expectedNum);
        const percentDiff = (diff / Math.abs(expectedNum)) * 100;

        if (percentDiff < 5) {
            return {
                status: "match",
                output,
                expectedOutput,
                details: "Perfect or near-perfect match. Auto-verified."
            }
        }
        else if (percentDiff < 20) {
            return {
                status: "partial",
                output,
                expectedOutput,
                details: "Moderate similarity. Review recommended."
            }
        }
    }

    const { similarity, result } = await compareOutputsAPI(output, expectedOutput);
    
    if (similarity >= 0.95) {
        return {
            status: "match",
            output,
            expectedOutput,
            details: result
        }
    }
    else if (similarity >= 0.90) {
        return {
            status: "close",
            output,
            expectedOutput,
            details: result
        }
    }
    else if (similarity >= 0.85) {
        return {
            status: "partial",
            output,
            expectedOutput,
            details: result
        }
    }
    else if (similarity >= 0.80) {
        return {
            status: "partial",
            output,
            expectedOutput,
            details: result
        }
    }
    else {
        return {
            status: "mismatch",
            output,
            expectedOutput,
            details: result
        }
    }
}

function extractNumber(str: string): number | null {
    const match = str.match(/-?\d+\.?\d*/)
    return match ? parseFloat(match[0]) : null
}

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
        const response = await db.collection("studies").add({
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
            studyType, // Add the new field
            dataFile: dataFileUrl,
            codeFile: codeFileUrl,
            readmeFile: readmeFileUrl,
            expectedOutput: studyType === 'research' ? expectedOutput : null,
            methodology,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            verification: studyType === 'research' ? verificationResult : null,
            verifications: studyType === 'research' ? 1 : 0,
            userId: user.uid,
        });

        // Calculate points based on study type and verification
        let additionalPoints = 0;
        if (studyType === 'research' && verificationResult) {
            if (verificationResult.status === "match" || verificationResult.status === "close") {
                additionalPoints = 100;
            } else if (verificationResult.status === "partial") {
                additionalPoints = 40;
            }
        } else if (studyType === 'data-only') {
            additionalPoints = 25; // Points for data sharing
        }

        const userRef = db.collection("users").doc(user.uid);
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