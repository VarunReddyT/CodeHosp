"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import StudyCard from "@/components/StudyCard"
import axios from "axios"
import {toast} from 'react-hot-toast'
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


export default function UserStudies() {
    const params = useParams()
    const uid = params.id as string
    const [studies, setStudies] = useState<Study[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        const fetchUserStudies = async () => {
            try {
                setLoading(true)
                const response = await axios.get(`/api/studies/user/${uid}`);
                if (response.status !== 200) {
                    toast.error("Failed to fetch studies")
                    setError("Failed to fetch studies")
                    return;
                }
                setStudies(response.data)
            } catch (err) {
                console.error("Error fetching user studies:", err)
                setError(err instanceof Error ? err.message : "Failed to load studies")
            } finally {
                setLoading(false)
            }
        }

        fetchUserStudies()
    }, [uid])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Link href="/" className="flex items-center hover:text-teal-600">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Home
                </Link>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Studies</h1>
                    <p className="text-gray-600 mt-1">Studies contributed by this user</p>
                </div>
            </div>

            {studies.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                    <p className="text-gray-500">No studies found for this user</p>
                </div>
            ) : (
                <div className="grid grid-cols-1  gap-6">
                    {studies.map((study) => (
                        <StudyCard
                            key={study.id}
                            study={study}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}