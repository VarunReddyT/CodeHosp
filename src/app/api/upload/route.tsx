import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";
import axios from "axios";

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";
const COMPARATOR_API_URL = "https://varunreddy24-comparator.hf.space/compare";
const MAX_CSV_SIZE = 5 * 1024 * 1024;
const MAX_PY_SIZE = 1 * 1024 * 1024;
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

        const response = await axios.post(PISTON_API_URL, {
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
        const response = await axios.post(COMPARATOR_API_URL, {
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
    const user = await adminAuth.verifyIdToken(request.headers.get("Authorization")?.split("Bearer ")[1] || "");
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = user.uid;
    try {
        const formData = await request.formData();
        
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
        const expectedOutput = formData.get('expectedOutput') as string;

        const dataFile = formData.get('dataFile') as File;
        const codeFile = formData.get('codeFile') as File;

        if (!dataFile || !codeFile) {
            throw new Error("Data file and code file are required");
        }
        if (dataFile.type !== 'text/csv' && !dataFile.name.endsWith('.csv')) {
            throw new Error("Data file must be a CSV file");
        }

        if (codeFile.type !== 'text/x-python' && !codeFile.name.endsWith('.py')) {
            throw new Error("Code file must be a Python file");
        }

        if (dataFile.size > MAX_CSV_SIZE) {
            throw new Error("Data file too large (max 5MB)");
        }

        if (codeFile.size > MAX_PY_SIZE) {
            throw new Error("Code file too large (max 1MB)");
        }

        const dataContent = await dataFile.text();
        const codeContent = await codeFile.text();

        const verificationResult = await verifyStudy(
            codeContent,
            dataContent,
            expectedOutput,
        );
        
        const dataFileUrl = await uploadFileToSupabase(dataFile, "studies");
        const codeFileUrl = await uploadFileToSupabase(codeFile, "codes");


        if (verificationResult.status === "error") {
            return NextResponse.json({ message: verificationResult.details }, { status: 400 });
        }

        const status = verificationResult.status === "match" ||
            verificationResult.status === "close" ? "verified" :
            verificationResult.status === "partial" ? "partial" : "issues";

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
            dataFile: dataFileUrl,
            codeFile: codeFileUrl,
            expectedOutput,
            methodology,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            verification: verificationResult,
            verifications : 1,
            userId: userId,
        });
        return NextResponse.json({
            message: "Study published successfully",
            status: status,
            verification: verificationResult,
            dataFileUrl,
            codeFileUrl,
            studyId: response.id
        }, { status: 200 });
    }
    catch (error) {
        console.error("Error publishing study:", error);
        return NextResponse.json({
            message: error instanceof Error ? error.message : "Internal Server Error"
        }, { status: 500 });
    }
}