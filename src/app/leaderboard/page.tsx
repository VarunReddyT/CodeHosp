"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, TrendingUp, Calendar, Filter, Loader2 } from "lucide-react"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import axios from "axios"
import Cookies from "js-cookie"

interface LeaderboardUser {
  id: string
  points: number,
  displayName: string,
  contributions?: number
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[]
  currentUserRank: number
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user)
      fetchLeaderboard() // Refresh leaderboard when auth state changes
    })

    // Initial fetch
    fetchLeaderboard()

    return () => unsubscribe()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Get authentication token if user is logged in
      const auth = getAuth()
      const user = auth.currentUser
      let headers = {}
      
      if (user) {
        try {
          const token = await user.getIdToken()
          headers = {
            'Authorization': `Bearer ${token}`,
            'Cookie': `token=${Cookies.get('token') || token}`
          }
        } catch (authError) {
          console.log("Auth token not available, fetching public leaderboard")
        }
      }
      
      const response = await axios.get("/api/leaderboard", { headers })
      setData(response.data.data) // Backend now returns data in data property
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }
  const getDisplayName = (userId: string) => {
    return `${userId.slice(0, 15)}`
  }
  const getAvatarInitials = (userName: string) => {
    return userName.slice(0, 2).toUpperCase()
  }

  const filteredLeaderboard =
    data?.leaderboard.filter(
      (user) =>
        getDisplayName(user.displayName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || []

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading leaderboard...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <button
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const totalPoints = data?.leaderboard.reduce((sum, user) => sum + user.points, 0) || 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PeerPoints Leaderboard</h1>
          <p className="text-gray-600 mt-1">Recognizing top contributors to scientific reproducibility</p>
          {data?.currentUserRank !== undefined && data?.currentUserRank !== -1 && (
            <span className="text-sm text-teal-600 mt-1">
              Your current rank: #{data.currentUserRank}
              {data.currentUserRank === 0 && " (Not in top 100)"}
            </span>
          )}
          {data?.currentUserRank === -1 && (
            <span className="text-sm text-gray-500 mt-1">Login to see your rank</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="search"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100">
              <Filter className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100">
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Top Contributors
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Rising Stars
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Active Users
          </span>
        </div>
      </div>

      {/* Tabs for different leaderboards */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-teal-500 text-teal-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Users
            </button>
          </nav>
        </div>

        <div className="mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Rank
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      PeerPoints
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      No. of Contributions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeaderboard.length > 0 ? (
                    filteredLeaderboard.map((user) => {
                      const rank = data!.leaderboard.findIndex((u) => u.id === user.id) + 1
                      const auth = getAuth()
                      const currentUserId = auth.currentUser?.uid
                      const isCurrentUser = currentUserId === user.id
                      
                      return (
                        <tr 
                          key={user.id} 
                          className={`hover:bg-gray-50 ${isCurrentUser ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {rank <= 3 ? (
                                <div
                                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                    rank === 1
                                      ? "bg-yellow-100 text-yellow-600"
                                      : rank === 2
                                        ? "bg-gray-100 text-gray-600"
                                        : "bg-amber-100 text-amber-600"
                                  }`}
                                >
                                  <span className="font-medium">{rank}</span>
                                </div>
                              ) : (
                                <div className="text-gray-900 font-medium w-8 text-center">{rank}</div>
                              )}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-teal-600 font-medium">You</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full ${isCurrentUser ? 'bg-teal-200' : 'bg-gray-200'} flex items-center justify-center`}>
                                <span className={`font-medium ${isCurrentUser ? 'text-teal-700' : 'text-gray-600'}`}>
                                  {getAvatarInitials(user.displayName)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className={`text-sm font-medium ${isCurrentUser ? 'text-teal-700' : 'text-gray-900'}`}>
                                  <Link href={`/profile/${user.id}`} className="hover:text-teal-600">
                                    {getDisplayName(user.displayName)}
                                  </Link> 
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${isCurrentUser ? 'text-teal-700' : 'text-teal-600'}`}>
                              {user.points.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{user.contributions || 0}</div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm ? "No users found matching your search." : "No users found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
              Showing {filteredLeaderboard.length} of {data?.leaderboard.length || 0} users
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Total PeerPoints</h3>
            <p className="text-sm text-gray-500">Platform-wide contributions</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-gray-900">{totalPoints.toLocaleString()}</div>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              Across all users
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Active Users</h3>
            <p className="text-sm text-gray-500">Users with points</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-teal-600">{data?.leaderboard.length || 0}</div>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              Contributing to the platform
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Average Points</h3>
            <p className="text-sm text-gray-500">Per active user</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-gray-900">
              {data?.leaderboard.length ? Math.round(totalPoints / data.leaderboard.length).toLocaleString() : 0}
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              Platform engagement
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
