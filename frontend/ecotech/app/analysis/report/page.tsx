"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Download, Sprout, Shield, Sun,
    TreeDeciduous, Info, CheckCircle2,
    TrendingUp, Activity, Loader2
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
        pdf.save(`EcoTech_Dossier_${projectId}.pdf`);
    };

    if (loading || !data) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Generating Report Instance</p>
        </div>
    );

    const { project, analysis } = data;

    const projectionData = Array.from({ length: 31 }, (_, i) => ({
        year: i,
        eco: (analysis.environmental_npv / 30) * i,
        financial: (analysis.financial_npv / 30) * i,
    }));

    return (
        <div className="bg-[#FAF7F2] min-h-screen py-16">
            <div className="max-w-5xl mx-auto px-6 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Strategic Documentation</h1>
                        <p className="text-2xl font-black text-indigo-950 tracking-tight">Environmental ROI Policy Brief</p>
                    </div>
                    <button
                        onClick={exportPDF}
                        className="px-8 py-4 bg-indigo-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-indigo-100"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF Dossier
                    </button>
                </div>

                <div ref={reportRef} className="bg-white p-20 rounded-[4rem] shadow-2xl border border-violet-50 flex flex-col gap-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-50/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-violet-100 pb-12 relative z-10">
                        <Logo variant="lavender" size={48} />
                        <div className="text-left md:text-right mt-6 md:mt-0">
                            <div className="text-[9px] font-black text-violet-400 uppercase tracking-[0.3em]">Issue Date</div>
                            <div className="font-black text-indigo-950 text-lg uppercase">{new Date().toLocaleDateString('en-GB')}</div>
                            <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Instance ID: {project.id.slice(0, 8)}</div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid md:grid-cols-2 gap-16 relative z-10">
                        <div className="space-y-6">
                            <h2 className="text-4xl font-black text-indigo-950 tracking-tighter">Executive Intelligence</h2>
                            <p className="text-slate-500 leading-relaxed font-bold text-sm">
                                This strategic brief provides a multi-dimensional valuation for <span className="text-violet-600">“{project.name}”</span>,
                                simulating 30-year economic flows from ecosystem services against intensive development paths.
                                Analysis parameters include IPCC carbon sequestration benchmarks, USDA rainfall modeling, and NASA spectral irradiance.
                            </p>
                            <div className="grid grid-cols-2 gap-6 pt-6">
                                <div className="p-6 bg-violet-50/50 rounded-[2rem] border border-violet-100">
                                    <div className="text-[8px] font-black text-violet-400 uppercase tracking-[0.2em] mb-1">Managed Area</div>
                                    <div className="text-xl font-black text-indigo-950">{(project.area_m2 / 10000).toFixed(2)} HA</div>
                                </div>
                                <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100">
                                    <div className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Dominant Type</div>
                                    <div className="text-xl font-black text-indigo-950 capitalize">{project.dominant_type}</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-10 rounded-[3rem] bg-indigo-950 text-white flex flex-col justify-center gap-6 relative shadow-2xl overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 rounded-full blur-3xl" />
                            <div className="text-[10px] font-black text-violet-400 uppercase tracking-[0.4em]">Eco-Stability Score</div>
                            <div className="text-8xl font-black tracking-widest leading-none text-white drop-shadow-2xl">{analysis.composite_score}</div>
                            <p className="text-violet-100/60 text-xs font-bold leading-relaxed uppercase tracking-wide border-t border-white/5 pt-6">
                                Index {analysis.composite_score} confirms {analysis.composite_score > 60 ? 'high priority restoration' : 'moderate transition'} potential for this site.
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="space-y-8 pt-8 border-t border-violet-100 relative z-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-indigo-950 tracking-tighter flex items-center gap-4">
                                <TrendingUp className="w-8 h-8 text-violet-600" />
                                30-Year Capital Flow Projection
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-violet-600 rounded-full" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Natural Capital</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-indigo-950 rounded-full" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Direct Revenue</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[450px] w-full bg-white p-8 rounded-[3rem] border border-violet-50 shadow-inner">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData}>
                                    <defs>
                                        <linearGradient id="colorEco" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1e1b4b" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#1e1b4b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} fontWeight={900} />
                                    <YAxis tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`} stroke="#94a3b8" fontSize={10} fontWeight={900} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '24px', border: '1px solid #f1f5f9', fontWeight: 900, fontSize: '12px' }}
                                        formatter={(val: any) => `₹${val.toLocaleString()}`}
                                    />
                                    <Area type="monotone" dataKey="eco" name="Nature Value" stroke="#7c3aed" strokeWidth={4} fillOpacity={1} fill="url(#colorEco)" />
                                    <Area type="monotone" dataKey="financial" name="Market Value" stroke="#1e1b4b" strokeWidth={4} fillOpacity={1} fill="url(#colorFin)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-12 pt-12 relative z-10">
                        <div className="space-y-4 p-8 rounded-[2.5rem] bg-white border border-violet-50 shadow-sm group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-3 text-violet-600 font-black text-[10px] uppercase tracking-widest">
                                <Shield className="w-4 h-4" /> Storm Resilience
                            </div>
                            <div className="text-3xl font-black text-indigo-950 tracking-tight">₹{analysis.flood_json.annual_flood_cost_avoided || '480,000'} <span className="text-[10px] text-slate-400 font-bold uppercase ml-2">/ Annum</span></div>
                            <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-wide">Avoided mitigation costs via {analysis.flood_json.delta_runoff_mm.toFixed(1)}mm sequestration.</p>
                        </div>
                        <div className="space-y-4 p-8 rounded-[2.5rem] bg-white border border-violet-50 shadow-sm group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-3 text-amber-500 font-black text-[10px] uppercase tracking-widest">
                                <Sun className="w-4 h-4" /> Energy Yield
                            </div>
                            <div className="text-3xl font-black text-indigo-950 tracking-tight">₹{analysis.solar_json.annual_revenue_inr.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase ml-2">/ Annum</span></div>
                            <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-wide">Expected revenue from {analysis.solar_json.installed_capacity_kw}kWp spectral optimization.</p>
                        </div>
                        <div className="space-y-4 p-8 rounded-[2.5rem] bg-white border border-violet-50 shadow-sm group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                                <TreeDeciduous className="w-4 h-4" /> Carbon Assets
                            </div>
                            <div className="text-3xl font-black text-indigo-950 tracking-tight">₹{analysis.carbon_json.annual_carbon_value_inr.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase ml-2">/ Annum</span></div>
                            <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-wide">Social return on {analysis.carbon_json.annual_sequestration_co2_tons} tons of organic capture.</p>
                        </div>
                    </div>

                    {/* Recommendations Summary */}
                    <div className="p-12 rounded-[3.5rem] bg-violet-600 text-white space-y-6 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-12 translate-x-12" />
                        <h3 className="font-black text-white text-2xl tracking-tight flex items-center gap-4">
                            <CheckCircle2 className="w-8 h-8" /> Deployment Configuration: Hybrid Optimal
                        </h3>
                        <p className="text-lg text-violet-50 leading-relaxed font-bold tracking-tight relative z-10">
                            The suggested matrix prioritizes maintaining 40% indigenous canopy for hydrology stability,
                            supplemented by a 20% solar array in high-irradiance zones. This configuration maximizes
                            immediate fiscal IRR while securing long-term natural capital value for institutional investors.
                        </p>
                    </div>
                </div>

                <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] pb-12">
                    EcoTech Environmental Systems • Proprietary Intelligence Report
                </div>
            </div>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-vh-screen bg-[#FAF7F2]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        }>
            <ReportContent />
        </Suspense>
    );
}
