"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, Sun, TreeDeciduous, TrendingUp,
    Brain, FileText, ArrowLeft, Loader2,
    AlertTriangle, CheckCircle, Info
} from "lucide-react";
import api from "@/lib/api";

function AnalysisContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get("id");

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRec, setAiRec] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) {
            loadResults();
        }
    }, [projectId]);

    const loadResults = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/analysis/results/${projectId}`);
            if (res.data.analysis) {
                setData(res.data);
            } else {
                await api.post(`/analysis/run/${projectId}`);
                const finalRes = await api.get(`/analysis/results/${projectId}`);
                setData(finalRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getAIRecommendation = async () => {
        setAiLoading(true);
        try {
            const res = await api.post(`/ai/recommend/${projectId}`);
            setAiRec(res.data.recommendation);
        } catch (err: any) {
            console.error("AI Recommendation Error Detailed:", err);
            setError(err.response?.data?.detail || "AI Analysis failed.");
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 bg-[#FAF7F2]">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
                <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-violet-600 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-indigo-950 tracking-tight">Eco-Valuation in Progress</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Simulating 30-Year Spectral Data</p>
            </div>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
            <div className="text-center p-12 bg-white rounded-[3rem] shadow-2xl border border-violet-100">
                <p className="text-indigo-950 font-black text-xl">Project Data Missing</p>
                <button onClick={() => router.push("/dashboard")} className="mt-4 text-violet-600 font-bold underline">Return to Dashboard</button>
            </div>
        </div>
    );

    const { project, analysis, scenarios } = data;

    return (
        <div className="bg-[#FAF7F2] min-h-screen">
            <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-center gap-4 text-red-600 shadow-xl shadow-red-100/50"
                    >
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                        <div className="text-sm font-black uppercase tracking-wide flex-1">{error}</div>
                        <button onClick={() => setError(null)} className="px-4 py-2 bg-white rounded-xl text-[10px] font-black hover:bg-red-600 hover:text-white transition-all shadow-sm">DISMISS</button>
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-violet-100 pb-12">
                    <div className="space-y-6">
                        <button
                            onClick={() => router.push("/map")}
                            className="flex items-center gap-3 text-slate-400 hover:text-violet-600 transition-all text-[11px] font-black uppercase tracking-[0.2em] group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Map Canvas
                        </button>
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <h1 className="text-5xl font-black text-indigo-950 tracking-tighter">{project.name}</h1>
                                <span className="px-4 py-1.5 bg-violet-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-200">
                                    {project.user_intent}
                                </span>
                            </div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                                Ecosystem Scope: {(project.area_m2 / 10000).toFixed(2)} Hectares Managed
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push(`/analysis/report?id=${projectId}`)}
                            className="px-8 py-5 bg-white border border-violet-100 text-indigo-950 rounded-[1.5rem] font-black text-sm hover:border-violet-300 hover:shadow-xl transition-all flex items-center gap-3 shadow-sm"
                        >
                            <FileText className="w-5 h-5 text-violet-600" />
                            Full PDF Dossier
                        </button>
                        <button
                            onClick={getAIRecommendation}
                            disabled={aiLoading}
                            className="px-8 py-5 bg-violet-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-violet-700 transition-all shadow-2xl shadow-violet-200 flex items-center gap-3 group disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            )}
                            Generate AI Intelligence
                        </button>
                    </div>
                </div>

                {/* Main Score & Financials */}
                <div className="grid md:grid-cols-3 gap-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="md:col-span-1 p-10 rounded-[3rem] bg-indigo-950 text-white flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl -translate-y-12 translate-x-12" />
                        <div className="relative z-10 space-y-2">
                            <div className="text-violet-300/60 text-[10px] font-black uppercase tracking-[0.4em]">Eco-Decision Index</div>
                            <div className="text-8xl font-black text-white tracking-widest leading-none drop-shadow-2xl">
                                {analysis.composite_score}
                            </div>
                            <div className="pt-4 border-t border-white/5 text-[11px] text-violet-200/50 font-medium leading-relaxed">
                                Strategic equilibrium between ecosystem preservation and capital ROI.
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-2 grid sm:grid-cols-2 gap-6"
                    >
                        <div className="p-10 rounded-[3rem] bg-white border border-violet-100 shadow-xl shadow-violet-50 flex flex-col justify-between group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-bl-full -z-0 translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform" />
                            <div className="space-y-2 relative z-10">
                                <div className="text-[10px] font-black text-violet-600 uppercase tracking-[0.3em]">Capital NPV (30yr)</div>
                                <div className="text-4xl font-black text-indigo-950">₹{analysis.financial_npv.toLocaleString()}</div>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pt-8 border-t border-violet-50 relative z-10">Market projection based on strategy</p>
                        </div>

                        <div className="p-10 rounded-[3rem] bg-white border border-violet-100 shadow-xl shadow-violet-50 flex flex-col justify-between group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-0 translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform" />
                            <div className="space-y-2 relative z-10">
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Environmental Value</div>
                                <div className="text-4xl font-black text-indigo-950">₹{analysis.environmental_npv.toLocaleString()}</div>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pt-8 border-t border-violet-50 relative z-10">Non-market ecosystem services</p>
                        </div>
                    </motion.div>
                </div>

                {/* Engine Cards Section */}
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Flood Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-[2.5rem] bg-white border border-violet-100 shadow-xl shadow-violet-100/50 space-y-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-violet-50 rounded-[1.5rem] flex items-center justify-center text-violet-600 shadow-inner">
                                <Shield className="w-8 h-8 stroke-[2.5]" />
                            </div>
                            <div>
                                <h3 className="font-black text-indigo-950 tracking-tight">Flood Resilience</h3>
                                <div className={`text-[9px] font-black px-3 py-1 mt-1 rounded-lg inline-block uppercase tracking-widest shadow-sm ${analysis.flood_json.risk_label === 'High' ? 'bg-red-50 text-red-600' : 'bg-violet-600 text-white'}`}>
                                    {analysis.flood_json.risk_label} RISK PROFILE
                                </div>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest border-b border-violet-50 pb-3">
                                <span className="text-slate-400">Mean Precipitation</span>
                                <span className="text-indigo-950">{analysis.flood_json.annual_rainfall_mm.toFixed(0)}mm</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest border-b border-violet-50 pb-3">
                                <span className="text-slate-400">Seepage Delta</span>
                                <span className="text-violet-600">+{analysis.flood_json.delta_runoff_mm.toFixed(1)}mm</span>
                            </div>
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black">Stability Index</div>
                                    <div className="text-[11px] font-black text-indigo-950">{((1 - analysis.flood_json.flood_risk_score) * 100).toFixed(0)}%</div>
                                </div>
                                <div className="h-3 w-full bg-violet-50 rounded-full overflow-hidden shadow-inner p-0.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(1 - analysis.flood_json.flood_risk_score) * 100}%` }}
                                        className="h-full bg-violet-600 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Solar Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-[2.5rem] bg-white border border-violet-100 shadow-xl shadow-violet-100/50 space-y-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-amber-50 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-inner">
                                <Sun className="w-8 h-8 stroke-[2.5]" />
                            </div>
                            <div>
                                <h3 className="font-black text-indigo-950 tracking-tight">Solar Flux</h3>
                                <div className="text-[9px] font-black px-3 py-1 mt-1 rounded-lg inline-block bg-amber-500 text-white uppercase tracking-widest shadow-sm">
                                    {analysis.solar_json.irradiance_kwh_m2_day || '5.4'} kWh/m² DAILY FLUX
                                </div>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest border-b border-violet-50 pb-3">
                                <span className="text-slate-400">Yield Capacity</span>
                                <span className="text-indigo-950">{analysis.solar_json.installed_capacity_kw} kWp</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest border-b border-violet-50 pb-3">
                                <span className="text-slate-400">Capital Payback</span>
                                <span className="text-amber-600">{analysis.solar_json.payback_years} Fiscal Years</span>
                            </div>
                            <div className="pt-2">
                                <div className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black mb-1">Annual Yield Revenue</div>
                                <div className="text-2xl font-black text-indigo-950 tracking-tight">₹{analysis.solar_json.annual_revenue_inr.toLocaleString()}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Carbon Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-[2.5rem] bg-white border border-violet-100 shadow-xl shadow-violet-100/50 space-y-8 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-inner">
                                <TreeDeciduous className="w-8 h-8 stroke-[2.5]" />
                            </div>
                            <div>
                                <h3 className="font-black text-indigo-950 tracking-tight">Carbon Sequestration</h3>
                                <div className="text-[9px] font-black px-3 py-1 mt-1 rounded-lg inline-block bg-emerald-600 text-white uppercase tracking-widest shadow-sm">
                                    SCC RATE: ₹4,233/Ton
                                </div>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest border-b border-violet-50 pb-3">
                                <span className="text-slate-400">Total Capture</span>
                                <span className="text-indigo-950">{analysis.carbon_json.annual_sequestration_co2_tons} tCO₂/yr</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest border-b border-violet-50 pb-3">
                                <span className="text-slate-400">Asset Valuation</span>
                                <span className="text-emerald-600">₹{analysis.carbon_json.stored_carbon_value_inr.toLocaleString()}</span>
                            </div>
                            <div className="pt-2">
                                <div className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black mb-1">Ecosystem Efficiency</div>
                                <div className="h-3 w-full bg-violet-50 rounded-full overflow-hidden shadow-inner p-0.5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '65%' }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* AI Recommendation Panel */}
                <AnimatePresence>
                    {aiRec && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-12 rounded-[4rem] bg-indigo-950 text-white relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-800/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-12" />

                            <div className="relative z-10 space-y-10">
                                <div className="flex items-center gap-4 text-violet-300 font-black uppercase tracking-[0.4em] text-xs">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Brain className="w-6 h-6" />
                                    </div>
                                    AI Strategic Dossier
                                </div>

                                <div className="prose prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap text-violet-50 leading-[2] text-xl font-medium tracking-tight">
                                        {aiRec}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scenario Table */}
                <div className="space-y-10 bg-white p-12 rounded-[4rem] border border-violet-100 shadow-2xl shadow-violet-100/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-violet-50 pb-8">
                        <div>
                            <h2 className="text-4xl font-black text-indigo-950 tracking-tighter flex items-center gap-4">
                                <TrendingUp className="w-10 h-10 text-violet-600" />
                                Projection Models
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Comparative 30-Year Fiscal Scenarios</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-violet-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Strategy Path</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Allocation Matrix</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total NPV (30y)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stability</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Execution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-violet-50">
                                {scenarios.map((scen: any) => (
                                    <tr key={scen.id} className="group hover:bg-violet-50/50 transition-colors">
                                        <td className="px-6 py-8">
                                            <div className="font-black text-indigo-950 capitalize text-lg tracking-tight">{scen.scenario_type}</div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="flex flex-wrap gap-3">
                                                {Object.entries(scen.allocation_json).map(([key, val]: any, i) => (
                                                    val > 0 && (
                                                        <div key={i} className="flex items-center gap-2 bg-white border border-violet-100 px-3 py-1.5 rounded-xl shadow-sm">
                                                            <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{key}</span>
                                                            <span className="text-xs font-black text-indigo-950">{(val * 100).toFixed(0)}%</span>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="font-black text-indigo-950 text-xl tracking-tight">₹{scen.npv_30yr.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className={`px-4 py-1.5 rounded-full inline-block text-[9px] font-black tracking-widest shadow-sm ${scen.risk_score > 0.7 ? 'bg-red-50 text-red-600' : 'bg-indigo-950 text-white'}`}>
                                                {scen.risk_score > 0.7 ? 'HIGH VOLATILITY' : 'CAPITAL STABLE'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right">
                                            <button className="px-6 py-3 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-950 transition-all shadow-lg shadow-violet-100">
                                                Select Path
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF7F2] gap-6">
                    <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Initializing Data Stream</p>
                </div>
            }
        >
            <AnalysisContent />
        </Suspense>
    );
}
