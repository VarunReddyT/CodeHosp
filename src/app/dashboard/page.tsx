"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, Search } from 'lucide-react'
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
  status: "verified" | "issues" | "pending" | "partial"
  participants: number
  reproductions: number
  issues: string[]
  tags: string[]
  methodology: string
}

const ITEMS_PER_PAGE = 10

export default function DashboardPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [filteredStudies, setFilteredStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOption, setSortOption] = useState("newest")

  useEffect(() => {
    fetchStudies()
  }, [])

  useEffect(() => {
    filterAndSortStudies()
  }, [studies, searchTerm, statusFilter, sortOption])

  const fetchStudies = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/studies', {
        validateStatus: () => true,
      })
      
      if(response.status === 404) {
        setError("No studies found")
        return
      }
      
      if(response.status !== 200) {
        toast.error("Failed to load studies: " + (response.data.message || "Unknown error"))
        return
      }
      
      // Handle the new API response structure
      const responseData = response.data.data || response.data
      const studiesArray = responseData.studies || responseData || []
      
      setStudies(Array.isArray(studiesArray) ? studiesArray : [])
      setError(null)
    } catch (err) {
      console.error("Error fetching studies:", err)
      setError("Failed to load studies. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortStudies = () => {
    if (!Array.isArray(studies)) {
      setFilteredStudies([])
      return
    }
    
    let result = [...studies]
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(study => 
        study.title.toLowerCase().includes(term) ||
        study.authors.some(author => author.toLowerCase().includes(term)) ||
        study.methodology.toLowerCase().includes(term) ||
        study.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(study => study.status === statusFilter)
    }
    
    // Sorting
    switch (sortOption) {
      case "newest":
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        break
      case "most-reproduced":
        result.sort((a, b) => b.reproductions - a.reproductions)
        break
      case "most-participants":
        result.sort((a, b) => b.participants - a.participants)
        break
    }
    
    setFilteredStudies(result)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const totalPages = Math.ceil(filteredStudies.length / ITEMS_PER_PAGE)
  const paginatedStudies = filteredStudies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

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

      {/* Search and Filter Bar */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search studies..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="partial">Partially Verified</option>
            <option value="pending">Pending</option>
            <option value="issues">Issues</option>
          </select>
        </div>
        
        {/* Sort Options */}
        <div className="relative">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most-reproduced">Most Reproduced</option>
            <option value="most-participants">Most Participants</option>
          </select>
        </div>
      </div>

      <div className="mb-8">
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
        ) : filteredStudies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {studies.length === 0 
                ? "No studies available yet." 
                : "No studies match your search criteria."}
            </p>
            {studies.length === 0 && (
              <Link
                href="/upload"
                className="mt-4 inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Upload First Study
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6">
              {paginatedStudies.map((study) => (
                <StudyCard key={study.id} study={study} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}