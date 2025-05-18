import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabase";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

// Security constants
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

async function verifyStudyInMemory(
  codeContent: string, 
  dataContent: string, 
  expectedOutput: string
) {
  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (codeContent.includes(keyword)) {
      throw new Error(`Code contains prohibited operation: ${keyword}`);
    }
  }

  // Check for non-allowed imports
  const importRegex = /import\s+([a-zA-Z0-9_]+)/g;
  let match;
  const foundImports = new Set<string>();
  
  while ((match = importRegex.exec(codeContent)) !== null) {
    foundImports.add(match[1].toLowerCase());
  }

  const disallowedImports = [...foundImports].filter(
    imp => !ALLOWED_PYTHON_LIBS.includes(imp)
  );
  
  if (disallowedImports.length > 0) {
    throw new Error(`Disallowed imports detected: ${disallowedImports.join(', ')}`);
  }

  // Execute code in memory using Python with stdin
  const isWindows = process.platform === "win32";
  const pythonCmd = isWindows ? "python" : "python3";

  // Modify code to read data from stdin
  let modifiedCode = codeContent
    .replace(
      /pd\.read_csv\(([\'"]).*?\1(.*?)\)/g,
      `pd.read_csv(sys.stdin$2)`
    )
    .replace(
      /pd\.read_csv\(StringIO\(.*?\)(.*?)\)/g,
      `pd.read_csv(sys.stdin$1)`
    );

  // Add import sys if not present
  if (!modifiedCode.includes('import sys')) {
    modifiedCode = `import sys\n${modifiedCode}`;
  }

  const command = `echo "${dataContent.replace(/"/g, '\\"')}" | "${pythonCmd}" -c "${modifiedCode.replace(/\n/g, '; ')}"`;
  
  const { stdout, stderr } = await execPromise(command, {
    maxBuffer: 1024 * 1024 * 10, // 10MB output limit
    timeout: 30000, // 30 second timeout
  });

  if (stderr && !stdout) {
    throw new Error(`Execution error: ${stderr.length > 500 ? stderr.substring(0, 500) + '...' : stderr}`);
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
    const authors = JSON.parse(formData.get('authors') as string);
    const institution = formData.get('institution') as string;
    const date = formData.get('date') as string;
    const category = formData.get('category') as string;
    const participants = parseInt(formData.get('participants') as string);
    const reproductions = parseInt(formData.get('reproductions') as string);
    const issues = parseInt(formData.get('issues') as string);
    const tags = JSON.parse(formData.get('tags') as string);
    const description = formData.get('description') as string;
    const abstract = formData.get('abstract') as string;
    const methodology = formData.get('methodology') as string;
    const expectedOutput = formData.get('expectedOutput') as string;
    
    // Get files
    const dataFile = formData.get('dataFile') as File;
    const codeFile = formData.get('codeFile') as File;

    if (!dataFile || !codeFile) {
      throw new Error("Both data file and code file are required");
    }

    // Validate file types
    if (dataFile.type !== 'text/csv' && !dataFile.name.endsWith('.csv')) {
      throw new Error("Data file must be a CSV file");
    }

    if (codeFile.type !== 'text/x-python' && !codeFile.name.endsWith('.py')) {
      throw new Error("Code file must be a Python file");
    }

    // Check file sizes
    if (dataFile.size > MAX_CSV_SIZE) {
      throw new Error("Data file too large (max 5MB)");
    }

    if (codeFile.size > MAX_PY_SIZE) {
      throw new Error("Code file too large (max 1MB)");
    }

    // Read file contents
    const dataContent = await dataFile.text();
    const codeContent = await codeFile.text();

    // Verify the study in memory
    const verificationResult = await verifyStudyInMemory(
      codeContent,
      dataContent,
      expectedOutput
    );

    // Upload files to Supabase
    const [dataFileUrl, codeFileUrl] = await Promise.all([
      uploadFileToSupabase(dataFile, 'studies'),
      uploadFileToSupabase(codeFile, 'codes')
    ]);

    // Determine study status based on verification
    const status = verificationResult.status === "match" || 
                   verificationResult.status === "close" ? "verified" :
                   verificationResult.status === "partial" ? "partial" : "issues";

    // Prepare study data
    const studyData = {
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
      methodology,
      expectedOutput,
      verification: verificationResult,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore
    const docRef = await db.collection("studies").add(studyData);

    return NextResponse.json({ 
      success: true,
      studyId: docRef.id,
      verification: verificationResult,
      dataFileUrl,
      codeFileUrl
    });

  } catch (error) {
    console.error("Error in study submission:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}