"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sprout, Mail, Lock, Loader2, ArrowRight, User } from "lucide-react";
import api from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.post("/auth/signup", {
                email,
                password,
                full_name: fullName,
            });

            // Auto-login after signup
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const loginRes = await api.post("/auth/login", formData);
            localStorage.setItem("token", loginRes.data.access_token);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (response: any) => {
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/google/login", {
                token: response.credential
            });
            localStorage.setItem("token", res.data.access_token);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Google login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-200/50 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="glass-card p-8 rounded-[2.5rem] bg-white shadow-2xl">
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <Link href="/" className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200">
                            <Sprout className="w-8 h-8" />
                        </Link>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
                            <p className="text-slate-500 text-sm">Join EcoTech and start analyzing</p>
                        </div>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-slate-900"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400 font-bold">Or continue with</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError("Google login failed")}
                                theme="outline"
                                shape="pill"
                                width="100%"
                            />
                        </div>
                    </form>

                    <p className="text-center mt-8 text-slate-500 text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="text-green-600 font-bold hover:underline underline-offset-4">
                            Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
