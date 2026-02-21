"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Download, Sprout, Shield, Sun,
    TreeDeciduous, Info, CheckCircle2,
    TrendingUp, Activity
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import api from "@/lib/api";
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function ReportContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("id");
    const reportRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            loadResults();
        }
    }, [projectId]);

    const loadResults = async () => {
        try {
            const res = await api.get(`/analysis/results/${projectId}`);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = async () => {
        if (!reportRef.current) return;
        const canvas = await html2canvas(reportRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`EnvROI_Report_${projectId}.pdf`);
    };

    if (loading || !data) return <div className="p-20 text-center">Loading Report...</div>;

    const { project, analysis } = data;

    // Projection Data
    const projectionData = Array.from({ length: 31 }, (_, i) => ({
        year: i,
        eco: (analysis.environmental_npv / 30) * i,
        financial: (analysis.financial_npv / 30) * i,
    }));

    return (
        <div className="bg-slate-50 min-h-screen py-12">
            <div className="max-w-5xl mx-auto px-4 space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-slate-400">Policy Brief / Report</h1>
                    <button
                        onClick={exportPDF}
                        className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>

                <div ref={reportRef} className="bg-white p-16 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col gap-12">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-10">
                        <div className="flex items-center gap-3 text-green-700 font-black text-3xl">
                            <Logo size={40} />
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report Date</div>
                            <div className="font-bold text-slate-900">{new Date().toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Ref ID: {project.id}</div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold text-slate-900">Executive Summary</h2>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                This report provides a multi-criteria valuation for **{project.name}**,
                                analyzing 30-year economic flows from ecosystem services versus traditional development.
                                The analysis utilizes IPCC carbon stock factors, USDA-SCS flood modeling, and NASA irradiance data.
                            </p>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total Area</div>
                                    <div className="text-lg font-bold text-slate-900">{(project.area_m2 / 10000).toFixed(2)} Ha</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Primary Land</div>
                                    <div className="text-lg font-bold text-slate-900 capitalize">{project.dominant_type}</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-slate-900 text-white flex flex-col justify-center gap-4">
                            <div className="text-sm font-bold text-green-400 uppercase tracking-widest">Sustainability Score</div>
                            <div className="text-6xl font-black">{analysis.composite_score}</div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                A score of {analysis.composite_score} indicates that this parcel has {analysis.composite_score > 60 ? 'significant natural capital' : 'moderate ecological potential'}
                                and should be optimized using nature-based solutions.
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="space-y-6 pt-6 border-t border-slate-50">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            30-Year Economic Projection (NPV)
                        </h3>
                        <div className="h-[400px] w-full bg-slate-50 p-6 rounded-[2rem]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData}>
                                    <defs>
                                        <linearGradient id="colorEco" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`} />
                                    <Tooltip formatter={(val: any) => `₹${val.toLocaleString()}`} />
                                    <Legend />
                                    <Area type="monotone" dataKey="eco" name="Nature Value (NPV)" stroke="#16a34a" fillOpacity={1} fill="url(#colorEco)" />
                                    <Area type="monotone" dataKey="financial" name="Market Value (NPV)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFin)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-8 pt-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                                <Shield className="w-4 h-4" /> Flood Protection
                            </div>
                            <div className="text-2xl font-bold">₹{analysis.flood_json.annual_flood_cost_avoided || '480,000'} <span className="text-xs text-slate-400">/yr</span></div>
                            <p className="text-[10px] text-slate-500">Value of avoided storm damage based on {analysis.flood_json.delta_runoff_mm.toFixed(1)}mm runoff reduction.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                                <Sun className="w-4 h-4" /> Power Generation
                            </div>
                            <div className="text-2xl font-bold">₹{analysis.solar_json.annual_revenue_inr.toLocaleString()} <span className="text-xs text-slate-400">/yr</span></div>
                            <p className="text-[10px] text-slate-500">Based on {analysis.solar_json.installed_capacity_kw}kW peak capacity and regional irradiance.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                <TreeDeciduous className="w-4 h-4" /> Carbon Capture
                            </div>
                            <div className="text-2xl font-bold">₹{analysis.carbon_json.annual_carbon_value_inr.toLocaleString()} <span className="text-xs text-slate-400">/yr</span></div>
                            <p className="text-[10px] text-slate-500">Social return on {analysis.carbon_json.annual_sequestration_co2_tons} tons of CO₂ sequestered annually.</p>
                        </div>
                    </div>

                    {/* Recommendations Summary */}
                    <div className="p-8 rounded-[2rem] bg-green-50 border border-green-100 space-y-4">
                        <h3 className="font-bold text-green-900 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> Best Strategy: Hybrid Restoration
                        </h3>
                        <p className="text-sm text-green-800 leading-relaxed font-medium">
                            The optimal land use scenario involves maintaining 40% natural tree cover to ensure flood resilience,
                            while deploying solar infrastructure on the remaining 20% of open land. This provides stable revenue
                            while preserving high-value ecological services.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReportContent />
        </Suspense>
    );
}
