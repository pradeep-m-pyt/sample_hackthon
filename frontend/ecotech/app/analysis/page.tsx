"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield, Sun, TreeDeciduous, TrendingUp,
    Brain, FileText, ArrowLeft, Loader2,
    AlertTriangle
} from "lucide-react";
import api from "@/lib/api";
import { formatToWords } from "@/lib/utils";

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
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 bg-white">
            <div className="p-8 bg-green-400 border-4 border-black shadow-[8px_8px_0_0_#000] rounded-full relative">
                <Brain className="w-16 h-16 text-black animate-pulse stroke-[3]" />
                <div className="absolute inset-0 rounded-full border-4 border-black border-t-white animate-spin" />
            </div>
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-black tracking-tight uppercase">Eco-Valuation in Progress</h2>
                <p className="text-black font-black uppercase tracking-widest text-xs bg-[#bbf7d0] px-4 py-2 border-2 border-black inline-block shadow-[4px_4px_0_0_#000]">Simulating 30-Year Spectral Data</p>
            </div>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="text-center p-12 bg-[#bbf7d0] border-8 border-black shadow-[16px_16px_0_0_#000]">
                <p className="text-black font-black text-4xl uppercase mb-8">Project Data Missing</p>
                <button onClick={() => router.push("/dashboard")} className="px-8 py-4 bg-black text-white font-black text-xl uppercase tracking-widest hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#22c55e] transition-all shadow-[4px_4px_0_0_#22c55e]">Return to Dashboard</button>
            </div>
        </div>
    );

    const { project, analysis, scenarios } = data;

    return (
        <div className="bg-white min-h-screen font-sans selection:bg-green-400 selection:text-black">
            <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-red-400 border-4 border-black flex items-center gap-4 text-black shadow-[8px_8px_0_0_#000]"
                    >
                        <AlertTriangle className="w-8 h-8 flex-shrink-0 stroke-[3]" />
                        <div className="text-lg font-black uppercase tracking-widest flex-1">{error}</div>
                        <button onClick={() => setError(null)} className="px-6 py-3 bg-white border-2 border-black text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none">DISMISS</button>
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-8 border-black pb-12">
                    <div className="space-y-8">
                        <button
                            onClick={() => router.push("/map")}
                            className="bg-white border-4 border-black px-4 py-2 flex items-center gap-3 text-black hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all text-xs font-black uppercase tracking-widest group w-max"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform stroke-[3]" />
                            Back to Map Canvas
                        </button>
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <h1 className="text-6xl md:text-8xl font-black text-black tracking-tighter uppercase leading-none">{project.name}</h1>
                                <span className="px-6 py-2 bg-green-500 border-4 border-black text-black text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000]">
                                    {project.user_intent}
                                </span>
                            </div>
                            <p className="text-black font-black uppercase tracking-widest text-sm bg-green-200 border-2 border-black px-4 py-2 inline-block shadow-[4px_4px_0_0_#000]">
                                Scope: {(project.area_m2 / 10000).toFixed(2)} Hectares Managed
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <button
                            onClick={() => router.push(`/analysis/report?id=${projectId}`)}
                            className="px-8 py-5 bg-white border-4 border-black text-black font-black text-sm hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#000] transition-all flex items-center gap-4 uppercase tracking-widest shadow-[4px_4px_0_0_#000]"
                        >
                            <FileText className="w-6 h-6 stroke-[3]" />
                            Full PDF Dossier
                        </button>
                        <button
                            onClick={getAIRecommendation}
                            disabled={aiLoading}
                            className="px-8 py-5 bg-black text-green-400 border-4 border-black font-black text-sm hover:-translate-y-2 hover:shadow-[8px_8px_0_0_#22c55e] transition-all shadow-[4px_4px_0_0_#22c55e] flex items-center gap-4 uppercase tracking-widest group disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin stroke-[3]" />
                            ) : (
                                <Brain className="w-6 h-6 group-hover:scale-110 transition-transform stroke-[3]" />
                            )}
                            Generate Intelligence
                        </button>
                    </div>
                </div>

                {/* Main Score & Financials */}
                <div className="grid md:grid-cols-3 gap-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="md:col-span-1 p-10 bg-green-500 border-8 border-black text-black flex flex-col items-center justify-center text-center gap-8 shadow-[12px_12px_0_0_#000]"
                    >
                        <div className="space-y-4">
                            <div className="text-black text-sm font-black uppercase tracking-widest bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_#000] inline-block mb-4">Eco-Decision Index</div>
                            <div className="text-8xl md:text-9xl font-black text-black tracking-tighter leading-none">
                                {analysis.composite_score}
                            </div>
                            <div className="pt-6 border-t-8 border-black text-sm font-black uppercase tracking-widest text-black mt-6 px-4">
                                Strategic equilibrium between ecosystem preservation and capital ROI.
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="md:col-span-2 grid sm:grid-cols-2 gap-10"
                    >
                        <div className="p-10 bg-[#bbf7d0] border-8 border-black shadow-[12px_12px_0_0_#000] flex flex-col justify-between group">
                            <div className="space-y-4 relative z-10">
                                <div className="text-xs font-black text-black bg-white border-2 border-black px-3 py-1 inline-block uppercase tracking-widest shadow-[2px_2px_0_0_#000]">Capital NPV (30yr)</div>
                                <div className="text-5xl font-black text-black tracking-tighter">{formatToWords(analysis.financial_npv)}</div>
                            </div>
                            <p className="text-xs text-black font-black uppercase tracking-widest pt-8 border-t-8 border-black mt-8">Market projection based on strategy</p>
                        </div>

                        <div className="p-10 bg-white border-8 border-black shadow-[12px_12px_0_0_#000] flex flex-col justify-between group">
                            <div className="space-y-4 relative z-10">
                                <div className="text-xs font-black text-white bg-black border-2 border-black px-3 py-1 inline-block uppercase tracking-widest shadow-[2px_2px_0_0_#000]">Environmental Value</div>
                                <div className="text-5xl font-black text-black tracking-tighter">{formatToWords(analysis.environmental_npv)}</div>
                            </div>
                            <p className="text-xs text-black font-black uppercase tracking-widest pt-8 border-t-8 border-black mt-8">Non-market ecosystem services</p>
                        </div>
                    </motion.div>
                </div>

                {/* Engine Cards Section */}
                <div className="grid md:grid-cols-3 gap-10">
                    {/* Flood Card */}
                    <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="p-10 bg-white border-8 border-black shadow-[12px_12px_0_0_#000] space-y-10"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-green-400 border-4 border-black flex items-center justify-center text-black shadow-[6px_6px_0_0_#000] rounded-full">
                                <Shield className="w-10 h-10 stroke-[3]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-black tracking-tighter uppercase leading-none mb-2">Flood Resilience</h3>
                                <div className={`text-[10px] font-black px-3 py-1 border-2 border-black inline-block uppercase tracking-widest shadow-[2px_2px_0_0_#000] ${analysis.flood_json.risk_label === 'High' ? 'bg-red-400 text-black' : 'bg-black text-white'}`}>
                                    {analysis.flood_json.risk_label} RISK
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest border-b-4 border-black pb-4">
                                <span className="text-black">Mean Precipitation</span>
                                <span className="text-black bg-[#bbf7d0] px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">{analysis.flood_json.annual_rainfall_mm.toFixed(0)}mm</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest border-b-4 border-black pb-4">
                                <span className="text-black">Seepage Delta</span>
                                <span className="text-black bg-green-400 px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">+{analysis.flood_json.delta_runoff_mm.toFixed(1)}mm</span>
                            </div>
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-xs text-black uppercase tracking-widest font-black">Stability Index</div>
                                    <div className="text-xl font-black text-black">{((1 - analysis.flood_json.flood_risk_score) * 100).toFixed(0)}%</div>
                                </div>
                                <div className="h-6 w-full bg-white border-4 border-black overflow-hidden shadow-[4px_4px_0_0_#000]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(1 - analysis.flood_json.flood_risk_score) * 100}%` }}
                                        className="h-full bg-black border-r-4 border-black"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Solar Card */}
                    <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="p-10 bg-[#bbf7d0] border-8 border-black shadow-[12px_12px_0_0_#000] space-y-10"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-white border-4 border-black flex items-center justify-center text-black shadow-[6px_6px_0_0_#000] rounded-full">
                                <Sun className="w-10 h-10 stroke-[3]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-black tracking-tighter uppercase leading-none mb-2">Solar Flux</h3>
                                <div className="text-[10px] font-black px-3 py-1 border-2 border-black inline-block bg-black text-yellow-400 uppercase tracking-widest shadow-[2px_2px_0_0_#eab308]">
                                    {analysis.solar_json.avg_daily_ghi_kwh_m2 || '5.4'} kWh/m² DAILY FLUX
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest border-b-4 border-black pb-4">
                                <span className="text-black">Yield Capacity</span>
                                <span className="text-black bg-white px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">{analysis.solar_json.installed_capacity_kwp || '0'} kWp</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest border-b-4 border-black pb-4">
                                <span className="text-black">Capital Payback</span>
                                <span className="text-black bg-white px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">{analysis.solar_json.payback_years} Fiscal Yrs</span>
                            </div>
                            <div className="pt-2">
                                <div className="text-xs text-black uppercase tracking-widest font-black mb-2">Annual Yield Rev</div>
                                <div className="text-4xl font-black text-black bg-black text-yellow-400 px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#000] inline-block tracking-tighter">{formatToWords(analysis.solar_json.annual_revenue_inr)}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Carbon Card */}
                    <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="p-10 bg-white border-8 border-black shadow-[12px_12px_0_0_#000] space-y-10"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-black border-4 border-black flex items-center justify-center text-green-400 shadow-[6px_6px_0_0_#22c55e] rounded-full">
                                <TreeDeciduous className="w-10 h-10 stroke-[3]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-black tracking-tighter uppercase leading-none mb-2">Carbon Sequestration</h3>
                                <div className="text-[10px] font-black px-3 py-1 border-2 border-black inline-block bg-green-400 text-black uppercase tracking-widest shadow-[2px_2px_0_0_#000]">
                                    SCC RATE: ₹{Math.floor(analysis.carbon_json.inputs.scc_usd * analysis.carbon_json.inputs.usd_inr).toLocaleString()}/TON
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest border-b-4 border-black pb-4">
                                <span className="text-black">Total Capture</span>
                                <span className="text-black bg-green-200 px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">{analysis.carbon_json.annual_sequestration_co2_tons} tCO₂/yr</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest border-b-4 border-black pb-4">
                                <span className="text-black">Asset Valuation</span>
                                <span className="text-black bg-green-200 px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">{formatToWords(analysis.carbon_json.stored_carbon_value_inr)}</span>
                            </div>
                            <div className="pt-2">
                                <div className="text-xs text-black uppercase tracking-widest font-black mb-3">Ecosystem Efficiency</div>
                                <div className="h-6 w-full bg-white border-4 border-black overflow-hidden shadow-[4px_4px_0_0_#000]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '65%' }}
                                        className="h-full bg-green-500 border-r-4 border-black"
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
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 md:p-16 bg-black border-8 border-black shadow-[16px_16px_0_0_#22c55e] text-green-400 relative overflow-hidden"
                        >
                            <div className="relative z-10 space-y-12">
                                <div className="flex items-center gap-6 text-green-400 font-black uppercase tracking-widest text-xl">
                                    <div className="w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000]">
                                        <Brain className="w-8 h-8 text-black stroke-[3]" />
                                    </div>
                                    <span className="bg-white text-black px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#000]">AI Strategic Dossier</span>
                                </div>

                                <div className="prose prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap text-white leading-loose text-2xl font-bold tracking-tight bg-green-900/40 p-10 border-4 border-green-500 shadow-[8px_8px_0_0_#000]">
                                        {aiRec}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scenario Table */}
                <div className="space-y-12 bg-white p-12 border-8 border-black shadow-[16px_16px_0_0_#000] mt-16">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b-8 border-black pb-8">
                        <div>
                            <h2 className="text-5xl md:text-6xl font-black text-black tracking-tighter flex items-center gap-6 uppercase">
                                <div className="bg-green-400 p-4 border-4 border-black shadow-[4px_4px_0_0_#000] rounded-full">
                                    <TrendingUp className="w-12 h-12 text-black stroke-[3]" />
                                </div>
                                Projection Models
                            </h2>
                            <p className="text-black font-black uppercase tracking-widest text-sm mt-4 bg-[#bbf7d0] px-4 py-2 border-2 border-black inline-block shadow-[4px_4px_0_0_#000]">Comparative 30-Year Fiscal Scenarios</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-4 border-black">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="px-8 py-6 text-sm font-black uppercase tracking-widest border-r-4 border-black">Strategy Path</th>
                                    <th className="px-8 py-6 text-sm font-black uppercase tracking-widest border-r-4 border-black">Allocation Matrix</th>
                                    <th className="px-8 py-6 text-sm font-black uppercase tracking-widest border-r-4 border-black">Total NPV (30y)</th>
                                    <th className="px-8 py-6 text-sm font-black uppercase tracking-widest border-r-4 border-black">Stability</th>
                                    <th className="px-8 py-6 text-sm font-black uppercase tracking-widest text-right">Execution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-4 divide-black">
                                {scenarios.map((scen: any) => (
                                    <tr key={scen.id} className="group hover:bg-[#bbf7d0] transition-colors">
                                        <td className="px-8 py-10 border-r-4 border-black">
                                            <div className="font-black text-black uppercase text-2xl tracking-tighter">{scen.scenario_type}</div>
                                        </td>
                                        <td className="px-8 py-10 border-r-4 border-black">
                                            <div className="flex flex-wrap gap-4">
                                                {Object.entries(scen.allocation_json).map(([key, val]: any, i) => {
                                                    if (val <= 0) return null;
                                                    const isCurrency = key.toLowerCase().includes("_inr") || key.toLowerCase().includes("cost");
                                                    const cleanLabel = key.replace(/_/g, ' ').replace("inr", "").trim();

                                                    return (
                                                        <div key={i} className="flex items-center justify-between gap-3 bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_#000]">
                                                            <span className="text-[10px] text-black uppercase font-black tracking-widest">{cleanLabel}</span>
                                                            <span className="text-lg font-black text-black">
                                                                {isCurrency ? formatToWords(val) : `${(val * 100).toFixed(0)}%`}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-10 border-r-4 border-black">
                                            <div className="font-black text-black text-3xl tracking-tighter bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_#000] inline-block">{formatToWords(scen.npv_30yr)}</div>
                                        </td>
                                        <td className="px-8 py-10 border-r-4 border-black">
                                            <div className={`px-6 py-3 border-4 border-black text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] inline-block ${scen.risk_score > 0.7 ? 'bg-red-400 text-black' : 'bg-green-400 text-black'}`}>
                                                {scen.risk_score > 0.7 ? 'HIGH VOLATILITY' : 'CAPITAL STABLE'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-10 text-right">
                                            <button className="px-8 py-4 bg-black text-white border-4 border-black text-xs font-black uppercase tracking-widest hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#22c55e] transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0_0_#000]">
                                                SELECT PATH
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
                <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-8 border-8 border-black m-8 shadow-[16px_16px_0_0_#000]">
                    <Loader2 className="w-16 h-16 animate-spin text-black stroke-[3]" />
                    <p className="text-sm font-black text-black bg-[#bbf7d0] px-4 py-2 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_0_#000]">Initializing Data Stream</p>
                </div>
            }
        >
            <AnalysisContent />
        </Suspense>
    );
}
