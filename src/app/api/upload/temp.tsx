import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabase";
import { exec } from "child_process";
import util from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";
const execPromise = util.promisify(exec);

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PY_SIZE = 1 * 1024 * 1024; // 1MB
const DANGEROUS_KEYWORDS = [
    'os.system', 'subprocess', 'eval', 'exec', 'open(',
    'import socket', 'import os', 'import subprocess',
    'shutil', 'pickle', 'marshal', 'sys.', 'import sys',
    '__import__', 'globals', 'locals', 'compile', 'execfile'
];
const ALLOWED_PYTHON_LIBS = [
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'scipy',
    'sklearn', 'statsmodels', 'math', 'datetime'
];

async function uploadFileToSupabase(file: File, bucket: string): Promise<string> {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const filePath = `${bucket}/${fileName}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    return supabase.storage
        .from(bucket)
        .getPublicUrl(filePath).data.publicUrl;
    
}

async function verifyStudy(codeContent: string, dataContent: string, expectedOutput: string) {
    for(const keyword of DANGEROUS_KEYWORDS) {
        if (codeContent.includes(keyword)) {
            return {
                success: false,
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
            status: "error",
            details: `Code contains non-allowed imports: ${nonAllowedImports.join(", ")}`
        };
    }

    const isWindows = process.platform === 'win32';
    const pythonCommand = isWindows ? 'python' : 'python3';

    const baseTmp = path.join(os.tmpdir(), 'study');
    const dataFilePath = path.join(baseTmp, 'data.csv');
    const codeFilePath = path.join(baseTmp, 'code.py');
    await fs.mkdir(baseTmp, { recursive: true });
    await fs.writeFile(dataFilePath, dataContent);

    codeContent = codeContent.replace(/pd\.read_csv\(([\'"]).*?\1(.*?)\)/g, `pd.read_csv(r"${dataFilePath.replace(/\\/g, '/')}"$2)`);
    codeContent = codeContent.replace(/pd\.read_csv\(StringIO\(.*?\)(.*?)\)/g, `pd.read_csv(r"${dataFilePath.replace(/\\/g, '/')}"$1)`);

    await fs.writeFile(codeFilePath, codeContent);

    const command = `"${pythonCommand}" "${codeFilePath}"`;
    const { stdout, stderr } = await execPromise(command, {
        cwd: baseTmp,
        maxBuffer: 1024 * 1024 * 10,
        timeout: 20000
    });
    if (stderr && !stdout) {
        return {
            status: "error",
            details: `Execution Error: ${stderr}`
        };
    }
    
    return compareOutputs(stdout, expectedOutput);
    
}

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
  const match = str.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  return intersection.size / Math.max(tokens1.size, tokens2.size);
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Extract all fields from form data
        const title = formData.get('title') as string;
        const authors = formData.getAll('authors') as string[];
        const institution = formData.get('institution') as string;
        const date = formData.get('date') as string;
        const category = formData.get('category') as string;
        const participants = parseInt(formData.get('participants') as string);
        const reproductions = parseInt(formData.get('reproductions') as string);
        const issues = formData.getAll('issues') as [];
        const tags = formData.getAll('tags') as string[];
        const description = formData.get('description') as string;
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
        await db.collection("studies").add({
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
            description,
            abstract,
            dataFile: dataFileUrl,
            codeFile: codeFileUrl,
            expectedOutput,
            methodology,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        await cleanupFiles([dataFileUrl, codeFileUrl]);
        
        return NextResponse.json({ message: "Study published successfully",
            status: status,
            verification: verificationResult,
            dataFileUrl,
            codeFileUrl
         }, { status: 200 });
    }
    catch (error) {
        console.error("Error publishing study:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

async function cleanupFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    }
}