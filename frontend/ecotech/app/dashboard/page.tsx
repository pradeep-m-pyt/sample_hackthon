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
            <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-12 bg-[#FAF7F2] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-violet-100 pb-10">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black text-indigo-950 tracking-tighter">Your Ecosystems</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Project Portfolio & Valuation Hub</p>
                </div>
                <Link
                    href="/map"
                    className="px-8 py-5 bg-violet-600 text-white rounded-[2rem] font-black text-lg hover:bg-violet-700 transition-all shadow-2xl shadow-violet-200 flex items-center gap-3 group active:scale-[0.98]"
                >
                    <Plus className="w-6 h-6 stroke-[3]" />
                    <span>Analyze New Land</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Grid */}
            {projects.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-24 bg-white border border-violet-100 rounded-[4rem] shadow-2xl shadow-violet-100/50 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-violet-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-violet-600 shadow-inner">
                            <BarChart3 className="w-12 h-12 stroke-[2.5]" />
                        </div>
                        <h3 className="text-3xl font-black text-indigo-950 tracking-tight mb-3">No active projects</h3>
                        <p className="text-slate-400 font-medium max-w-sm mx-auto mb-10 text-sm leading-relaxed">
                            Your environmental GIS portfolio is empty. Launch the mapping engine to generate your first valuation report.
                        </p>
                        <Link href="/map" className="inline-flex items-center gap-2 text-violet-600 font-black uppercase tracking-widest hover:text-indigo-950 transition-colors">
                            Launch Map Engine <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative bg-white rounded-[3rem] border border-violet-100 p-8 hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-200/50 transition-all flex flex-col gap-8 overflow-hidden"
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div className="w-14 h-14 bg-violet-50 rounded-[1.5rem] flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:rotate-6 transition-all duration-300 shadow-sm">
                                    <MapPin className="w-7 h-7 stroke-[2.5]" />
                                </div>
                                <div className="px-4 py-2 bg-indigo-950 rounded-full flex items-center gap-2 text-white shadow-lg">
                                    <Calendar className="w-3 h-3 text-violet-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{new Date(project.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <h3 className="text-2xl font-black text-indigo-950 line-clamp-1 tracking-tight">{project.name}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(project.area_m2 / 10000).toFixed(2)} Hectares</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-200" />
                                    <span className="px-3 py-1 bg-violet-50 text-violet-700 text-[9px] font-black rounded-lg uppercase tracking-widest">
                                        {project.dominant_type}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 bg-[#FAF7F2] rounded-[1.5rem] flex items-center justify-between shadow-inner">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategy</span>
                                <span className="text-xs font-black text-indigo-900 capitalize px-3 py-1 bg-white rounded-lg shadow-sm">{project.user_intent}</span>
                            </div>

                            <div className="flex items-center gap-3 pt-2 relative z-10">
                                <Link
                                    href={`/analysis?id=${project.id}`}
                                    className="flex-1 py-4 bg-indigo-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-black transition-all shadow-xl shadow-indigo-100"
                                >
                                    View Report
                                </Link>
                                <Link
                                    href={`/analysis/report?id=${project.id}`}
                                    className="w-14 h-14 bg-white border border-violet-100 rounded-2xl flex items-center justify-center text-violet-600 hover:bg-violet-600 hover:text-white transition-all shadow-sm"
                                    title="Export Data"
                                >
                                    <FileText className="w-6 h-6" />
                                </Link>
                            </div>

                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50/30 rounded-bl-full -z-0 translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-500" />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
