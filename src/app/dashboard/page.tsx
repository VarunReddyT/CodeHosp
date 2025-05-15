"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Filter, SortDesc, Loader2 } from 'lucide-react'
import StudyCard from "@/components/StudyCard"
import axios from "axios"
import { toast } from "react-hot-toast"
interface Study {
  id: string
  title: string
  authors: string[]
  institution: string
  date: string
  category: string
  status: "verified" | "issues" | "pending"
  participants: number
  reproductions: number
  issues: []
  tags: string[]
  description: string
}

interface Stats {
  totalStudies: number
  verificationRate: number
  activeResearchers: number
  newStudiesLastMonth: number
  verificationRateChange: number
  institutionsCount: number
}

export default function DashboardPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [stats, setStats] = useState<Stats>({
    totalStudies: 0,
    verificationRate: 0,
    activeResearchers: 0,
    newStudiesLastMonth: 0,
    verificationRateChange: 0,
    institutionsCount: 0
  })

  useEffect(() => {
    fetchStudies()
    // fetchStats()
  }, [currentPage, activeTab, searchQuery])

  const fetchStudies = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/studies')
      if(response.status === 404) {
        setError("No studies found")
        toast.error("No studies found")
        return;
      }
      if(response.status !== 200) {
        toast.error("Failed to load studies" + response.data.message)
        return;
      }
      setStudies(response.data)
      setTotalPages(Math.ceil(response.data.length / 10))
      setError(null)
    } catch (err) {
      console.error("Error fetching studies:", err)
      setError("Failed to load studies. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // const fetchStats = async () => {
  //   try {
  //     const response = await axios.get('/api/stats')
  //     setStats(response.data)
  //   } catch (err) {
  //     console.error("Error fetching stats:", err)
  //     // Don't set error state here to avoid blocking the main content
  //   }
  // }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1) // Reset to first page when changing tabs
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page when searching
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Research Studies</h1>
          <p className="text-gray-600 mt-1">Browse, verify, and contribute to medical research</p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Upload New Study
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="search"
                placeholder="Search studies by title, author, keywords..."
                className="w-full pl-10 h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100">
              <Filter className="h-4 w-4" />
            </button>
            <button type="button" className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100">
              <SortDesc className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Clinical Trials
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Neuroscience
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Cardiology
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Oncology
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Genetics
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Immunology
          </span>
        </div>
      </div>

      {/* Tabs for different study statuses */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button 
              className={`${activeTab === 'all' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange('all')}
            >
              All
            </button>
            <button 
              className={`${activeTab === 'verified' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange('verified')}
            >
              Verified
            </button>
            <button 
              className={`${activeTab === 'issues' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange('issues')}
            >
              Issues
            </button>
            <button 
              className={`${activeTab === 'pending' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange('pending')}
            >
              Pending
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
              <p className="text-red-600">{error}</p>
              <button 
                onClick={fetchStudies}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : studies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No studies found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {studies.map((study) => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Total Studies</h3>
            <p className="text-sm text-gray-500">Platform-wide research</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-gray-900">{stats.totalStudies.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1">+{stats.newStudiesLastMonth} in the last month</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Verification Rate</h3>
            <p className="text-sm text-gray-500">Studies successfully reproduced</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-teal-600">{stats.verificationRate}%</div>
            <p className="text-sm text-gray-500 mt-1">{stats.verificationRateChange >= 0 ? '+' : ''}{stats.verificationRateChange}% from previous quarter</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Active Researchers</h3>
            <p className="text-sm text-gray-500">Contributing scientists</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-gray-900">{stats.activeResearchers.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1">From {stats.institutionsCount} institutions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
