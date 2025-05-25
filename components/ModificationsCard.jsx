import Link from "next/link"
import { CheckCircle, AlertCircle, Clock, FileCode, Users } from "lucide-react"

export default function ModificationsCard({ study, url }) {
  const statusConfig = {
    verified: {
      icon: <CheckCircle className="h-4 w-4" />,
      text: "Verified",
      color: "bg-green-100 text-green-800 border-green-200",
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
    partial : {
      icon: <CheckCircle className="h-4 w-4" />,
      text: "Partially Verified",
      color: "bg-blue-100 text-blue-800 border-blue-200",
    },
  }

  const status = statusConfig[study.status]

  // Format date
  const formattedDate = new Date(study.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold hover:text-teal-600 transition-colors">
              <Link href={`/study/${study.id}`}>{study.title}</Link>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {study.authors[0]} · {study.institution} · Published {formattedDate}
            </p>
          </div>
          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
            {status.icon}
            <span className="ml-1">{status.text}</span>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0 pb-4">
        <p className="text-gray-700 mb-4">{study.methodology}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {study.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-50"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">{study.participants} Participants</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">{study.reproductions} Reproductions</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500" />
            <span className="text-gray-700">{study.issues.length} Issues</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between border-t pt-4 p-6 bg-gray-50">
        <Link
          href={url}
          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
