"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Clock, FileText, ChevronDown, ChevronUp, CheckCircle, XCircle, Check } from "lucide-react"
import axios from "axios"
import { toast } from "react-hot-toast"

interface Modification {
  id: string
  timestamp: string
  userId: string
  userName: string
  originalCode: string
  modifiedCode: string
  notes: string
  studyId: string
  verificationStatus: 'verified' | 'pending' | 'rejected'
}

export default function StudyModificationsPage() {
  const { studyid } = useParams()
  const router = useRouter()
  const [modifications, setModifications] = useState<Modification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModifications = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`/api/modify`, {
          params: { studyId: studyid },
          validateStatus: () => true,
        })
        if (response.status === 404) {
          setError("No modifications found for this study")
          return
        }
        if (response.status !== 200) {
          toast.error("Failed to load modifications: " + (response.data.message || "Unknown error"))
          return
        }
        setModifications(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchModifications()
  }, [studyid])

  const toggleExpand = (modId: string) => {
    setExpandedId(expandedId === modId ? null : modId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-amber-500" />
    }
  }

  const handleApprove = async (modId: string) => {
    try {
      const response = await axios.put(`/api/modification-result`, {
        studyId: studyid,
        status: true
      })
      if (response.status === 200) {
        toast.success("Modification approved")
        setModifications(modifications.map(mod => 
          mod.id === modId ? {...mod, verificationStatus: 'verified'} : mod
        ))
      }
    } catch (error) {
        console.error("Error approving modification:", error)
      toast.error("Failed to approve modification")
    }
  }

  const handleReject = async (modId: string) => {
    try {
      const response = await axios.put(`/api/modification-result`, {
        studyId: studyid,
        status: false
      })
      if (response.status === 200) {
        toast.success("Modification rejected")
        setModifications(modifications.map(mod => 
          mod.id === modId ? {...mod, verificationStatus: 'rejected'} : mod
        ))
      }
    } catch (error) {
        console.error("Error rejecting modification:", error)
      toast.error("Failed to reject modification")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          href={`/study/${studyid}`} 
          className="flex items-center text-teal-600 hover:text-teal-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span className="font-medium">Back to Study</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Study Modifications</h1>
        <div className="w-5"></div> {/* Spacer for alignment */}
      </div>

      {/* Main content */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Loading state */}
        {loading && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
              Loading modifications...
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-6 bg-red-50 border-l-4 border-red-500">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && modifications.length === 0 && (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <FileText className="h-10 w-10 text-gray-400" />
              <p className="text-gray-600">No modifications found for this study</p>
              <button 
                onClick={() => router.push(`/study/${studyid}/modify`)}
                className="mt-4 px-4 py-2 border border-teal-600 text-teal-600 rounded-md hover:bg-teal-50 transition-colors"
              >
                Submit First Modification
              </button>
            </div>
          </div>
        )}

        {/* Modifications list */}
        {!loading && modifications.length > 0 && (
          <ul className="divide-y divide-gray-200">
            {modifications.map((mod) => (
              <li key={mod.id} className="hover:bg-gray-50 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-full ${
                        mod.verificationStatus === 'verified' ? 'bg-green-100 text-green-600' :
                        mod.verificationStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {getStatusIcon(mod.verificationStatus)}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <h3 className="font-medium text-gray-900">
                            {mod.userName || 'Anonymous User'}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {new Date(mod.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {mod.notes && (
                          <p className="mt-2 text-sm text-gray-600">
                            {mod.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 pl-16 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => toggleExpand(mod.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {expandedId === mod.id ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Changes
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Changes
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleApprove(mod.id)}
                      disabled={mod.verificationStatus === 'verified'}
                      className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md ${
                        mod.verificationStatus === 'verified'
                          ? 'bg-green-100 text-green-700 cursor-not-allowed'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>

                    <button
                      onClick={() => handleReject(mod.id)}
                      disabled={mod.verificationStatus === 'rejected'}
                      className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md ${
                        mod.verificationStatus === 'rejected'
                          ? 'bg-red-100 text-red-700 cursor-not-allowed'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>

                  {/* Expanded content */}
                  {expandedId === mod.id && (
                    <div className="mt-6 pl-16">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                              Original
                            </span>
                          </h4>
                          <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                            {mod.originalCode}
                          </pre>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              Modified
                            </span>
                          </h4>
                          <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                            {mod.modifiedCode}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}