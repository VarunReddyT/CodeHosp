"use client"
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader2, Play, ChevronRight, FileText, FileCode2, FileCheck, FileSearch } from 'lucide-react'

type Status = "verified" | "issues" | "pending" | "partial"
interface Study {
  id: string
  title: string
  authors: string[]
  institution: string
  date: string
  status: Status
  participants: number
  reproductions: number
  issues: number
  tags: string[]
  description: string
  dataFile: string
  codeFile: string
  expectedOutput: string
}

interface VerificationStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message: string
  icon: React.ReactNode
}

export default function RunVerification() {
  const { id } = useParams()
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      name: 'Download Files',
      status: 'pending',
      message: 'Waiting to download study files',
      icon: <FileText className="h-5 w-5" />
    },
    {
      name: 'Prepare Environment',
      status: 'pending',
      message: 'Will setup verification environment',
      icon: <FileCode2 className="h-5 w-5" />
    },
    {
      name: 'Execute Code',
      status: 'pending',
      message: 'Ready to run verification code',
      icon: <Play className="h-5 w-5" />
    },
    {
      name: 'Verify Results',
      status: 'pending',
      message: 'Will compare with expected output',
      icon: <FileCheck className="h-5 w-5" />
    }
  ])
  const [verificationResult, setVerificationResult] = useState<{
    status: 'match' | 'mismatch' | 'partial'
    output: string
    details: string
  } | null>(null)

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const response = await axios.get(`/api/study?id=${id}`)
        setStudy(response.data.study)
      } catch (error) {
        console.error("Failed to fetch study:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStudy()
  }, [id])

  const updateStep = (index: number, updates: Partial<VerificationStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ))
  }

const runVerification = async () => {
  if (!study) return;

  setVerifying(true);
  setVerificationResult(null);
  setProgress(0);

  try {
    // Step 1: Start Verification
    updateStep(0, {
      status: 'running',
      message: 'Running verification process...'
    });

    const response = await axios.post('/api/verify-study', {
      studyId: id,
      dataFile: study.dataFile,
      codeFile: study.codeFile,
      expectedOutput: study.expectedOutput
    });

    const result = response.data;

    updateStep(0, {
      status: 'completed',
      message: 'Verification completed'
    });

    setProgress(100);
    setVerificationResult(result);

    // Step 2: Evaluate Result
    const finalMessage = result.status === 'match'
      ? 'Results match expected output!'
      : result.status === 'partial'
      ? 'Partial match found'
      : 'Mismatch detected';

    updateStep(1, {
      status: result.status === 'mismatch' ? 'failed' : 'completed',
      message: finalMessage
    });

    // Update study status if applicable
    if (result.status === 'match' || result.status === 'partial') {
      const newStatus = result.status === 'match' ? 'verified' : 'partial';
      await axios.patch(`/api/study/${id}/status`, { status: newStatus });
      setStudy(prev => prev ? { ...prev, status: newStatus } : null);
    }

  } catch (error) {
    console.error("Verification failed:", error);
    const failedStepIndex = steps.findIndex(step => step.status === 'running');
    if (failedStepIndex >= 0) {
      updateStep(failedStepIndex, {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Verification failed'
      });
    }
  } finally {
    setVerifying(false);
  }
};


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
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">{study.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {study.authors[0]} · {study.institution}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {progress}% complete
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-teal-600 h-2.5 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 pb-4">
          <p className="text-gray-700 mb-6">{study.description}</p>

          <div className="space-y-4 mb-6">
            <h4 className="font-medium">Verification Steps</h4>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                  <div className={`p-1 rounded-full ${
                    step.status === 'completed' ? 'bg-green-100 text-green-600' :
                    step.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                    step.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {step.status === 'running' ? 
                      <Loader2 className="h-5 w-5 animate-spin" /> : 
                      step.icon
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h5 className="font-medium">{step.name}</h5>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        step.status === 'completed' ? 'bg-green-100 text-green-800' :
                        step.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        step.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {verificationResult && (
            <div className={`rounded-lg border p-4 mb-6 ${
              verificationResult.status === 'match' ? 'bg-green-50 border-green-200' :
              verificationResult.status === 'partial' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {verificationResult.status === 'match' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : verificationResult.status === 'partial' ? (
                  <FileSearch className="h-5 w-5 text-yellow-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <h5 className="font-medium">
                    {verificationResult.status === 'match' ? 'Verification Successful' :
                     verificationResult.status === 'partial' ? 'Partial Verification' :
                     'Verification Failed'}
                  </h5>
                  <div className="text-sm mt-1 space-y-1">
                    <p>Expected: {study.expectedOutput}</p>
                    <p>Actual: {verificationResult.output}</p>
                    {verificationResult.details && (
                      <p className="mt-2">{verificationResult.details}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t pt-4 mt-6">
            <Link
              href={`/study/${id}`}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
            >
              Back to Study
            </Link>
            <button
              onClick={runVerification}
              disabled={verifying}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white ${
                verifying ? 'bg-teal-700' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Verification...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Verification
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}