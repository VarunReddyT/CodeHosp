"use client"
import Link from "next/link";
import { ArrowRight, Database, Play, Award } from "lucide-react"
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-teal-50 to-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-800 font-medium text-sm mb-2">
                Revolutionizing Medical Research
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                GitHub for Medical Research
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl">
                CodeHosp makes medical research transparent, reproducible, and verifiable. Upload data, code, and
                analysis in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md bg-teal-600 px-8 py-3 text-base font-medium text-white hover:bg-teal-700"
                >
                  Explore Studies <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-8 py-3 text-base font-medium shadow-sm hover:bg-gray-100"
                >
                  Upload Your Research
                </Link>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-200 to-cyan-200 rounded-lg transform rotate-3"></div>
                <Image
                  src="/logo2.png"
                  alt="CodeHosp Platform"
                  className="relative rounded-lg shadow-xl z-10 transform -rotate-3"
                  fill
                  sizes="(max-width: 768px) 100vw, (min-width: 768px) 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-900">How CodeHosp Works</h2>

          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard
              icon={<Database className="h-10 w-10 text-teal-600" />}
              title="Upload Research Data"
              description="Share your raw data, analysis code, and Docker containers for reproducibility."
            />
            <FeatureCard
              icon={<Play className="h-10 w-10 text-teal-600" />}
              title="Automated Verification"
              description="Our system reruns analyses to confirm results and flag potential errors."
            />
            <FeatureCard
              icon={<Award className="h-10 w-10 text-teal-600" />}
              title="Earn PeerPoints"
              description="Get recognized for reproducing studies and identifying improvements."
            />
          </div>
        </div>
      </section>

      {/* Example Case Study */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Real-World Example</h2>

          <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">The Vitamin D Study</h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-red-100 rounded-full p-2 mt-1">
                  <span className="text-red-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">The Problem</h4>
                  <p className="text-gray-600">
                    Dr. Smith publishes &quot;Vitamin D cures depression!&quot; but no one can verify his data or methods.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-amber-100 rounded-full p-2 mt-1">
                  <span className="text-amber-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">With CodeHosp</h4>
                  <p className="text-gray-600">
                    Dr. Smith uploads his 1,000-patient survey data and Python analysis code
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-teal-100 rounded-full p-2 mt-1">
                  <span className="text-teal-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">The Outcome</h4>
                  <p className="text-gray-600">
                    The system flags that he excluded 200 patients unfairly. Other scientists fix his code and prove
                    Vitamin D actually has no effect.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                See More Case Studies
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Make Science Better?</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto">
            Join thousands of researchers making medical science more transparent and reproducible.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-white px-8 py-3 text-base font-medium text-gray-900 hover:bg-gray-100"
            >
              Create Account
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-transparent border border-white px-8 py-3 text-base font-medium text-white hover:bg-white/10"
            >
              Browse Studies
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
