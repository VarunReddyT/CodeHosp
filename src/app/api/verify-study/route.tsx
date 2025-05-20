import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import {db} from "@/lib/firebase";
import { increment, doc, updateDoc } from "firebase/firestore";

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";
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

function checkCodeSecurity(codeContent: string): { safe: boolean; message?: string } {
    for (const keyword of DANGEROUS_KEYWORDS) {
        if (codeContent.includes(keyword)) {
            return {
                safe: false,
                message: `Code contains prohibited operation: ${keyword}`
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
            safe: false,
            message: `Code contains non-allowed imports: ${nonAllowedImports.join(", ")}`
        };
    }

    return { safe: true };
}

async function executeWithPiston(codeContent: string, csvContent: string): Promise<{ stdout: string; stderr: string }> {
    try {
        const response = await axios.post(PISTON_API_URL, {
            language: 'python',
            version: '3.10.0',
            files: [
                {
                    name: 'main.py',
                    content: codeContent
                },
                {
                    name: 'data.csv',
                    content: csvContent
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
            stderr: response.data.run.stderr || response.data.run.output || ""
        };
    } catch (error) {
        console.error("Piston API error:", error);
        throw new Error("Failed to execute code with Piston API");
    }
}

function compareOutputs(output: string, expectedOutput: string) {
    if (output.trim() === expectedOutput.trim()) {
        return {
            status: "match",
            output,
            expectedOutput,
            details: "The output matches the expected output."
        };
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
            };
        } else if (percentDiff < 20) {
            return {
                status: "partial",
                output,
                expectedOutput,
                details: `The output is partially correct. Difference: ${diff.toFixed(2)}`
            };
        }
    }

    const similarity = calculateStringSimilarity(output, expectedOutput);
    if (similarity > 0.8) {
        return {
            status: "match",
            output,
            expectedOutput,
            details: `The output is similar to the expected output. Similarity: ${(similarity * 100).toFixed(2)}%`
        };
    } else if (similarity > 0.5) {
        return {
            status: "partial",
            output,
            expectedOutput,
            details: `The output is partially correct. Similarity: ${(similarity * 100).toFixed(2)}%`
        };
    }

    return {
        status: "mismatch",
        output,
        expectedOutput,
        details: `The output does not match the expected output. Similarity: ${(similarity * 100).toFixed(2)}%`
    };
}

function extractNumber(str: string): number | null {
    const match = str.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
}

function calculateStringSimilarity(str1: string, str2: string): number {
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    return intersection.size / Math.max(tokens1.size, tokens2.size);
}

export async function POST(req: NextRequest) {
    const { studyId, dataFile, codeFile, expectedOutput } = await req.json();
    
    if (!studyId || !dataFile || !codeFile || !expectedOutput) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const dataFileModified = new URL(dataFile).pathname.replace(`/storage/v1/object/public/`, "");
        const codeFileModified = new URL(codeFile).pathname.replace(`/storage/v1/object/public/`, "");
        
        const [dataBucket, ...dataPathParts] = dataFileModified.split("/");
        const dataPath = dataPathParts.join("/");
        
        const [codeBucket, ...codePathParts] = codeFileModified.split("/");
        const codePath = codePathParts.join("/");


        const { data: csvData, error: csvError } = await supabase
            .storage
            .from(dataBucket)
            .download(dataPath);
            
        if (csvError) {
            console.error(csvError);
            return NextResponse.json({ error: "Error downloading dataset" }, { status: 500 });
        }

        const { data: codeData, error: codeError } = await supabase
            .storage
            .from(codeBucket)
            .download(codePath);
            
        if (codeError) {
            console.error(codeError);
            return NextResponse.json({ error: "Error downloading code" }, { status: 500 });
        }

        const csvContent = await csvData.text();
        let codeContent = await codeData.text();

        const securityCheck = checkCodeSecurity(codeContent);
        if (!securityCheck.safe) {
            return NextResponse.json({ 
                error: "Code security violation",
                details: securityCheck.message 
            }, { status: 400 });
        }

        codeContent = sanitizeCode(codeContent);

        codeContent = codeContent.replace(
            /pd\.read_csv\(([\'"]).*?\1(.*?)\)/g,
            `pd.read_csv("data.csv"$2)`
        );

        codeContent = codeContent.replace(
            /pd\.read_csv\(StringIO\(.*?\)(.*?)\)/g,
            `pd.read_csv("data.csv"$1)`
        );

        const { stdout, stderr } = await executeWithPiston(codeContent, csvContent);
        
        if (stderr && !stdout) {
            console.error(stderr);
            return NextResponse.json({ 
                error: "Execution Error",
                details: stderr 
            }, { status: 500 });
        }

        const result = compareOutputs(stdout, expectedOutput);

        await updateDoc(doc(db, "studies", studyId), {
            verifications : increment(1),
            verification : result,
            lastVerified: new Date().toISOString()
        }).catch((error) => {
            console.error("Error updating Firestore:", error);
            return NextResponse.json({ error: "Error updating Firestore" }, { status: 500 });
        });

        return NextResponse.json({
            status: result.status,
            output: result.output,
            expectedOutput: result.expectedOutput,
            details: result.details
        });
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json({ 
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}