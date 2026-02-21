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
            // First try to get existing results
            const res = await api.get(`/analysis/results/${projectId}`);
            if (res.data.analysis) {
                setData(res.data);
            } else {
                // Trigger analysis if not exists
                const runRes = await api.post(`/analysis/run/${projectId}`);
                // Fetch again to get full structure
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
            console.error("AI Recommendation Error Detailed:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                headers: err.response?.headers,
                config: err.config
            });
            setError(err.response?.data?.detail || "AI Analysis failed. Check console for details.");
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">Running Eco-Valuation Engines</h2>
                <p className="text-slate-500">Processing rainfall, irradiance, and carbon stock data...</p>
            </div>
        </div>
    );

    if (!data) return <div>Project not found.</div>;

    const { project, analysis, scenarios } = data;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
            {error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600"
                >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-sm font-medium flex-1">{error}</div>
                    <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">Dismiss</button>
                </motion.div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <button onClick={() => router.push("/map")} className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors text-sm font-medium mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Map
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold text-slate-900">{project.name}</h1>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-widest">
                            {project.user_intent}
                        </span>
                    </div>
                    <p className="text-slate-500">Analysis completed for {(project.area_m2 / 10000).toFixed(2)} hectares</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/analysis/report?id=${projectId}`)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <FileText className="w-5 h-5" />
                        Full Report
                    </button>
                    <button
                        onClick={getAIRecommendation}
                        disabled={aiLoading}
                        className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center gap-2 group"
                    >
                        {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                        AI Insights
                    </button>
                </div>
            </div>

            {/* Main Score & Financials */}
            <div className="grid md:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="md:col-span-1 p-8 rounded-[2.5rem] bg-slate-900 text-white flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Eco-Fin Decision Score</div>
                    <div className="text-7xl font-black text-green-400">{analysis.composite_score}</div>
                    <div className="text-sm text-slate-400 max-w-[200px]">Strategic balance of ecosystem value and financial return</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="md:col-span-2 grid sm:grid-cols-2 gap-4"
                >
                    <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Environmental NPV</div>
                            <div className="text-3xl font-bold text-slate-900">₹{analysis.environmental_npv.toLocaleString()}</div>
                        </div>
                        <p className="text-xs text-slate-500 pt-4 leading-relaxed">Estimated 30-year economic value of carbon, flood prevention, and solar potential.</p>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">Financial Projection</div>
                            <div className="text-3xl font-bold text-slate-900">₹{analysis.financial_npv.toLocaleString()}</div>
                        </div>
                        <p className="text-xs text-slate-500 pt-4 leading-relaxed">Estimated 30-year profit if land is fully developed/leased based on intensity.</p>
                    </div>
                </motion.div>
            </div>

            {/* Engine Cards Section */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Flood Card */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Flood Mitigation</h3>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${analysis.flood_json.risk_label === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {analysis.flood_json.risk_label.toUpperCase()} RISK
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Annual Rainfall</span>
                            <span className="font-semibold text-slate-900">{analysis.flood_json.annual_rainfall_mm.toFixed(0)}mm</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Runoff Reduction</span>
                            <span className="font-semibold text-blue-600">{analysis.flood_json.delta_runoff_mm.toFixed(1)}mm</span>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Impact Score</div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${(1 - analysis.flood_json.flood_risk_score) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Solar Card */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Sun className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Solar Potential</h3>
                            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-amber-100 text-amber-700">
                                {analysis.solar_json.irradiance_kwh_m2_day || '5.4'} kWh/m² DAILY
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Capacity Est.</span>
                            <span className="font-semibold text-slate-900">{analysis.solar_json.installed_capacity_kw} kW</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Est. Payback</span>
                            <span className="font-semibold text-amber-600">{analysis.solar_json.payback_years} Years</span>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Annual Revenue</div>
                            <div className="text-lg font-bold text-slate-900">₹{analysis.solar_json.annual_revenue_inr.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Carbon Card */}
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <TreeDeciduous className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Carbon Stock</h3>
                            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-emerald-100 text-emerald-700 text-nowrap">
                                SCC VALUATION: ₹4,233/Ton
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Total Sequestration</span>
                            <span className="font-semibold text-slate-900">{analysis.carbon_json.annual_sequestration_co2_tons} tCO₂/yr</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Stored Value</span>
                            <span className="font-semibold text-emerald-600">₹{analysis.carbon_json.stored_carbon_value_inr.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Capturing Efficiency</div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: '65%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Recommendation Panel */}
            <AnimatePresence>
                {aiRec && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-10 rounded-[3rem] bg-green-50 border border-green-200 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Brain className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3 text-green-700 font-bold uppercase tracking-widest text-sm">
                                <Brain className="w-5 h-5" />
                                AI Strategic Recommendation
                            </div>

                            <div className="prose prose-green max-w-none">
                                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-medium">
                                    {aiRec}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scenario Table */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    Future Growth Scenarios
                </h2>

                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Scenario Type</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Allocation Split</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">30yr NPV</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Level</th>
                                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scenarios.map((scen: any) => (
                                <tr key={scen.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-900 capitalize">{scen.scenario_type}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {Object.entries(scen.allocation_json).map(([key, val]: any, i) => (
                                                val > 0 && (
                                                    <div key={i} className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 uppercase font-black">{key}</span>
                                                        <span className="text-sm font-bold">{(val * 100).toFixed(0)}%</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-slate-900">₹{scen.npv_30yr.toLocaleString()}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${scen.risk_score > 0.7 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {scen.risk_score > 0.7 ? 'HIGH' : 'STABLE'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-green-600 font-bold cursor-pointer hover:underline underline-offset-4">
                                        Select
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>}>
            <AnalysisContent />
        </Suspense>
    );
}
