"use client"

import { useParams} from "react-router-dom"
import Link from "next/link"
import { CheckCircle, AlertCircle, FileCode, Users, Calendar, ExternalLink, Play, Share2, Clock } from "lucide-react"

type Status = "verified" | "issues" | "pending"

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
    }


// Mock study data
const study = {
  id: "1",
  title: "Effects of Vitamin D on Depression in Adults",
  author: "Dr. James Smith",
  authorId: "smith-j",
  institution: "Harvard Medical School",
  date: "2023-04-15",
  status: "verified",
  participants: 1000,
  reproductions: 12,
  issues: 2,
  tags: ["Vitamin D", "Depression", "Clinical Trial"],
  description:
    "A study examining the relationship between vitamin D supplementation and depression symptoms in adults aged 25-65.",
  abstract:
    "Background: Vitamin D deficiency has been associated with depression, but the evidence for using vitamin D supplementation to treat depression is inconsistent. This study aimed to determine whether vitamin D supplementation improves depressive symptoms in adults with clinically significant depression.\n\nMethods: We conducted a randomized, double-blind, placebo-controlled trial involving 1,000 adults with moderate to severe depression and vitamin D deficiency. Participants received either 4,000 IU of vitamin D3 or placebo daily for 12 weeks. The primary outcome was change in depressive symptoms measured by the Beck Depression Inventory-II (BDI-II).\n\nResults: After 12 weeks, participants in the vitamin D group showed a statistically significant improvement in BDI-II scores compared to the placebo group (mean difference: -3.5 points, 95% CI -5.1 to -1.9, p<0.001). Subgroup analysis revealed that participants with severe vitamin D deficiency at baseline experienced greater improvements.\n\nConclusions: Vitamin D supplementation may be an effective adjunctive treatment for depression in adults with vitamin D deficiency. Further research is needed to determine optimal dosing and identify which patients are most likely to benefit.",
}

export default function StudyPage() {
  const { id } = useParams()

  // Format date
  const formattedDate = new Date(study.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Status badge configuration
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
  }


  const status = statusConfig[study.status as Status]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/dashboard" className="hover:text-teal-600">
              Studies
            </Link>
            <span>/</span>
            <span>{study.title.substring(0, 30)}...</span>
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
              <button className="border-teal-500 text-teal-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Overview
              </button>
              <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Data & Code
              </button>
              <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Verifications
              </button>
              <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Discussion
              </button>
            </nav>
          </div>

          <div className="mt-6 space-y-6">
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
                      <span className="text-2xl font-bold">{study.participants.toLocaleString()}</span>
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
                      <span className="text-2xl font-bold">{study.issues}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Methodology</h3>
                <p className="text-gray-700">
                  This study employed a randomized, double-blind, placebo-controlled design to investigate the effects
                  of vitamin D supplementation on depressive symptoms. Participants were randomly assigned to receive
                  either 4,000 IU of vitamin D3 or an identical-looking placebo daily for 12 weeks.
                </p>
                <p className="text-gray-700 mt-4">
                  Depression severity was assessed using the Beck Depression Inventory-II (BDI-II) at baseline and after
                  12 weeks of treatment. Secondary outcomes included changes in serum 25-hydroxyvitamin D levels,
                  quality of life measures, and adverse events.
                </p>
                <p className="text-gray-700 mt-4">
                  Statistical analysis was performed using R version 4.1.2. The primary analysis used a linear
                  mixed-effects model to compare changes in BDI-II scores between the vitamin D and placebo groups,
                  adjusting for baseline depression severity and vitamin D levels.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-medium">Author</h3>
            </div>
            <div className="p-6 pt-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="font-medium text-gray-600">JS</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Dr. James Smith</h3>
                  <p className="text-sm text-gray-600">Harvard Medical School</p>
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-teal-50 text-teal-700 border-teal-200">
                      Verified Researcher
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/profile/${study.authorId}`}
                className="mt-4 w-full inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
              >
                View Profile
              </Link>
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
