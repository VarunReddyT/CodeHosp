"use client"

import { useParams } from "react-router-dom"
import Link from "next/link"
import { CheckCircle, Database, Play, Terminal, Code, FileText, Save, ArrowLeft } from "lucide-react"

export default function RunStudyPage() {
  const { id } = useParams()

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
          <p className="text-gray-600 mt-1">Verify the results of "Effects of Vitamin D on Depression in Adults"</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100">
            <Save className="h-4 w-4 mr-2" />
            Save Progress
          </button>
          <button className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Play className="h-4 w-4 mr-2" />
            Run Analysis
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
                <VerificationStep
                  number={1}
                  title="Setup Environment"
                  description="Configure the Docker container with all dependencies"
                  status="completed"
                />

                <VerificationStep
                  number={2}
                  title="Load Data"
                  description="Load and inspect the study data"
                  status="completed"
                />

                <VerificationStep
                  number={3}
                  title="Run Analysis"
                  description="Execute the analysis code"
                  status="in-progress"
                />

                <VerificationStep
                  number={4}
                  title="Compare Results"
                  description="Compare your results with the original study"
                  status="pending"
                />

                <VerificationStep
                  number={5}
                  title="Submit Verification"
                  description="Submit your verification report"
                  status="pending"
                />
              </div>
            </div>
            <div className="bg-gray-50 border-t p-6">
              <div className="w-full">
                <div className="flex justify-between text-sm mb-2">
                  <span>Verification Progress</span>
                  <span>40%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-teal-600 h-2 rounded-full" style={{ width: "40%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Resources</h3>
            </div>
            <div className="p-6 pt-0 space-y-3">
              <div className="flex items-center p-2 rounded-md hover:bg-gray-50">
                <FileText className="h-5 w-5 text-blue-500 mr-3" />
                <Link href="#" className="text-gray-700 hover:text-teal-600">
                  Study Protocol
                </Link>
              </div>
              <div className="flex items-center p-2 rounded-md hover:bg-gray-50">
                <Database className="h-5 w-5 text-green-500 mr-3" />
                <Link href="#" className="text-gray-700 hover:text-teal-600">
                  Dataset Documentation
                </Link>
              </div>
              <div className="flex items-center p-2 rounded-md hover:bg-gray-50">
                <Code className="h-5 w-5 text-purple-500 mr-3" />
                <Link href="#" className="text-gray-700 hover:text-teal-600">
                  Code Documentation
                </Link>
              </div>
              <div className="flex items-center p-2 rounded-md hover:bg-gray-50">
                <Terminal className="h-5 w-5 text-gray-500 mr-3" />
                <Link href="#" className="text-gray-700 hover:text-teal-600">
                  Docker Instructions
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Verification Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Verification Workspace</h3>
              <p className="text-sm text-gray-500">Step 3: Run Analysis</p>
            </div>
            <div className="p-6 pt-0">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button className="border-teal-500 text-teal-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                    Code Editor
                  </button>
                  <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                    Terminal
                  </button>
                  <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                    Results
                  </button>
                </nav>
              </div>

              <div className="mt-4 space-y-4">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto h-96">
                  <pre>{`import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.formula.api import ols

# Load the data
df = pd.read_csv('patient_data.csv')

# Filter out participants with missing data
df = df.dropna(subset=['bdi_baseline', 'bdi_week12', 'treatment_group'])

# Calculate change in BDI-II scores
df['bdi_change'] = df['bdi_baseline'] - df['bdi_week12']

# Compare treatment groups
treatment = df[df['treatment_group'] == 'vitamin_d']['bdi_change']
placebo = df[df['treatment_group'] == 'placebo']['bdi_change']

# Run t-test
t_stat, p_value = stats.ttest_ind(treatment, placebo)
print(f"t-statistic: {t_stat:.3f}")
print(f"p-value: {p_value:.4f}")

# Calculate effect size (Cohen's d)
mean_diff = treatment.mean() - placebo.mean()
pooled_std = np.sqrt(((treatment.count() - 1) * treatment.std()**2 + 
                      (placebo.count() - 1) * placebo.std()**2) / 
                     (treatment.count() + placebo.count() - 2))
cohens_d = mean_diff / pooled_std
print(f"Mean difference: {mean_diff:.2f}")
print(f"Cohen's d: {cohens_d:.2f}")

# Run regression model with covariates
model = ols('bdi_change ~ treatment_group + bdi_baseline + vit_d_baseline + age + sex', data=df).fit()
print(model.summary())`}</pre>
                </div>

                <div className="flex justify-between">
                  <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100">
                    Reset Code
                  </button>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                      <Play className="h-4 w-4 mr-2" />
                      Run
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type VerificationStepProps = {
  number: number
  title: string
  description: string
  status: "completed" | "in-progress" | "pending"
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
