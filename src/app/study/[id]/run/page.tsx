"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import axios from "axios"
import {
  CheckCircle,
  Database,
  Play,
  Terminal,
  Code,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileSearch,
  XCircle
} from "lucide-react"

type VerificationStepStatus = "completed" | "in-progress" | "pending"
type VerificationStatus = "match" | "close" | "partial" | "mismatch" | "error"

interface VerificationStepProps {
  number: number
  title: string
  description: string
  status: VerificationStepStatus
}

interface VerificationResult {
  status: VerificationStatus
  output?: string
  expectedOutput?: string
  details: string
}

interface StudyData {
  title: string
  codeFile: string
  dataFile: string
  expectedOutput: string
  methodology: string
  // Add other study fields as needed
}

const verificationStatusConfig = {
  match: {
    icon: <CheckCircle className="h-5 w-5" />,
    text: "Match",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  close: {
    icon: <CheckCircle className="h-5 w-5" />,
    text: "Close Match",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  partial: {
    icon: <FileSearch className="h-5 w-5" />,
    text: "Partial Match",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  mismatch: {
    icon: <XCircle className="h-5 w-5" />,
    text: "Mismatch",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    text: "Error",
    color: "bg-red-100 text-red-800 border-red-200",
  }
}

function VerificationStep({ number, title, description, status }: VerificationStepProps) {
  return (
    <div className="flex gap-4">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          status === "completed"
            ? "bg-green-100 text-green-600"
            : status === "in-progress"
              ? "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {status === "completed" ? <CheckCircle className="h-5 w-5" /> : <span>{number}</span>}
      </div>
      <div>
        <h3
          className={`font-medium ${
            status === "completed" ? "text-green-600" : status === "in-progress" ? "text-blue-600" : "text-gray-400"
          }`}
        >
          {title}
        </h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

export default function RunStudyPage() {
  const params = useParams()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState<"editor" | "terminal" | "results">("editor")
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [codeContent, setCodeContent] = useState("")
  const [studyData, setStudyData] = useState<StudyData | null>(null)
  const [userDataFile, setUserDataFile] = useState<File | null>(null)

  const [steps, setSteps] = useState([
    { number: 1, title: "Load Data", description: "Load and inspect the study data", status: "completed" as VerificationStepStatus },
    { number: 2, title: "Run Analysis", description: "Execute the analysis code", status: "in-progress" as VerificationStepStatus },
    { number: 3, title: "Compare Results", description: "Compare your results with the original study", status: "pending" as VerificationStepStatus },
    { number: 4, title: "Submit Verification", description: "Submit your verification report", status: "pending" as VerificationStepStatus },
  ])

  // Fetch study data on component mount
  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`/api/study?id=${id}`)
        const data = response.data.study
        setStudyData(data)
        
        // Fetch the original code file
        const codeResponse = await fetch(data.codeFile)
        const code = await codeResponse.text()
        setCodeContent(code)
        
      } catch (error) {
        console.error("Failed to fetch study data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudyData()
  }, [id])

  const handleRunAnalysis = async () => {
    if (!studyData) return
    
    setIsRunning(true)
    try {
      const formData = new FormData()
      formData.append('studyId', id)
      formData.append('code', codeContent)
      
      // Use user's data file if provided, otherwise use original
      if (userDataFile) {
        formData.append('dataFile', userDataFile)
      } else {
        // Fetch original data file and add to form data
        const dataResponse = await fetch(studyData.dataFile)
        const dataBlob = await dataResponse.blob()
        const dataFile = new File([dataBlob], 'original_data.csv', { type: 'text/csv' })
        formData.append('dataFile', dataFile)
      }

      const response = await axios.post('/api/verify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setVerificationResult(response.data)
      
      // Update steps
      const updatedSteps = [...steps]
      updatedSteps[1].status = "completed"
      updatedSteps[2].status = "in-progress"
      setSteps(updatedSteps)

      setActiveTab("results")
    } catch (error) {
      setVerificationResult({
        status: "error",
        details: error instanceof Error ? error.message : "Verification failed"
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleDataFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUserDataFile(file)
    }
  }

  const progress = steps.filter(step => step.status === "completed").length / steps.length * 100

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!studyData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">Failed to load study data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link href={`/study/${id}`} className="flex items-center hover:text-teal-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Study
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Run Verification</h1>
          <p className="text-gray-600 mt-1">Verify the results of "{studyData.title}"</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100">
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </button>
          <button 
            onClick={handleRunAnalysis}
            disabled={isRunning}
            className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Verification Steps */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Verification Steps</h3>
              <p className="text-sm text-gray-500">Follow these steps to verify the study</p>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div className="space-y-6">
                {steps.map((step) => (
                  <VerificationStep
                    key={step.number}
                    number={step.number}
                    title={step.title}
                    description={step.description}
                    status={step.status}
                  />
                ))}
              </div>
            </div>
            <div className="bg-gray-50 border-t p-6">
              <div className="w-full">
                <div className="flex justify-between text-sm mb-2">
                  <span>Verification Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Study Data</h3>
              <p className="text-sm text-gray-500">Upload your own dataset or use original</p>
            </div>
            <div className="p-6 pt-0">
              <div className="mb-4">
                <h4 className="font-medium mb-2">Original Dataset:</h4>
                <a 
                  href={studyData.dataFile} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-teal-600 hover:text-teal-800"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Download Original Data
                </a>
              </div>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none">
                      <span>Upload your dataset</span>
                      <input 
                        type="file" 
                        className="sr-only" 
                        onChange={handleDataFileChange}
                        accept=".csv,.xlsx,.xls,.tsv,.json"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV, Excel, JSON files (max 5MB)</p>
                  {userDataFile && (
                    <p className="text-sm text-gray-900 mt-2">
                      Selected: {userDataFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Verification Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Verification Workspace</h3>
              <p className="text-sm text-gray-500">
                {activeTab === "editor" ? "Step 2: Run Analysis" : 
                 activeTab === "terminal" ? "Execution Output" : 
                 "Step 3: Compare Results"}
              </p>
            </div>
            <div className="p-6 pt-0">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab("editor")}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "editor"
                        ? "border-teal-500 text-teal-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Code Editor
                  </button>
                  <button
                    onClick={() => setActiveTab("terminal")}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "terminal"
                        ? "border-teal-500 text-teal-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Terminal
                  </button>
                  <button
                    onClick={() => setActiveTab("results")}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "results"
                        ? "border-teal-500 text-teal-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Results
                  </button>
                </nav>
              </div>

              <div className="mt-4 space-y-4">
                {activeTab === "editor" && (
                  <>
                    <div className="relative">
                      <textarea
                        value={codeContent}
                        onChange={(e) => setCodeContent(e.target.value)}
                        className="w-full h-96 font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-md resize-none"
                        spellCheck="false"
                      />
                      <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                        {codeContent.split('\n').length} lines
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "terminal" && (
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
                    {isRunning ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Running analysis...</span>
                      </div>
                    ) : verificationResult ? (
                      <>
                        <div className="text-green-400">$ python analysis.py</div>
                        <div className="mt-2 whitespace-pre-wrap">{verificationResult.output}</div>
                      </>
                    ) : (
                      <div className="text-gray-500">Run the analysis to see output here</div>
                    )}
                  </div>
                )}

                {activeTab === "results" && (
                  <div className="space-y-6">
                    {verificationResult ? (
                      <div className={`p-4 rounded-lg border ${verificationStatusConfig[verificationResult.status].color}`}>
                        <div className="flex items-center gap-2">
                          {verificationStatusConfig[verificationResult.status].icon}
                          <h3 className="font-medium">
                            {verificationStatusConfig[verificationResult.status].text}
                          </h3>
                        </div>
                        <p className="mt-2">{verificationResult.details}</p>
                        
                        {verificationResult.expectedOutput && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium">Expected Output:</h4>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                              {verificationResult.expectedOutput}
                            </pre>
                          </div>
                        )}

                        {verificationResult.output && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium">Actual Output:</h4>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                              {verificationResult.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border bg-gray-50 text-center text-gray-500">
                        Run the analysis to see verification results
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const updatedSteps = [...steps]
                          updatedSteps[2].status = "completed"
                          updatedSteps[3].status = "in-progress"
                          setSteps(updatedSteps)
                        }}
                        disabled={!verificationResult}
                        className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        Continue to Submission
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}