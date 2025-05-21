"use client"
import { useState } from "react";
import { auth, provider } from "@lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { FaUserShield } from "react-icons/fa";
import {doc, setDoc, getDoc} from "firebase/firestore";
import { db } from "@lib/firebase";
import axios from "axios";
import { useRouter } from "next/navigation";
export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            const token = await auth.currentUser?.getIdToken();

            if (token) {
                await axios.post("/api/session", { token });
            }
            router.push("/");
        } catch (error) {
            setError("Invalid email or password, if new user, please sign up");
            console.error("Login error:", error);
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    uid: user.uid,
                    createdAt: new Date(),
                });
            }
            const token = await auth.currentUser?.getIdToken();
            if (token) {
                await axios.post("/api/session", { token });
            }
            router.push("/");
        } catch (error) {
            setError("Google login failed");
            console.error("Google login error:", error);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            console.log(result);
            const user = result.user;
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                displayName: user.displayName || email.split("@")[0],
                uid: user.uid,
                createdAt: new Date(),
            });
            const token = await auth.currentUser?.getIdToken();
            if (token) {
                await axios.post("/api/session", { token });
            }
            router.push("/");
        } catch (error) {
            setError("Signup failed");
            console.error("Signup error:", error);
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-teal-50 to-white">
            <div className="w-full max-w-md m-auto p-8 bg-white rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <FaUserShield className="mx-auto text-5xl text-teal-600 mb-4" />
                    <h1 className="text-3xl font-bold text-teal-800">
                        {isLogin ? "Welcome Back" : "Join CodeHosp"}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {isLogin ? "Sign in to continue your research" : "Create an account to get started"}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={isLogin ? handleEmailLogin : handleSignUp} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="example@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition duration-200"
                    >
                        {isLogin ? "Sign In" : "Create Account"}
                    </button>
                </form>

                <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-gray-500">or</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                    <FcGoogle className="text-xl mr-3" />
                    <span>Continue with Google</span>
                </button>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-teal-600 hover:text-teal-800 font-medium"
                    >
                        {isLogin ? (
                            <>Need an account? <span className="underline">Sign Up</span></>
                        ) : (
                            <>Already have an account? <span className="underline">Sign In</span></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}