"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import axios from "axios"
import { useParams } from "next/navigation"
import {
  CheckCircle,
  AlertCircle,
  FileCode,
  Users,
  Calendar,
  ExternalLink,
  Play,
  Share2,
  Clock,
  FileCheck,
  FileSearch
} from "lucide-react"

type Status = "verified" | "issues" | "pending" | "partial"

interface VerificationResult {
  status: "match" | "close" | "partial" | "mismatch" | "error"
  output?: string
  expectedOutput?: string
  details: string
}

interface Study {
  title: string
  authors: string[]
  institution: string
  date: string
  category: string
  status: Status
  participants: number
  reproductions: number
  issues: any[]
  tags: string[]
  description: string
  abstract: string
  dataFile: string
  codeFile: string
  methodology: string
  createdAt: string
  updatedAt: string
  verification?: VerificationResult
  verifications: number
}

const statusConfig = {
  verified: {
    icon: <CheckCircle className="h-4 w-4" />,
    text: "Verified",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  partial: {
    icon: <FileSearch className="h-4 w-4" />,
    text: "Partially Verified",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  issues: {
    icon: <AlertCircle className="h-4 w-4" />,
    text: "Issues Found",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    text: "Pending Verification",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
}

const verificationStatusConfig = {
  match: {
    icon: <CheckCircle className="h-4 w-4" />,
    text: "Match",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  close: {
    icon: <CheckCircle className="h-4 w-4" />,
    text: "Close Match",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  partial: {
    icon: <FileSearch className="h-4 w-4" />,
    text: "Partial Match",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  mismatch: {
    icon: <AlertCircle className="h-4 w-4" />,
    text: "Mismatch",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    text: "Error",
    color: "bg-red-100 text-red-800 border-red-200",
  }
}

const tabs = [
  { id: "overview", name: "Overview" },
  { id: "data-code", name: "Data & Code" },
  { id: "verifications", name: "Verifications" },
  { id: "discussion", name: "Discussion" },
]

export default function StudyPage() {
  const params = useParams();
  const id = params.id as string
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`/api/study?id=${id}`)
        setStudy(response.data.study)
      } catch (err) {
        setError("Failed to fetch study data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudy()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p>Loading study data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!study) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p>Study not found</p>
        </div>
      </div>
    )
  }

  // Format date
  const formattedDate = new Date(study.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const status = statusConfig[study.status]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboard" className="hover:text-teal-600">
              Studies
            </Link>
            <span>/</span>
            <span>{study.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{study.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}
            >
              {status.icon}
              <span className="ml-1">{status.text}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-600">Published {formattedDate}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </button>
          <Link
            href={`/study/${id}/run`}
            className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Verification
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-teal-500 text-teal-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === "overview" && (
              <>
                <div className="rounded-lg border bg-white shadow-sm">
                  <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">Abstract</h3>
                    <div className="whitespace-pre-line text-gray-700">{study.abstract}</div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white shadow-sm">
                  <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">Key Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-sm">Participants</span>
                        <div className="flex items-center mt-1">
                          <Users className="h-5 w-5 text-teal-600 mr-2" />
                          <span className="text-2xl font-bold">{study.participants}</span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-gray-500 text-sm">Reproductions</span>
                        <div className="flex items-center mt-1">
                          <FileCode className="h-5 w-5 text-teal-600 mr-2" />
                          <span className="text-2xl font-bold">{study.reproductions}</span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-gray-500 text-sm">Issues Reported</span>
                        <div className="flex items-center mt-1">
                          <AlertCircle className="h-5 w-5 text-teal-600 mr-2" />
                          <span className="text-2xl font-bold">{study.issues.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white shadow-sm">
                  <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">Methodology</h3>
                    <div className="whitespace-pre-line text-gray-700">{study.methodology}</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "data-code" && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">Data & Code Files</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileCode className="h-5 w-5 text-teal-600" />
                        <div>
                          <h4 className="font-medium">Data File</h4>
                          <p className="text-sm text-gray-500">Contains all the raw data used in the study</p>
                        </div>
                      </div>
                      <a
                        href={study.dataFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1 text-sm font-medium shadow-sm hover:bg-gray-100"
                      >
                        Download
                      </a>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileCode className="h-5 w-5 text-teal-600" />
                        <div>
                          <h4 className="font-medium">Code Files</h4>
                          <p className="text-sm text-gray-500">All analysis scripts and code used</p>
                        </div>
                      </div>
                      <a
                        href={study.codeFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1 text-sm font-medium shadow-sm hover:bg-gray-100"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "verifications" && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">Verification Results</h3>
                  
                  {study.verification ? (
                    <div className={`p-4 rounded-lg border ${verificationStatusConfig[study.verification.status].color}`}>
                      <div className="flex items-center gap-2">
                        {verificationStatusConfig[study.verification.status].icon}
                        <h4 className="font-medium">
                          {verificationStatusConfig[study.verification.status].text}
                        </h4>
                      </div>
                      <p className="mt-2">{study.verification.details}</p>
                      {study.verification.expectedOutput && (
                        <div className="mt-3">
                          <p className="text-sm font-medium">Expected Output:</p>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                            {study.verification.expectedOutput}
                          </pre>
                        </div>
                      )}
                      {study.verification.output && (
                        <div className="mt-3">
                          <p className="text-sm font-medium">Actual Output:</p>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                            {study.verification.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-700">No verification results available yet.</p>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Verification History</h3>
                    <p className="text-gray-700">This study has been verified {study.verifications} times.</p>
                  </div>

                  {study.issues.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-red-600 mb-2">Reported Issues ({study.issues.length})</h4>
                      <div className="space-y-3">
                        {study.issues.map((issue, index) => (
                          <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">{issue.title || `Issue ${index + 1}`}</span>
                            </div>
                            <p className="mt-1 text-sm text-red-600">{issue.description || "No description provided"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "discussion" && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">Discussion</h3>
                  <p className="text-gray-700">Discussion about this study will appear here.</p>
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500 text-center">Discussion feature coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-medium">Authors</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              {study.authors.map((author, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="font-medium text-gray-600">
                      {author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{author}</h3>
                    <p className="text-sm text-gray-600">{study.institution}</p>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-teal-50 text-teal-700 border-teal-200">
                        Verified Researcher
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-medium">Study Details</h3>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Publication Date</h3>
                <p className="text-gray-900 flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {formattedDate}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Institution</h3>
                <p className="text-gray-900 flex items-center gap-2 mt-1">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                  {study.institution}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Category</h3>
                <p className="text-gray-900 mt-1 capitalize">{study.category}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {study.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}