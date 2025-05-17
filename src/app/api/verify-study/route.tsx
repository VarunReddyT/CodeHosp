import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";
import os from "os";
const execPromise = util.promisify(exec);


export async function POST(req: NextRequest, res: NextResponse) {
    const { studyId, dataFile, codeFile, expectedOutput } = await req.json();
    if (!studyId || !dataFile || !codeFile || !expectedOutput) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const dataFileModified = new URL(dataFile).pathname.replace(`/storage/v1/object/public/`, "");
    const codeFileModified = new URL(codeFile).pathname.replace(`/storage/v1/object/public/`, "");
    const [bucket, ...pathParts] = dataFileModified.split("/");
    const dataPath = pathParts.join("/");
    const [codeBucket, ...codePathParts] = codeFileModified.split("/");
    const codePath = codePathParts.join("/");
    try {
        const { data, error } = await supabase
            .storage
            .from("studies")
            .download(dataPath);
        if (error) {
            console.error(error);
            return NextResponse.json({ error: "Error downloading dataset" }, { status: 500 });
        }
        const { data: codeData, error: codeError } = await supabase
            .storage
            .from("codes")
            .download(codePath);
        if (codeError) {
            console.error(codeError);
            return NextResponse.json({ error: "Error downloading code" }, { status: 500 });
        }
        const baseTmp = path.join(os.tmpdir(), studyId);
        const filePath = path.join(baseTmp, "data.csv");
        await fs.mkdir(baseTmp, { recursive: true });
        await fs.writeFile(filePath, Buffer.from(await data.arrayBuffer()));

        let codeContent = await codeData.text();
        codeContent = codeContent.replace(
            /pd\.read_csv\(([\'"]).*?\1(.*?)\)/g,
            `pd.read_csv(r"${filePath.replace(/\\/g, '/')}"$2)`
        );

        codeContent = codeContent.replace(
            /pd\.read_csv\(StringIO\(.*?\)(.*?)\)/g,
            `pd.read_csv(r"${filePath.replace(/\\/g, '/')}"$1)`
        );

        const codeFilePath = path.join(baseTmp, "code.py");
        await fs.writeFile(codeFilePath, codeContent);

        const isWindows = process.platform === "win32";
        const pythonCmd = isWindows ? "python" : "python3";

        const command = `"${pythonCmd}" "${codeFilePath}"`;
        const { stdout, stderr } = await execPromise(command, {
            cwd: baseTmp,
            maxBuffer: 1024 * 1024 * 10,
        });
        if (stderr && !stdout) {
            console.error(stderr);
            return NextResponse.json({ error: "Execution Error" }, { status: 500 });
        }
        const output = stdout;
        // console.log(codeContent);
        console.log("Output:", output);
        const result = compareOutputs(output, expectedOutput);
        await cleanupFiles([filePath, codeFilePath]);

        return NextResponse.json({
            status: result.status,
            output: result.output,
            expectedOutput: result.expectedOutput,
            details: result.details
        });
    }
    catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
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
    const match = str.match(/-?\d+\.?\d*/)
    return match ? parseFloat(match[0]) : null
}

function calculateStringSimilarity(str1: string, str2: string): number {
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/))
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/))
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)))
    return intersection.size / Math.max(tokens1.size, tokens2.size)
}

async function cleanupFiles(filePaths: string[]) {
    await Promise.all(
        filePaths.map(filePath =>
            fs.unlink(filePath).catch(err => {
                if (err.code !== 'ENOENT') console.error(`Failed to delete ${filePath}:`, err)
            })
        )
    )
}