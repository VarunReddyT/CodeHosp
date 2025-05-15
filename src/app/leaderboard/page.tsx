import Link from "next/link"
import { Search, TrendingUp, Calendar, Filter, Trophy } from "lucide-react"

export default function LeaderboardPage() {
  // Mock data for researchers
  const researchers = [
    {
      id: "1",
      name: "Dr. Emily Chen",
      institution: "Stanford University",
      points: 3850,
      rank: 1,
      verifications: 42,
      issues: 15,
      improvements: 23,
      badges: ["Top Verifier", "Code Expert", "Statistical Guru"],
      avatar: "EC",
    },
    {
      id: "2",
      name: "Dr. Michael Johnson",
      institution: "University of Toronto",
      points: 3620,
      rank: 2,
      verifications: 38,
      issues: 12,
      improvements: 19,
      badges: ["Top Contributor", "Data Specialist"],
      avatar: "MJ",
    },
    // More researchers...
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PeerPoints Leaderboard</h1>
          <p className="text-gray-600 mt-1">Recognizing top contributors to scientific reproducibility</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="search"
                placeholder="Search researchers or institutions..."
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
            Top Verifiers
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Issue Hunters
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Code Contributors
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Rising Stars
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 cursor-pointer">
            Methodology Experts
          </span>
        </div>
      </div>

      {/* Tabs for different leaderboards */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-teal-500 text-teal-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Researchers
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Institutions
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
                      Researcher
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Institution
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      PeerPoints
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {researchers.map((researcher) => (
                    <tr key={researcher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {researcher.rank <= 3 ? (
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                researcher.rank === 1
                                  ? "bg-yellow-100 text-yellow-600"
                                  : researcher.rank === 2
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-amber-100 text-amber-600"
                              }`}
                            >
                              <Trophy className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="text-gray-900 font-medium w-8 text-center">{researcher.rank}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="font-medium text-gray-600">{researcher.avatar}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              <Link href={`/profile/${researcher.id}`} className="hover:text-teal-600">
                                {researcher.name}
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{researcher.institution}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-teal-600">{researcher.points.toLocaleString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
              Showing 2 of 1,892 researchers
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
            <div className="text-3xl font-bold text-gray-900">1,245,780</div>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              +12,450 in the last month
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Verifications</h3>
            <p className="text-sm text-gray-500">Studies independently verified</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-teal-600">8,742</div>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              +342 in the last month
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <h3 className="text-lg font-medium">Issues Identified</h3>
            <p className="text-sm text-gray-500">Problems found and fixed</p>
          </div>
          <div className="p-6 pt-0">
            <div className="text-3xl font-bold text-gray-900">3,156</div>
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              +128 in the last month
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
