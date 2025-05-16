"use client"
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, Play } from 'lucide-react'
import { supabase } from "@lib/supabase"
type Status = "verified" | "issues" | "pending"

interface Study {
  id: string
  userId: string
  title: string
  authors: string[]
  institution: string
  date: string
  category: string
  status: Status
  participants: number
  reproductions: number
  issues: [],
  tags: string[]
  description: string
  abstract: string,
  dataFile: string,
  codeFile: string,
  methodology: string,
  createdAt: string,
  updatedAt: string,
}


interface VerificationResult {
  output: number
  logs: string[]
  success: boolean
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function RunVerification() {
  const { id } = useParams()
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const response = await axios.get(`/api/study?id=${id}`)
        setStudy(response.data.study)
      } catch (error) {
        console.error("Failed to fetch study:", error)
        setLogs(prev => [...prev, "❌ Failed to fetch study details"])
      } finally {
        setLoading(false)
      }
    }
    fetchStudy()
  }, [id])

  const fetchFileFromSupabase = async (url: string) => {
    try {
      // Extract the path from the full URL
      const path = url.replace(`${supabaseUrl}/storage/v1/object/public/`, '')
      const { data, error } = await supabase.storage
        .from('studies')
        .download(path.split('/')[1]) // Get the filename
      
      if (error) throw error
      return await data.text()
    } catch (error) {
      console.error("Error fetching file:", error)
      throw error
    }
  }

  const runVerification = async () => {
    if (!study) return
    
    setVerifying(true)
    setResult(null)
    setLogs([])
    
    try {
      setLogs(prev => [...prev, "🔍 Starting verification process..."])
      
      // Fetch both dataset and Python code in parallel
      const [dataset, pythonCode] = await Promise.all([
        fetchFileFromSupabase(study.dataFile),
        fetchFileFromSupabase(study.codeFile)
      ])

      setLogs(prev => [...prev, 
        "✅ Fetched dataset and verification code",
        `📊 Dataset rows: ${dataset.split('\n').length - 1}`,
        `📝 Code length: ${pythonCode.length} characters`
      ])

      // Execute verification (using Pyodide)
      setLogs(prev => [...prev, "🚀 Starting Python execution..."])
      const verificationResult = await executePythonVerification(dataset, pythonCode)
      
      setResult(verificationResult)
      setLogs(prev => [...prev, 
        `📈 Verification score: ${verificationResult.output.toFixed(3)}`,
        verificationResult.success ? 
          "✅ Verification successful!" : 
          "❌ Verification failed"
      ])

      // Update study status if verification passed
      if (verificationResult.output > 0.5) {
        try {
          await axios.patch(`/api/study/${id}/status`, { status: 'verified' })
          setStudy(prev => prev ? {...prev, status: 'verified'} : null)
          setLogs(prev => [...prev, "🔄 Study status updated to verified"])
        } catch (error) {
          console.error("Failed to update status:", error)
          setLogs(prev => [...prev, "⚠️ Failed to update study status"])
        }
      }

    } catch (error) {
      console.error("Verification failed:", error)
      setLogs(prev => [...prev, 
        "❌ Error during verification", 
        error instanceof Error ? error.message : String(error)
      ])
      setResult({
        output: 0,
        logs: [],
        success: false
      })
    } finally {
      setVerifying(false)
    }
  }

  // Pyodide-based verification execution
  const executePythonVerification = async (dataset: string, pythonCode: string): Promise<VerificationResult> => {
    // Load Pyodide
    // @ts-ignore - Pyodide types
    const pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
    })
    
    await pyodide.loadPackage(['pandas', 'numpy'])
    
    try {
      // Set the dataset in the Python environment
      pyodide.globals.set('dataset_csv', dataset)
      
      // Run the verification code
      await pyodide.runPythonAsync(`
import pandas as pd
from io import StringIO
import numpy as np

# Load dataset
df = pd.read_csv(StringIO(dataset_csv))

${pythonCode}

# The Python code should set a 'verification_score' variable
      `)
      
      // Get the result from Python
      const output = pyodide.globals.get('verification_score')
      
      return {
        output,
        logs: ["Python execution completed successfully"],
        success: output > 0.5
      }
    } catch (error: any) {
      return {
        output: 0,
        logs: [`Python error: ${error.message}`],
        success: false
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
      </div>
    )
  }

  if (!study) {
    return (
      <div className="flex justify-center items-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500 mr-2" />
        <p>Failed to load study data</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">{study.title}</h2>
            <p className="text-gray-600">Run verification process</p>
          </div>
          
          <button
            onClick={runVerification}
            disabled={verifying}
            className={`flex items-center px-4 py-2 rounded-md ${verifying ? 'bg-gray-300' : 'bg-teal-600 hover:bg-teal-700'} text-white`}
          >
            {verifying ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {verifying ? 'Running...' : 'Run Verification'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Dataset</h3>
            <p className="text-sm text-gray-600 truncate">
              {study.dataFile}
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Verification Code</h3>
            <p className="text-sm text-gray-600 truncate">
              {study.codeFile}
            </p>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Current Status</h3>
            <div className="flex items-center">

              <span className="capitalize">{study.status}</span>
            </div>
          </div>
        </div>

        {result && (
          <div className={`rounded-lg border p-4 mb-6 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center mb-2">
              <h3 className="font-medium">Verification Result</h3>
              <span className="ml-auto text-lg font-bold">
                Score: {result.output.toFixed(3)}
              </span>
            </div>
            <p className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.success ? (
                <>This study has been <strong>verified</strong> (score &gt; 0.5)</>
              ) : (
                <>This study <strong>failed verification</strong> (score ≤ 0.5)</>
              )}
            </p>
          </div>
        )}

        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium mb-2">Execution Logs</h3>
          <div className="font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="py-1 border-b border-gray-100 last:border-0">
                  {log.startsWith('✅') ? (
                    <span className="text-green-600">{log}</span>
                  ) : log.startsWith('❌') ? (
                    <span className="text-red-600">{log}</span>
                  ) : log.startsWith('⚠️') ? (
                    <span className="text-yellow-600">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No logs yet. Run verification to see output.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}