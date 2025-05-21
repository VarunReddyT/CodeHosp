"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import axios from "axios"
import {
  CheckCircle,
  Database,
  Play,
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileSearch,
  XCircle,
  Edit,
  Info
} from "lucide-react"
import Editor from "@monaco-editor/react"
import { auth } from "@/lib/firebase"
import { toast } from "react-hot-toast"

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
  const user = auth.currentUser
  const [activeTab, setActiveTab] = useState<"editor" | "terminal" | "results" | "modify">("editor")
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [codeContent, setCodeContent] = useState("")
  const [modifiedCode, setModifiedCode] = useState("")
  const [studyData, setStudyData] = useState<StudyData | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [modificationNotes, setModificationNotes] = useState("")

  const [steps, setSteps] = useState([
    { number: 1, title: "Load Data", description: "Load and inspect the study data", status: "completed" as VerificationStepStatus },
    { number: 2, title: "Run Analysis", description: "Execute the analysis code", status: "in-progress" as VerificationStepStatus },
    { number: 3, title: "Compare Results", description: "Compare your results with the original study", status: "pending" as VerificationStepStatus },
    { number: 4, title: "Submit Modifications (Optional)", description: "Submit your code modifications if needed", status: "pending" as VerificationStepStatus },
  ])

  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`/api/study?id=${id}`)
        const data = response.data.study
        setStudyData(data)

        const codeResponse = await fetch(data.codeFile)
        const code = await codeResponse.text()
        setCodeContent(code)
        setModifiedCode(code)

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
      const response = await axios.post('/api/verify-study', {
        studyId: id,
        codeFile: studyData.codeFile,
        dataFile: studyData.dataFile,
        expectedOutput: studyData.expectedOutput
      })

      setVerificationResult(response.data)

      const updatedSteps = [...steps]
      updatedSteps[1].status = "completed"
      updatedSteps[2].status = "in-progress"
      setSteps(updatedSteps)
      setActiveTab("terminal")

      setTimeout(() => {
        setActiveTab("results")
        const finalSteps = [...updatedSteps]
        finalSteps[2].status = "completed"
        finalSteps[3].status = "in-progress"
        setSteps(finalSteps)
      }, 2000)

    } catch (error) {
      setVerificationResult({
        status: "error",
        details: error instanceof Error ? error.message : "Verification failed"
      })
      setActiveTab("terminal")
    } finally {
      setIsRunning(false)
    }
  }

  const handleSaveModification = async () => {
    if (!user || !studyData) return

    try {
      await axios.post('/api/modify', {
        studyId: id,
        userId: user.uid,
        originalCode: codeContent,
        modifiedCode: modifiedCode,
        notes: modificationNotes
      })
      setShowSaveModal(false)
      toast.success("Modifications saved successfully")
    } catch (error) {
      console.error("Failed to save modifications:", error)
      toast.error("Failed to save modifications")
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
          <p className="text-gray-600 mt-1">Verify the results of &quot;{studyData.title}&quot;</p>
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
            </div>
          </div>
        </div>

        {/* Main Content - Verification Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Verification Workspace</h3>
                {/* Only show Run Verification button when in editor tab */}
                {activeTab === "editor" && (
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
                        Run Verification
                      </>
                    )}
                  </button>
                )}
              </div>
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
                  <button
                    onClick={() => setActiveTab("modify")}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "modify"
                        ? "border-teal-500 text-teal-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Modify (Optional)
                  </button>
                </nav>
              </div>

              <div className="mt-4 space-y-4">
                {activeTab === "editor" && (
                  <div className="rounded-md overflow-hidden border">
                    <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b">
                      <div className="text-sm font-mono">original_code.py</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {codeContent.split('\n').length} lines
                        </span>
                      </div>
                    </div>
                    <Editor
                      height="500px"
                      language="python"
                      theme="vs-dark"
                      value={codeContent}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        automaticLayout: true,
                      }}
                    />
                  </div>
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
                      <div className="text-gray-500">Run the verification to see output here</div>
                    )}
                  </div>
                )}

                {activeTab === "results" && (
                  <div className="space-y-6">
                    {verificationResult ? (
                      <>
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

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setActiveTab("modify")}
                            className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modify Code (Optional)
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 rounded-lg border bg-gray-50 text-center text-gray-500">
                        Run the verification to see results
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "modify" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg text-blue-800">
                      <Info className="h-5 w-5" />
                      <p className="text-sm">Modifications are optional. Only make changes if you&apos;ve identified issues with the original code.</p>
                    </div>
                    
                    <div className="rounded-md overflow-hidden border">
                      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b">
                        <div className="text-sm font-mono">modified_code.py</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {modifiedCode.split('\n').length} lines
                          </span>
                        </div>
                      </div>
                      <Editor
                        height="500px"
                        language="python"
                        theme="vs-dark"
                        value={modifiedCode}
                        onChange={(value) => setModifiedCode(value || '')}
                        options={{
                          readOnly: false,
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on',
                          automaticLayout: true,
                        }}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowSaveModal(true)}
                        disabled={modifiedCode === codeContent}
                        className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Modifications (Optional)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Modifications Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Save Your Modifications (Optional)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes about your changes (Optional)
                </label>
                <textarea
                  value={modificationNotes}
                  onChange={(e) => setModificationNotes(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Describe what you changed and why..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModification}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}