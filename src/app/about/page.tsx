import { Shield, Users, Award, CheckCircle, AlertTriangle, Code, Database, Play } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Revolutionizing Medical Research Transparency</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            CodeHosp is transforming how medical research is conducted, shared, and verified. We're building the world's
            first comprehensive platform for reproducible medical science, where transparency isn't just encouraged—it's
            built into the system.
          </p>
        </div>
        <div className="mb-12 border border-red-200 bg-red-50 rounded-lg shadow-sm">
          <div className="p-8">
            <div className="flex items-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-2xl font-bold text-red-800">The Crisis in Medical Research</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">50%</div>
                <p className="text-red-700">of medical studies cannot be reproduced</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">$28B</div>
                <p className="text-red-700">wasted annually on irreproducible research</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">Hidden</div>
                <p className="text-red-700">data and analysis methods in most studies</p>
              </div>
            </div>
          </div>
        </div>

        {/* Our Solution */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Solution</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-blue-200 bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
              <div className="p-6 text-center">
                <Database className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">Data Repository</h4>
                <p className="text-gray-600 text-sm">Secure storage for raw research data with version control</p>
              </div>
            </div>

            <div className="border border-green-200 bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
              <div className="p-6 text-center">
                <Code className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">Code Sharing</h4>
                <p className="text-gray-600 text-sm">Open analysis scripts with full documentation</p>
              </div>
            </div>

            <div className="border border-purple-200 bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
              <div className="p-6 text-center">
                <Play className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">One-Click Reproduction</h4>
                <p className="text-gray-600 text-sm">Automated replication of research findings</p>
              </div>
            </div>

            <div className="border border-orange-200 bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
              <div className="p-6 text-center">
                <Award className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h4 className="font-semibold text-gray-900 mb-2">PeerPoints System</h4>
                <p className="text-gray-600 text-sm">Gamified peer review and verification rewards</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">How CodeHosp Works</h3>
          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Researchers Upload Complete Studies</h4>
                <p className="text-gray-600">
                  Raw data, analysis code, methodology, and Docker containers for full reproducibility
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-green-600 font-bold text-lg">2</span>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Automated Verification</h4>
                <p className="text-gray-600">
                  Our system automatically reruns analyses to verify results and flag potential issues
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="bg-purple-100 p-3 rounded-full">
                <span className="text-purple-600 font-bold text-lg">3</span>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Community Peer Review</h4>
                <p className="text-gray-600">
                  Scientists earn PeerPoints by reviewing, reproducing, and improving research
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="bg-orange-100 p-3 rounded-full">
                <span className="text-orange-600 font-bold text-lg">4</span>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Verified Science</h4>
                <p className="text-gray-600">
                  Studies receive verification badges, building trust in reproducible research
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div className="mb-16 border border-green-200 bg-green-50 rounded-lg shadow-sm">
          <div className="p-8">
            <div className="flex items-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-2xl font-bold text-green-800">Our Impact Vision</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Shield className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-green-800 mb-2">Prevent Bad Science</h4>
                <p className="text-green-700 text-sm">Stop flawed research before it becomes headlines</p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-green-800 mb-2">Accelerate Discovery</h4>
                <p className="text-green-700 text-sm">Enable faster, more reliable medical breakthroughs</p>
              </div>
              <div className="text-center">
                <Award className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold text-green-800 mb-2">Reward Excellence</h4>
                <p className="text-green-700 text-sm">Recognize and incentivize rigorous research practices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-200 my-12"></div>

        {/* About the Founder */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">Meet the Founder</h3>
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-8">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                  <span className="text-white text-2xl font-bold">VR</span>
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">Varun Reddy</h4>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 mb-4">
                  <Code className="h-4 w-4 mr-1" />
                  Founder & Developer
                </div>
                <div className="flex items-center space-x-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    Full-Stack Developer
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    App Developer
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    AI Enthusiast
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Join the Revolution</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Help us build a future where medical research is transparent, reproducible, and trustworthy. Together, we
            can accelerate scientific discovery and improve healthcare for everyone.
          </p>
          <div className="flex justify-center space-x-4">
            <span className="inline-flex items-center px-6 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
              For Researchers
            </span>
            <span className="inline-flex items-center px-6 py-2 rounded-md text-base font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 cursor-pointer">
              For Institutions
            </span>
            <span className="inline-flex items-center px-6 py-2 rounded-md text-base font-medium text-white bg-teal-600 border border-gray-300 hover:bg-teal-700 cursor-pointer">
              For Developers
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
