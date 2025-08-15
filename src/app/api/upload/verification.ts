import axios from "axios";
import { config } from "@/lib/config";

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

export async function verifyStudy(codeContent: string, dataContent: string, expectedOutput: string) {
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

        return {
            stdout: response.data.run.stdout || "",
            stderr: response.data.run.stderr || null
        };
    } catch (error) {
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
        return {
            similarity: 0,
            result: "Comparison failed"
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
