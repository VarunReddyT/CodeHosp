"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Search, Mail } from "lucide-react"
import { auth } from "@lib/firebase"
import { signOut, onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true)
        setUser(user)
        console.log("User logged in:", user)
      } else {
        setIsLoggedIn(false)
        setUser(null)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setIsLoggedIn(false)
      setUser(null)
      router.push("/")
    } catch (err) {
      alert("Logout failed: " + err.message)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <span className="text-teal-600 font-bold text-xl">CodeHosp</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/dashboard" className="text-gray-700 hover:text-teal-600 font-medium">
              Studies
            </Link>
            <Link href="/leaderboard" className="text-gray-700 hover:text-teal-600 font-medium">
              Leaderboard
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-teal-600 font-medium">
              About
            </Link>
          </nav>

          <div className="hidden md:flex items-center space-x-4">

            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                {/* <button className="relative p-2 rounded-full hover:bg-gray-100">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button> */}
                <div className="relative">
                  <button className="relative p-2 rounded-full hover:bg-gray-100">
                    <Link href={`/modifications/${user?.uid}`}>
                      <Mail className="h-5 w-5" />
                    </Link>
                  </button>
                </div>

                <div
                  className="relative"
                  onMouseEnter={() => setIsProfileOpen(true)}
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <button className="relative h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="font-medium text-gray-600">{user?.email?.[0].toUpperCase()}</span>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-100">
                      <div className="px-4 py-2 text-sm text-gray-700 font-medium">My Account</div>
                      <hr className="my-1" />
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/my-studies"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        My Studies
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          handleLogout()
                          setIsProfileOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" type="button">
                  <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 cursor-pointer">
                    Log in / Sign up
                  </button>
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button className="p-2 rounded-md text-gray-700 hover:bg-gray-100" onClick={toggleMenu}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4">
          <div className="flex flex-col space-y-4">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-teal-600 font-medium py-2"
              onClick={toggleMenu}
            >
              Studies
            </Link>
            <Link
              href="/leaderboard"
              className="text-gray-700 hover:text-teal-600 font-medium py-2"
              onClick={toggleMenu}
            >
              Leaderboard
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-teal-600 font-medium py-2"
              onClick={toggleMenu}
            >
              About
            </Link>

            <div className="relative py-2">
              <Search className="absolute left-2.5 top-5 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search studies..."
                className="pl-9 w-full bg-gray-50 rounded-md border border-gray-200 p-2"
              />
            </div>

            {isLoggedIn ? (
              <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-teal-600 py-2"
                  onClick={toggleMenu}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-700 hover:text-teal-600 py-2"
                  onClick={toggleMenu}
                >
                  Settings
                </Link>
                <Link
                  href="/my-studies"
                  className="text-gray-700 hover:text-teal-600 py-2"
                  onClick={toggleMenu}
                >
                  My Studies
                </Link>
                <button
                  className="text-left text-gray-700 hover:text-teal-600 py-2"
                  onClick={() => {
                    handleLogout()
                    toggleMenu()
                  }}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100">
                <Link href="/login">
                  <button
                    className="text-left text-gray-700 hover:text-teal-600 py-2 cursor-pointer"
                    onClick={toggleMenu}
                  >
                    Log in
                  </button>
                </Link>
                <button
                  className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md cursor-pointer"
                  onClick={toggleMenu}
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}