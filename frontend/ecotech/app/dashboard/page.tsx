"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    BarChart3, Plus, MapPin,
    ArrowRight, Loader2,
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
        <div className="flex items-center justify-center min-h-[80vh] bg-white">
            <Loader2 className="w-16 h-16 animate-spin text-black" strokeWidth={3} />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-12 bg-white min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-8 border-black pb-10">
                <div className="space-y-4">
                    <span className="bg-green-400 border-4 border-black px-4 py-2 font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]">Portfolio Hub</span>
                    <h1 className="text-6xl md:text-8xl font-black text-black tracking-tighter uppercase leading-none mt-4">Your <br />Ecosystems</h1>
                </div>
                <Link
                    href="/map"
                    className="px-8 py-5 bg-green-500 text-black border-4 border-black shadow-[8px_8px_0_0_#000] font-black text-lg hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000] active:translate-y-2 active:shadow-none transition-all flex items-center gap-3 group"
                >
                    <Plus className="w-8 h-8 stroke-[4]" />
                    <span className="uppercase tracking-widest">Analyze New Land</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform stroke-[3]" />
                </Link>
            </div>

            {/* Grid */}
            {projects.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 50, rotate: -2 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    className="text-center py-24 bg-white border-8 border-black shadow-[16px_16px_0_0_#000] relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <motion.div
                            whileHover={{ rotate: 180 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="w-32 h-32 bg-green-400 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-8 text-black shadow-[8px_8px_0_0_#000]"
                        >
                            <BarChart3 className="w-16 h-16 stroke-[3]" />
                        </motion.div>
                        <h3 className="text-5xl font-black text-black tracking-tight mb-6 uppercase">No Active Projects</h3>
                        <p className="text-black font-bold max-w-lg mx-auto mb-10 text-xl leading-relaxed border-b-4 border-black pb-8">
                            Your environmental GIS portfolio is empty. Launch the mapping engine to generate your first valuation report.
                        </p>
                        <Link href="/map" className="inline-flex items-center gap-3 text-black font-black uppercase tracking-widest bg-green-300 border-4 border-black px-6 py-3 shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] active:translate-y-1 active:shadow-none transition-all text-xl">
                            Launch Engine <ArrowRight className="w-6 h-6 stroke-[3]" />
                        </Link>
                    </div>
                </motion.div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {projects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, type: "spring", stiffness: 150 }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            className="group relative bg-[#ffffff] border-4 border-black p-8 shadow-[8px_8px_0_0_#000] hover:shadow-[12px_12px_0_0_#000] hover:bg-[#bbf7d0] transition-all flex flex-col gap-6"
                        >
                            <div className="flex justify-between items-start relative z-10 border-b-4 border-black pb-6">
                                <div className="w-16 h-16 bg-green-400 border-4 border-black rounded-full flex items-center justify-center text-black group-hover:rotate-12 transition-all shadow-[4px_4px_0_0_#000]">
                                    <MapPin className="w-8 h-8 stroke-[3]" />
                                </div>
                                <div className="px-4 py-2 bg-white border-4 border-black flex items-center gap-2 text-black shadow-[4px_4px_0_0_#000]">
                                    <Calendar className="w-4 h-4 text-black stroke-[3]" />
                                    <span className="text-xs font-black uppercase tracking-widest">{new Date(project.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <h3 className="text-3xl font-black text-black line-clamp-2 tracking-tight uppercase leading-none">{project.name}</h3>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-sm font-black text-black uppercase tracking-widest bg-white border-2 border-black px-2 py-1">
                                        {(project.area_m2 / 10000).toFixed(2)} HA
                                    </span>
                                    <span className="px-3 py-1 bg-black text-green-400 text-xs font-black uppercase tracking-widest">
                                        {project.dominant_type}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-white border-4 border-black shadow-[4px_4px_0_0_#000] flex flex-col gap-2 mt-auto">
                                <span className="text-xs font-black text-black uppercase tracking-widest">Strategy</span>
                                <span className="text-lg font-black text-black uppercase">{project.user_intent}</span>
                            </div>

                            <div className="flex items-center gap-4 pt-4 relative z-10 border-t-4 border-black mt-4">
                                <Link
                                    href={`/analysis?id=${project.id}`}
                                    className="flex-1 py-4 bg-black text-green-400 border-4 border-black shadow-[4px_4px_0_0_#22c55e] text-sm font-black uppercase tracking-widest text-center hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#22c55e] active:translate-y-1 active:shadow-none transition-all"
                                >
                                    VIEW REPORT
                                </Link>
                                <Link
                                    href={`/analysis/report?id=${project.id}`}
                                    className="w-16 h-16 bg-white border-4 border-black flex items-center justify-center text-black shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:bg-green-300 hover:shadow-[6px_6px_0_0_#000] active:translate-y-1 active:shadow-none transition-all"
                                    title="Export Data"
                                >
                                    <FileText className="w-8 h-8 stroke-[3]" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
