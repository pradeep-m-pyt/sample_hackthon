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
import { formatToWords } from "@/lib/utils";
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { toPng } from 'html-to-image';
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
            if (projectId === 'live') {
                const stored = localStorage.getItem('ecotech_live_report');
                if (stored) {
                    setData(JSON.parse(stored));
                    return;
                }
            }
            const res = await api.get(`/analysis/results/${projectId}`);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const exportPDF = async () => {
        if (!reportRef.current || isGenerating) return;
        setIsGenerating(true);
        try {
            // html-to-image handles modern CSS (Tailwind v4 / oklch / lab) better than html2canvas
            const dataUrl = await toPng(reportRef.current, {
                quality: 0.95,
                cacheBust: true,
                backgroundColor: "#ffffff",
                pixelRatio: 2
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const img = new Image();
            img.src = dataUrl;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (img.height * imgWidth) / img.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`EcoTech_Strategic_Report_${projectId || 'live'}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to generate PDF. Please ensure all images are loaded.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading || !data) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-8 font-sans">
            <Loader2 className="w-16 h-16 animate-spin text-black stroke-[3]" />
            <p className="text-[12px] font-black text-black bg-green-400 border-4 border-black px-4 py-2 uppercase tracking-[0.4em] shadow-[4px_4px_0_0_#000] animate-pulse">Generating Report Instance</p>
        </div>
    );

    let raw_data: any, scenarios: any;
    if (data.project && data.analysis) {
        const p = data.project;
        const a = data.analysis;
        const s = data.scenarios;

        const yp = s.find((x: any) => x.scenario_type === 'develop');
        const shDB = s.find((x: any) => x.scenario_type === 'hybrid');
        const fc = s.find((x: any) => x.scenario_type === 'preserve');

        const f_json = a.flood_json || {};
        const s_json = a.solar_json || {};
        const c_json = a.carbon_json || {};

        raw_data = {
            ndvi: 0.72,
            canopy_cover: 34,
            flood_risk: f_json.risk_label || "Moderate",
            solar_potential: s_json.avg_daily_ghi_kwh_m2 || 5.2,
            carbon_stock_tonnes: c_json.stored_co2_tons || 20.0,
            water_stress: "stable",
            land_surface_temp: 32.5,
            green_loss_pct: -12.0
        };

        scenarios = {
            your_plan: {
                title: p.user_intent || "Intensive Development",
                total_value: yp?.npv_30yr || 0,
            },
            full_conserve: {
                title: "Keep it Natural",
                total_value: fc?.npv_30yr || 0,
            },
            smart_hybrid: {
                title: "Best of Both",
                total_value: shDB?.npv_30yr || 0,
                optimal_split_green_pct: shDB?.allocation_json?.nature || 0.35,
                breakdown: {
                    dev_profit: shDB?.allocation_json?.net_profit_inr || (a.financial_npv || 0) * 0.6,
                    carbon: c_json.npv_10yr_inr || 0,
                    flood_risk_cost: -(f_json.annual_damage_avoided_inr_per_m2 || 0) * p.area_m2,
                    flood_sav: 0,
                    water_filt: 0,
                    solar: s_json.npv_25yr_inr || 0
                },
                risk: (shDB?.risk_score || 0) > 0.6 ? "High" : "Moderate"
            }
        };
    } else {
        raw_data = data.raw_data || {};
        scenarios = data.scenarios || {};
    }

    const sh = scenarios?.smart_hybrid || {};
    const b = sh?.breakdown || {};

    // Build a generic 30-year projection based on the 10-year smart hybrid values
    const projectionData = Array.from({ length: 31 }, (_, i) => ({
        year: i,
        eco: (((b.carbon || 0) + (b.flood_sav || 0) + (b.water_filt || 0)) / 10) * i,
        financial: (((b.dev_profit || 0) + (b.solar || 0)) / 10) * i,
    }));

    return (
        <div className="bg-white min-h-screen py-20 font-sans selection:bg-green-400 selection:text-black">
            <div className="max-w-6xl mx-auto px-6 space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4 border-b-8 border-black">
                    <div className="space-y-4">
                        <h1 className="text-xs font-black text-black bg-[#bbf7d0] px-4 py-2 border-2 border-black inline-block uppercase tracking-[0.4em] shadow-[4px_4px_0_0_#000]">Strategic Documentation</h1>
                        <p className="text-4xl md:text-5xl font-black text-black tracking-tighter uppercase leading-none">Environmental<br />ROI Policy Brief</p>
                    </div>
                    <button
                        type="button"
                        onClick={exportPDF}
                        disabled={isGenerating}
                        className={`px-10 py-5 bg-black text-green-400 border-4 border-black font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-[4px_4px_0_0_#22c55e] active:translate-y-1 active:shadow-none ${isGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#22c55e]'}`}
                    >
                        {isGenerating ? (
                            <Loader2 className="w-6 h-6 animate-spin text-green-400 stroke-[3]" />
                        ) : (
                            <Download className="w-6 h-6 stroke-[3]" />
                        )}
                        {isGenerating ? "GENERATING..." : "DOWNLOAD PDF DOSSIER"}
                    </button>
                </div>

                {/* THE REPORT CONTAINER */}
                <div ref={reportRef} className="bg-white p-12 md:p-24 border-8 border-black shadow-[16px_16px_0_0_#000] flex flex-col gap-20 relative overflow-hidden">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-black pb-12 relative z-10 w-full">
                        <div className="scale-125 transform origin-left border-4 border-black bg-green-400 px-4 py-2 shadow-[4px_4px_0_0_#000]">
                            <Logo variant="earthy" size={48} />
                        </div>
                        <div className="text-left md:text-right mt-12 md:mt-0 bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000]">
                            <div className="text-[10px] font-black text-black uppercase tracking-[0.4em] mb-2 border-b-2 border-black pb-2">Issue Date</div>
                            <div className="font-black text-black text-2xl uppercase tracking-tighter">{new Date().toLocaleDateString('en-GB')}</div>
                            <div className="text-[10px] text-black bg-green-200 mt-3 px-2 py-1 font-black uppercase tracking-widest border-2 border-black">Instance ID: {projectId?.slice(0, 8) || "N/A"}</div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid md:grid-cols-2 gap-16 relative z-10 w-full">
                        <div className="space-y-8">
                            <h2 className="text-5xl font-black text-black tracking-tighter uppercase bg-green-400 border-4 border-black py-2 px-4 inline-block shadow-[6px_6px_0_0_#000]">Executive Intelligence</h2>
                            <p className="text-black leading-relaxed font-black text-lg border-l-8 border-black pl-6">
                                This strategic brief provides a multi-dimensional valuation for the target parcel,
                                simulating long-term economic flows from ecosystem services against intensive development paths.
                                Analysis parameters include IPCC carbon sequestration benchmarks, USDA rainfall modeling, and NASA spectral irradiance.
                            </p>
                            <div className="grid grid-cols-2 gap-6 pt-6">
                                <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
                                    <div className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-2 border-b-2 border-black pb-2">Target Intent</div>
                                    <div className="text-xl font-black text-black">{scenarios?.your_plan?.title || "N/A"}</div>
                                </div>
                                <div className="p-6 bg-[#bbf7d0] border-4 border-black shadow-[6px_6px_0_0_#000]">
                                    <div className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-2 border-b-2 border-black pb-2">Optimal Green Split</div>
                                    <div className="text-3xl font-black text-black uppercase">{(sh?.optimal_split_green_pct || 0) * 100}%</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-10 border-8 border-black bg-black text-green-400 flex flex-col justify-center gap-8 relative shadow-[12px_12px_0_0_#22c55e] overflow-hidden group">
                            <div className="text-xs font-black text-black bg-green-400 shrink-0 self-start px-3 py-1 uppercase tracking-widest border-2 border-black shadow-[4px_4px_0_0_#000]">Flood Risk Profile</div>
                            <div className="text-7xl font-black tracking-tighter leading-none text-white drop-shadow-md">{raw_data?.flood_risk || "Unknown"}</div>
                            <p className="text-green-400 text-sm font-black leading-relaxed uppercase tracking-widest border-t-4 border-green-500 pt-6">
                                Base Vegetation Health (NDVI): {raw_data?.ndvi || 0} <br />
                                Canopy Cover: {raw_data?.canopy_cover || 0}%
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="space-y-12 pt-12 border-t-8 border-black relative z-10 w-full">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                            <h3 className="text-4xl font-black text-black tracking-tighter flex items-center gap-4 uppercase">
                                <div className="bg-white border-4 border-black p-3 rounded-full shadow-[4px_4px_0_0_#000]">
                                    <TrendingUp className="w-10 h-10 text-black stroke-[3]" />
                                </div>
                                30-Year Capital Flow
                            </h3>
                            <div className="flex items-center gap-8 bg-black text-white px-6 py-3 border-4 border-black shadow-[6px_6px_0_0_#000]">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-green-500 border-2 border-white" />
                                    <span className="text-xs font-black uppercase tracking-widest">Natural Capital</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-white border-2 border-green-500" />
                                    <span className="text-xs font-black uppercase tracking-widest text-[#bbf7d0]">Direct Revenue</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[500px] w-full bg-white p-8 border-8 border-black shadow-[12px_12px_0_0_#000]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData}>
                                    <defs>
                                        <linearGradient id="colorEco" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2} />
                                        </linearGradient>
                                        <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#000000" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#000000" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#000000" />
                                    <XAxis dataKey="year" stroke="#000000" fontSize={12} fill="#000000" fontWeight={900} />
                                    <YAxis tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} stroke="#000000" fontSize={12} fill="#000000" fontWeight={900} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0px', border: '4px solid #000000', boxShadow: '8px 8px 0px 0px #000', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}
                                        formatter={(val: any) => formatToWords(val)}
                                    />
                                    <Area type="monotone" dataKey="eco" name="Nature Value" stroke="#22c55e" strokeWidth={6} fillOpacity={1} fill="url(#colorEco)" />
                                    <Area type="monotone" dataKey="financial" name="Market Value" stroke="#000000" strokeWidth={6} fillOpacity={1} fill="url(#colorFin)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-12 pt-12 relative z-10 w-full">
                        <div className="space-y-6 p-10 bg-white border-8 border-black shadow-[12px_12px_0_0_#000] relative">
                            <div className="absolute top-0 right-0 p-4">
                                <Shield className="w-10 h-10 text-black stroke-[3]" />
                            </div>
                            <div className="text-black font-black text-xs uppercase tracking-widest bg-green-200 border-2 border-black inline-block px-3 py-1 shadow-[2px_2px_0_0_#000]">
                                Total Valuation Target
                            </div>
                            <div className="text-4xl font-black text-black tracking-tighter">{formatToWords(sh?.total_value || 0)} <span className="block text-sm text-black font-black uppercase mt-2 bg-yellow-300 px-2 py-1 border-2 border-black w-max">/ Horizon</span></div>
                            <p className="text-xs text-black font-black leading-relaxed uppercase tracking-widest pt-4 border-t-4 border-black">Combined Hybrid Valuation</p>
                        </div>
                        <div className="space-y-6 p-10 bg-[#bbf7d0] border-8 border-black shadow-[12px_12px_0_0_#000] relative">
                            <div className="absolute top-0 right-0 p-4">
                                <Sun className="w-10 h-10 text-black stroke-[3]" />
                            </div>
                            <div className="text-black font-black text-xs uppercase tracking-widest bg-white border-2 border-black inline-block px-3 py-1 shadow-[2px_2px_0_0_#000]">
                                Energy Target
                            </div>
                            <div className="text-4xl font-black text-black tracking-tighter">{formatToWords(b.solar || 0)} <span className="block text-sm text-black font-black uppercase mt-2 bg-yellow-300 px-2 py-1 border-2 border-black w-max">/ Horizon</span></div>
                            <p className="text-xs text-black font-black leading-relaxed uppercase tracking-widest pt-4 border-t-4 border-black">Expected solar revenue at {raw_data?.solar_potential || 0} kWh/m²/day.</p>
                        </div>
                        <div className="space-y-6 p-10 bg-green-500 border-8 border-black shadow-[12px_12px_0_0_#000] relative">
                            <div className="absolute top-0 right-0 p-4">
                                <TreeDeciduous className="w-10 h-10 text-black stroke-[3]" />
                            </div>
                            <div className="text-black font-black text-xs uppercase tracking-widest bg-white border-2 border-black inline-block px-3 py-1 shadow-[2px_2px_0_0_#000]">
                                Carbon Assets
                            </div>
                            <div className="text-4xl font-black text-black tracking-tighter">{raw_data?.carbon_stock_tonnes || 0} <span className="block text-sm text-black font-black uppercase mt-2 bg-black text-white px-2 py-1 border-2 border-black w-max">Tonnes</span></div>
                            <p className="text-xs text-black font-black leading-relaxed uppercase tracking-widest pt-4 border-t-4 border-black">Stored carbon within biomass via {raw_data?.canopy_cover || 0}% forest canopy.</p>
                        </div>
                    </div>

                    {/* Recommendations Summary */}
                    <div className="p-16 border-8 border-black bg-white text-black space-y-10 shadow-[16px_16px_0_0_#000] relative w-full">
                        <div className="absolute top-0 right-0 flex -mt-8 -mr-8">
                            <div className="bg-black text-white px-4 py-2 border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#22c55e] rotate-[-5deg]">CONFIRMED STRATEGY</div>
                        </div>
                        <h3 className="font-black text-black text-5xl tracking-tighter flex items-center gap-6 uppercase">
                            <div className="bg-green-400 p-4 border-4 border-black rounded-full shadow-[4px_4px_0_0_#000]">
                                <CheckCircle2 className="w-12 h-12 stroke-[3]" />
                            </div>
                            Deployment Config:<br />Smart Hybrid {(sh?.optimal_split_green_pct || 0) * 100}% Green
                        </h3>
                        <p className="text-sm font-black text-black leading-relaxed">
                            The dynamic optimization engine prioritizes mitigating <span className="font-black text-red-600">{formatToWords(Math.abs(b.flood_risk_cost || 0))}</span> in long-term flood and climate risks,
                            which would otherwise severely degrade structural ROI.
                            This configuration protects the <span className="font-black underline decoration-4 underline-offset-4">{formatToWords(b.dev_profit || 0)} developer ROI</span> while securing natural capital.
                        </p>
                    </div>

                    <div className="text-center text-xs font-black text-black bg-green-400 border-4 border-black px-6 py-4 uppercase tracking-[0.4em] shadow-[4px_4px_0_0_#000] mt-10">
                        EcoTech Environmental Systems • Proprietary Intelligence Report
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-8 font-sans">
                <Loader2 className="w-16 h-16 animate-spin text-black stroke-[3]" />
                <p className="text-[12px] font-black text-black bg-green-400 border-4 border-black px-4 py-2 uppercase tracking-[0.4em] shadow-[4px_4px_0_0_#000] animate-pulse">Initializing Data Stream</p>
            </div>
        }>
            <ReportContent />
        </Suspense>
    );
}
