"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    BarChart3, Plus, MapPin,
    ArrowRight, Search,
    Filter, Trash2, Loader2,
    Calendar, FileText
} from "lucide-react";
import api from "@/lib/api";

export default function DashboardPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const res = await api.get("/land/projects");
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Eco Dashboard</h1>
                    <p className="text-slate-500 font-medium">Manage your land valuation projects and insights.</p>
                </div>
                <Link
                    href="/map"
                    className="px-6 py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center gap-2 group"
                >
                    <Plus className="w-5 h-5" />
                    New Land Analysis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Grid */}
            {projects.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-[3rem]">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <BarChart3 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No projects yet</h3>
                    <p className="text-slate-500 mb-8">Start by drawing a land area on the interactive map.</p>
                    <Link href="/map" className="text-green-600 font-bold hover:underline">
                        Go to Map →
                    </Link>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group glass-card p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-green-300 hover:shadow-xl hover:shadow-green-50 transition-all flex flex-col gap-6"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(project.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{project.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{(project.area_m2 / 10000).toFixed(2)} Hectares</span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-widest leading-none">
                                        {project.dominant_type}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>INTENT</span>
                                <span className="text-slate-900 capitalize">{project.user_intent}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Link
                                    href={`/analysis?id=${project.id}`}
                                    className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 text-center hover:bg-slate-50 transition-all"
                                >
                                    View Details
                                </Link>
                                <Link
                                    href={`/analysis/report?id=${project.id}`}
                                    className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                >
                                    <FileText className="w-5 h-5" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
