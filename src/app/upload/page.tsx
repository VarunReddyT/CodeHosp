"use client"
import Link from "next/link"
import { Plus, X, ArrowRight, CheckCircle, XCircle, FileSearch, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@lib/supabase"
import axios from "axios"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { getAuth } from "firebase/auth"

type Status = "verified" | "issues" | "pending"

type VerificationStatus = "match" | "close" | "partial" | "mismatch" | "error"

interface VerificationResult {
  status: VerificationStatus
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
  tags: string[]
  description: string
  abstract: string
  expectedOutput: string
  methodology: string
  dataFile?: File | null
  codeFile?: File | null
}

export default function UploadPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<Study>({
    title: '',
    authors: [],
    institution: '',
    date: '',
    category: '',
    tags: [],
    description: '',
    abstract: '',
    expectedOutput: '',
    methodology: '',
    dataFile: null,
    codeFile: null
  })
  const [currentTag, setCurrentTag] = useState('')
  const [currentAuthor, setCurrentAuthor] = useState('')
  const [activeTab, setActiveTab] = useState('basic-info')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [studyId, setStudyId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [code, setCode] = useState<File | null>(null)

  useEffect(() => {
    async function verifyToken() {
      const token = await getAuth().currentUser?.getIdToken()

      if (!token) {
        toast.error("Login to upload a study", {
          duration: 2000,
          position: 'top-right',
        })
        router.push("/login");
        return;
      }
      console.log("Token:", token)

      await axios.post("/api/verifytoken", { token })
        .then((response) => {
          const { userId, email } = response.data;
          setFormData((prev) => ({
            ...prev,
            userId
          }));
        })
        .catch((error) => {
          console.error("Token verification failed:", error);
          toast.error("Please login and try again", {
            duration: 2000,
            position: 'top-right',
          })
          router.push("/login");
        });
    }
    verifyToken()
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleAddAuthor = () => {
    if (currentAuthor.trim()) {
      setFormData(prev => ({
        ...prev,
        authors: [...prev.authors, currentAuthor.trim()]
      }))
      setCurrentAuthor('')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = e.target.files?.[0]
    if (fileInput) {
      setFile(fileInput)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const codeInput = e.target.files?.[0]
    if (codeInput) {
      setCode(codeInput)
    }
  }

  const handleRemoveAuthor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }))
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const validateBasicInfo = () => {
    return (
      formData.title.trim() &&
      formData.authors.length > 0 &&
      formData.institution.trim() &&
      formData.date.trim() &&
      formData.category.trim() &&
      formData.abstract.trim()
    )
  }

  const validateDataCode = () => {

    return file !== null && code !== null && formData.expectedOutput.trim()
  }

  const validateMethodology = () => {
    return formData.description.trim()
  }

  const validateReview = () => {
    return isVerified;
  }

  const handleNextTab = (nextTab: string) => {
    if (nextTab === 'data-code' && !validateBasicInfo()) {
      toast.error('Please fill all required fields in Basic Info', {
        duration: 2000,
        position: 'top-right',
      })
      return
    }
    if (nextTab === 'methodology' && !validateDataCode()) {
      toast.error('Please upload both data and code files', {
        duration: 2000,
        position: 'top-right',
      })
      return
    }
    if (nextTab === 'review' && !validateMethodology()) {
      toast.error('Please fill the methodology description', {
        duration: 2000,
        position: 'top-right',
      })
      return
    }
    setActiveTab(nextTab)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {

      const uploadFormData = new FormData()
      uploadFormData.append('title', formData.title)
      formData.authors.forEach(author => uploadFormData.append('authors[]', author))
      formData.tags.forEach(tag => uploadFormData.append('tags[]', tag))
      uploadFormData.append('institution', formData.institution)
      uploadFormData.append('date', formData.date)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('methodology', formData.description)
      uploadFormData.append('abstract', formData.abstract)
      uploadFormData.append('expectedOutput', formData.expectedOutput)
      uploadFormData.append('participants', '0');
      uploadFormData.append('reproductions', '0');
      uploadFormData.append('issues', JSON.stringify([]));
      if (file) {
        uploadFormData.append('dataFile', file)
      }
      if (code) {
        uploadFormData.append('codeFile', code)
      }

      const response = await axios.post('/api/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${await getAuth().currentUser?.getIdToken()}`
        },
        validateStatus: () => true, 
      })

      if (response.data.message === "Study published successfully") {
        setVerificationResult(response.data.verification)

        toast.success(`Study submitted successfully! Status: ${response.data.status}`, {
          duration: 4000,
          position: 'top-right',
        })

        setActiveTab('verification')
        setIsVerified(true)
        setStudyId(response.data.studyId)
      } else {
        toast.error(`Error: ${response.data.message}`, {
          duration: 4000,
          position: 'top-right',
        })
        setIsVerified(false)
      }
    } catch (error) {
      console.error("Submission error:", error)
      toast.error(`Error: ${error instanceof Error ? error.message : 'Submission failed'}`, {
        duration: 4000,
        position: 'top-right',
      })
      setIsVerified(false)

    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Research Study</h1>
          <p className="text-gray-600 mt-1">Share your research for verification and collaboration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Upload Form */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic-info')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'basic-info'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Basic Info
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextTab('data-code')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'data-code'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    disabled={!validateBasicInfo()}
                  >
                    Data & Code
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextTab('methodology')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'methodology'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    disabled={!validateDataCode()}
                  >
                    Methodology
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextTab('review')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'review'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    disabled={!validateMethodology()}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextTab('verification')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'verification'
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    disabled={!validateReview()}
                  >
                    Verification
                  </button>
                </nav>
              </div>
            </div>

            {activeTab === 'basic-info' && (
              <div className="space-y-6">
                <div className="rounded-lg border bg-white shadow-sm">
                  <div className="p-6">
                    <h3 className="text-lg font-medium">Study Information</h3>
                    <p className="text-sm text-gray-500">Provide basic information about your research study</p>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Study Title*
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter the full title of your study"
                        className="w-full h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="authors" className="block text-sm font-medium text-gray-700">
                        Authors*
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="authors"
                          type="text"
                          value={currentAuthor}
                          onChange={(e) => setCurrentAuthor(e.target.value)}
                          placeholder="Enter author name"
                          className="w-full h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3"
                        />
                        <button
                          type="button"
                          onClick={handleAddAuthor}
                          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {formData.authors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.authors.map((author, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800"
                            >
                              {author}
                              <button
                                type="button"
                                onClick={() => handleRemoveAuthor(index)}
                                className="ml-1 hover:text-gray-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">Add all authors who contributed to this study</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                        Institution*
                      </label>
                      <input
                        id="institution"
                        type="text"
                        value={formData.institution}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your primary institution"
                        className="w-full h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                          Publication Date*
                        </label>
                        <input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          required
                          className="w-full h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                          Research Category*
                        </label>
                        <select
                          id="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                          className="w-full h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3"
                        >
                          <option value="">Select category</option>
                          <option value="clinical">Clinical Trial</option>
                          <option value="observational">Observational Study</option>
                          <option value="meta">Meta-Analysis</option>
                          <option value="basic">Basic Science</option>
                          <option value="computational">Computational</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">
                        Abstract*
                      </label>
                      <textarea
                        id="abstract"
                        value={formData.abstract}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter the abstract of your study"
                        rows={6}
                        className="w-full rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3 py-2"
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                        Keywords/Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentTag}
                          onChange={(e) => setCurrentTag(e.target.value)}
                          placeholder="Add a keyword or tag"
                          className="w-full h-10 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">Add relevant keywords to help others find your study</p>
                    </div>
                  </div>
                  <div className="flex justify-between border-t p-6">
                    <button
                      type="button"
                      onClick={() => handleNextTab('data-code')}
                      disabled={!validateBasicInfo()}
                      className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Data & Code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data-code' && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Data & Code Upload</h3>
                  <p className="text-sm text-gray-500">Upload your research data and analysis code</p>
                </div>
                <div className="p-6 pt-0 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Dataset File*
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none">
                            <span>Upload a file</span>
                            <input type="file" className="sr-only" required onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">CSV, Excel, or other standard formats</p>
                        {file && (
                          <p className="text-sm text-gray-900 mt-2">
                            Selected: {file.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Analysis Code*
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none">
                            <span>Upload a file</span>
                            <input type="file" className="sr-only" required onChange={handleCodeChange} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">Python, R, Jupyter Notebook, etc.</p>
                        {code && (
                          <p className="text-sm text-gray-900 mt-2">
                            Selected: {code.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="expectedOutput" className="block text-sm font-medium text-gray-700">
                      Expected Output (Final Output of Analysis)*
                    </label>
                    <textarea
                      id="expectedOutput"
                      value={formData.expectedOutput}
                      onChange={handleInputChange}
                      placeholder="Enter expected output of your analysis code (Terminal final output, etc.)"
                      rows={4}
                      className="w-full rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3 py-2"
                    ></textarea>
                  </div>

                  <div className="flex justify-between border-t p-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('basic-info')}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNextTab('methodology')}
                      disabled={!validateDataCode()}
                      className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Methodology
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'methodology' && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Methodology</h3>
                  <p className="text-sm text-gray-500">Describe your research methodology</p>
                </div>
                <div className="p-6 pt-0 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Methodology Description*
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      placeholder="Describe your research methodology in detail"
                      rows={8}
                      className="w-full rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent px-3 py-2"
                    ></textarea>
                  </div>

                  <div className="flex justify-between border-t p-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('data-code')}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNextTab('review')}
                      disabled={!validateMethodology()}
                      className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Review Your Submission</h3>
                  <p className="text-sm text-gray-500">Verify all information before submitting</p>
                </div>
                <div className="p-6 pt-0 space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Study Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Title</p>
                        <p className="font-medium">{formData.title || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Authors</p>
                        <p className="font-medium">
                          {formData.authors.length > 0 ? formData.authors.join(', ') : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Institution</p>
                        <p className="font-medium">{formData.institution || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Publication Date</p>
                        <p className="font-medium">{formData.date || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Research Category</p>
                        <p className="font-medium">
                          {formData.category
                            ? formData.category.charAt(0).toUpperCase() + formData.category.slice(1)
                            : 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Keywords/Tags</p>
                        <p className="font-medium">
                          {formData.tags.length > 0 ? formData.tags.join(', ') : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm text-gray-500">Abstract</h4>
                    <p className="font-medium">
                      {formData.abstract || 'Not provided'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm text-gray-500">Methodology</h4>
                    <p className="font-medium">
                      {formData.description || 'Not provided'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Dataset File</p>
                        <p className="font-medium">{file ? file.name : 'Not uploaded'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Analysis Code</p>
                        <p className="font-medium">{code ? code.name : 'Not uploaded'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between border-t p-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('methodology')}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Study'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium">Verification Results</h3>
                  <p className="text-sm text-gray-500">Your study has been verified</p>
                </div>
                <div className="p-6 pt-0 space-y-6">
                  {verificationResult && (
                    <div className={`p-4 rounded-lg border ${verificationResult.status === "match" || verificationResult.status === "close"
                        ? "bg-green-50 border-green-200"
                        : verificationResult.status === "partial"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-red-50 border-red-200"
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-full ${verificationResult.status === "match" || verificationResult.status === "close"
                            ? "bg-green-100 text-green-600"
                            : verificationResult.status === "partial"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-red-100 text-red-600"
                          }`}>
                          {verificationResult.status === "match" || verificationResult.status === "close"
                            ? <CheckCircle className="h-5 w-5" />
                            : verificationResult.status === "partial"
                              ? <FileSearch className="h-5 w-5" />
                              : <AlertCircle className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {verificationResult.status === "match" ? "Verification Successful" :
                              verificationResult.status === "close" ? "Close Match" :
                                verificationResult.status === "partial" ? "Partial Verification" :
                                  verificationResult.status === "mismatch" ? "Verification Failed" :
                                    "Verification Error"}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{verificationResult.details}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {verificationResult?.expectedOutput && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Expected Output</h4>
                        <div className="bg-gray-50 p-3 rounded border">
                          <pre className="whitespace-pre-wrap text-sm">{verificationResult.expectedOutput}</pre>
                        </div>
                      </div>
                    )}

                    {verificationResult?.output && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Actual Output</h4>
                        <div className="bg-gray-50 p-3 rounded border">
                          <pre className="whitespace-pre-wrap text-sm">{verificationResult.output}</pre>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between border-t pt-6 mt-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab('review')}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100"
                    >
                      Back to Review
                    </button>
                    <Link
                      href={`/study/${studyId}`}
                      className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      View Study
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Help and Guidelines */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium">Submission Guidelines</h3>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Data Requirements</h3>
                  <p className="text-sm text-gray-600">
                    Upload raw data files in standard formats (CSV, Excel, etc.). Ensure data is properly anonymized and
                    includes all variables used in your analysis.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Code Requirements</h3>
                  <p className="text-sm text-gray-600">
                    Include all code used for data cleaning, analysis, and visualization. Code should be well-documented
                    and reproducible.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Documentation</h3>
                  <p className="text-sm text-gray-600">
                    Provide clear documentation for your data, code, and methodology to facilitate verification by other
                    researchers.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium">Benefits of Sharing</h3>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-teal-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Increased Visibility</h3>
                    <p className="text-sm text-gray-600">
                      Your research will be discoverable by thousands of researchers worldwide.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-teal-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Verification Badge</h3>
                    <p className="text-sm text-gray-600">
                      Earn a verification badge when your results are successfully reproduced.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-teal-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">PeerPoints</h3>
                    <p className="text-sm text-gray-600">
                      Earn PeerPoints when others verify or build upon your research.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="rounded-lg border bg-white shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-medium">Need Help?</h3>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <p className="text-sm text-gray-600">
                  Our team is available to assist you with any questions about uploading your research.
                </p>
                <button className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-100 w-full">
                  Contact Support
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </form>
    </div>
  )
}