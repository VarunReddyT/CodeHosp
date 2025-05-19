import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabase";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { getAuth } from "firebase/auth";

const user = getAuth();

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; // Make sure to add this to your env

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PY_SIZE = 1 * 1024 * 1024; // 1MB
var dataTempFilePath: string | null = null;
const DANGEROUS_KEYWORDS = [
    'os.system', 'subprocess', 'eval', 'exec', 'open(',
    'import socket', 'import os', 'import subprocess',
    'shutil', 'pickle', 'marshal', 'sys.', 'import sys',
    '__import__', 'globals', 'locals', 'compile', 'execfile'
];
const ALLOWED_PYTHON_LIBS = [
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'scipy',
    'sklearn', 'statsmodels', 'math', 'datetime', 'string', 're', 'json', 'csv', 'itertools', 'collections', 'functools', 'random', 'time', 'datetime', 'statistics'
];

async function uploadFileToSupabase(file: File, bucket: string): Promise<string> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    return supabase.storage
        .from(bucket)
        .getPublicUrl(fileName).data.publicUrl;
}

async function executeWithJudge0(codeContent: string): Promise<{ stdout: string, stderr: string | null }> {
    if (!JUDGE0_API_KEY) {
        throw new Error("JUDGE0_API_KEY is not defined in environment variables.");
    }
    // Submit to Judge0
    const submissionResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_API_KEY as string,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        } as Record<string, string>,
        body: JSON.stringify({
            source_code: codeContent,
            language_id: 71, // Python
            stdin: '',
            expected_output: '',
            redirect_stderr_to_stdout: true,
            // Add any additional configuration needed
        })
    });

    if (!submissionResponse.ok) {
        throw new Error(`Judge0 API error: ${submissionResponse.statusText}`);
    }

    const submissionResult = await submissionResponse.json();

    return {
        stdout: submissionResult.stdout || "",
        stderr: submissionResult.stderr || null
    };
}

async function verifyStudy(codeContent: string, dataContent: string, expectedOutput: string) {
    // Security checks remain the same
    for(const keyword of DANGEROUS_KEYWORDS) {
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

    // Create temp directory and write data file
    const baseTmp = path.join(os.tmpdir(), 'study');
    const dataFilePath = path.join(baseTmp, 'data.csv');
    await fs.mkdir(baseTmp, { recursive: true });
    await fs.writeFile(dataFilePath, dataContent);
    dataTempFilePath = dataFilePath;

    // Upload data file to a temporary location that Judge0 can access
    const dataFileBuffer = await fs.readFile(dataFilePath);
    const dataFile = new File([new Uint8Array(dataFileBuffer)], 'data.csv', { type: 'text/csv' });
    const dataFileUrl = await uploadFileToSupabase(dataFile, 'temp-uploads');

    // Modify code to use the data file URL
    codeContent = codeContent.replace(/pd\.read_csv\(([\'"]).*?\1(.*?)\)/g, `pd.read_csv("${dataFileUrl}"$2)`);
    codeContent = codeContent.replace(/pd\.read_csv\(StringIO\(.*?\)(.*?)\)/g, `pd.read_csv("${dataFileUrl}"$1)`);

    try {
        const { stdout, stderr } = await executeWithJudge0(codeContent);
        
        if (stderr) {
            return {
                status: "error",
                details: `Execution Error: ${stderr}`,
                output: stdout
            };
        }
        
        return compareOutputs(stdout, expectedOutput);
    } catch (error) {
        return {
            status: "error",
            details: error instanceof Error ? error.message : "Execution failed"
        };
    }
}

// Keep your existing comparison functions
function compareOutputs(output: string, expectedOutput: string) {
    if (output === expectedOutput) {
        return {
            status: "match",
            output,
            expectedOutput,
            details: "The output matches the expected output."
        }
    }
    
    const actualNum = extractNumber(output);
    const expectedNum = extractNumber(expectedOutput);

    if (actualNum !== null && expectedNum !== null) {
        const diff = Math.abs(actualNum - expectedNum);
        const percentDiff = (diff / Math.abs(expectedNum)) * 100;

        if (percentDiff < 5) {
            return {
                status: "close",
                output,
                expectedOutput,
                details: `The output is close to the expected output. Difference: ${diff.toFixed(2)}`
            }
        }
        else if (percentDiff < 20) {
            return {
                status: "partial",
                output,
                expectedOutput,
                details: `The output is partially correct. Difference: ${diff.toFixed(2)}`
            }
        }
    }
    
    const similarity = calculateStringSimilarity(output, expectedOutput);
    if (similarity > 0.8) {
        return {
            status: "match",
            output,
            expectedOutput,
            details: `The output is similar to the expected output. Similarity: ${(similarity * 100).toFixed(2)}%`
        }
    }
    else if (similarity > 0.5) {
        return {
            status: "partial",
            output,
            expectedOutput,
            details: `The output is partially correct. Similarity: ${(similarity * 100).toFixed(2)}%`
        }
    }
    
    return {
        status: "mismatch",
        output,
        expectedOutput,
        details: `The output does not match the expected output. Similarity: ${(similarity * 100).toFixed(2)}%`
    }
}

function extractNumber(str: string): number | null {
    const match = str.match(/-?\d+\.?\d*/)
    return match ? parseFloat(match[0]) : null
}

function calculateStringSimilarity(str1: string, str2: string): number {
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/))
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/))
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)))
    return intersection.size / Math.max(tokens1.size, tokens2.size)
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Extract all fields from form data
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
            throw new Error("Both data file and code file are required");
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
            expectedOutput
        );

        const [dataFileUrl, codeFileUrl] = await Promise.all([
            uploadFileToSupabase(dataFile, "studies"),
            uploadFileToSupabase(codeFile, "codes")
        ]);

        if(verificationResult.status === "error") {
            return NextResponse.json({ message: verificationResult.details }, { status: 400 });
        }

        const status = verificationResult.status === "match" || 
                   verificationResult.status === "close" ? "verified" :
                   verificationResult.status === "partial" ? "partial" : "issues";
        
        // Save to Firestore
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
            userId: user.currentUser?.uid
        });

        // Cleanup temp files
        if (dataTempFilePath) {
            await fs.unlink(dataTempFilePath).catch(console.error);
        }
        
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