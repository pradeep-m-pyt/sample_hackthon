"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sprout, MapPin, Loader2, ArrowRight,
    Search, X, Building2, Globe, TreePine, Zap,
    TrendingUp, ShieldAlert, Droplets, Thermometer,
    DownloadCloud, Info, ChevronLeft, TreeDeciduous, Activity, Sparkles, Brain
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import api from "@/lib/api";
import { formatToWords } from "@/lib/utils";

const SmartMap = dynamic(() => import("@/components/Map/SmartMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-white flex items-center justify-center border-l-4 border-black">
            <Loader2 className="w-12 h-12 text-black animate-spin" strokeWidth={3} />
        </div>
    ),
}) as React.ComponentType<any>;

// Types & Options
interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

const LAND_TYPES = [
    "Farmland",
    "Wetland",
    "Degraded / Barren Land",
    "Forest / Green Cover",
    "Empty Urban Plot",
    "Residential Plot",
    "Coastal Land"
];

const INTENT_OPTIONS = [
    { value: "Build Housing (Residential)", label: "Build Housing", icon: Building2 },
    { value: "Build Commercial Complex", label: "Commercial", icon: Building2 },
    { value: "Set up Solar Farm", label: "Solar Farm", icon: Zap },
    { value: "Continue Farming", label: "Keep Farming", icon: Sprout },
    { value: "Lease for Industry", label: "Industrial", icon: Building2 },
    { value: "Eco-Tourism / Conservation", label: "Eco-Tourism", icon: TreePine },
    { value: "Not Sure — Show Me Best Option", label: "Automated Best", icon: Globe },
];

export default function SmartHybridPage() {
    const router = useRouter();
    const flyToRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null);

    // Flow State
    const [currentScreen, setCurrentScreen] = useState<number>(1);

    // Screen 1 Inputs
    const [area, setArea] = useState<string>("10000"); // m2 default
    const [landType, setLandType] = useState(LAND_TYPES[0]);
    const [intent, setIntent] = useState(INTENT_OPTIONS[0].value);
    const [investment, setInvestment] = useState<string>("5000000");
    const [timeline, setTimeline] = useState<number>(10);

    // API Data state
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Map State
    const [manualLat, setManualLat] = useState("13.0827");
    const [manualLng, setManualLng] = useState("80.2707");
    const [polygon, setPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [legendOpen, setLegendOpen] = useState(false);

    const LEGEND_TERMS = [
        {
            term: "Carbon Sequestration",
            definition: "The capture and storage of atmospheric CO2 in trees and soil to mitigate climate warming.",
            icon: TreeDeciduous
        },
        {
            term: "NDVI Health",
            definition: "Satellite-derived index mapping vegetation density and wellness via infra-red light reflection.",
            icon: Activity
        },
        {
            term: "Canopy Cover",
            definition: "Percentage of land shaded by tree crowns; critical for micro-climate and habitat density.",
            icon: Sprout
        },
        {
            term: "Flood Resilience",
            definition: "The ground's capacity to absorb rainfall (seepage), preventing runoff damage and soil erosion.",
            icon: ShieldAlert
        },
        {
            term: "Solar Flux",
            definition: "Total solar radiation (GHI) hitting the land surface, used to calculate daily energy yield.",
            icon: Zap
        },
        {
            term: "Natural Capital",
            definition: "The estimated financial value of nature's services (clean water, carbon capture) over 30 years.",
            icon: TrendingUp
        }
    ];

    // AI Pre-Analysis State
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    // Screen 3/5 Toggles
    const [layers, setLayers] = useState({ veg: false, flood: false, solar: false });
    const [sliderValue, setSliderValue] = useState(50); // % Green

    // ── Nominatim Search ─────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchInput = (value: string) => {
        setSearchQuery(value);
        setShowDropdown(false);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!value.trim() || value.length < 3) {
            setSearchResults([]);
            return;
        }
        searchTimeout.current = setTimeout(() => { searchPlace(value); }, 400);
    };

    const searchPlace = async (query: string) => {
        setSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`);
            const results = await res.json();
            setSearchResults(results);
            setShowDropdown(true);
        } catch { } finally { setSearching(false); }
    };

    const handleSelectPlace = (place: NominatimResult) => {
        setSearchQuery(place.display_name.split(",")[0]);
        setShowDropdown(false);
        setAiRecommendation(null);
        const llat = parseFloat(place.lat);
        const llng = parseFloat(place.lon);
        setManualLat(place.lat);
        setManualLng(place.lon);
        if (flyToRef.current) flyToRef.current(llat, llng, 16);
    };

    // ── Pre-Analysis AI Call ─────────────────────────────────────────────
    const fetchPreAnalysis = async (lat: number, lng: number) => {
        setLoadingAi(true);
        setAiRecommendation(null);
        try {
            const res = await fetch("http://localhost:8000/land/pre-analyse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat, lon: lng })
            });
            const data = await res.json();
            if (data && data.recommendation) {
                setAiRecommendation(data.recommendation);
            }
        } catch (err) {
            console.error("AI Pre-Analysis failed:", err);
        } finally {
            setLoadingAi(false);
        }
    };

    // ── Smart Analysis API Call ──────────────────────────────────────────
    const handleAnalyze = async () => {
        setLoading(true);
        setCurrentScreen(2); // Jump to Scanning
        setIsScanning(true);

        try {
            // Wait slightly for animation effect
            await new Promise((r) => setTimeout(r, 2000));

            // Build pseudo-polygon if empty
            if (!polygon) {
                const l_lat = parseFloat(manualLat);
                const l_lng = parseFloat(manualLng);
                if (!isNaN(l_lat) && !isNaN(l_lng)) {
                    if (flyToRef.current) flyToRef.current(l_lat, l_lng, 16);
                }
            }

            const payload = {
                lat: parseFloat(manualLat),
                lon: parseFloat(manualLng),
                area_m2: parseFloat(area),
                landType,
                plan: intent,
                investment: parseFloat(investment),
                timeline
            };

            const response = await fetch("http://localhost:8000/land/smart-analyse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            setAnalysisData(data);

            // SAVE TO DB FOR DASHBOARD:
            try {
                // Approximate a simple polygon box if not hand-drawn
                const p = polygon || [
                    { lat: parseFloat(manualLat) - 0.001, lng: parseFloat(manualLng) - 0.001 },
                    { lat: parseFloat(manualLat) + 0.001, lng: parseFloat(manualLng) - 0.001 },
                    { lat: parseFloat(manualLat) + 0.001, lng: parseFloat(manualLng) + 0.001 },
                    { lat: parseFloat(manualLat) - 0.001, lng: parseFloat(manualLng) + 0.001 }
                ];
                await api.post("/land/analyze", {
                    name: searchQuery || ("Plot around " + manualLat.substring(0, 6) + "," + manualLng.substring(0, 6)),
                    polygon: p,
                    area_m2: parseFloat(area) || 10000,
                    user_intent: intent
                });
            } catch (err) {
                console.error("Dashboard sync failed. (Might not be fully logged in)", err);
            }

            // Auto stop scan effect and move to Scenario Cards
            setTimeout(() => {
                setIsScanning(false);
                setCurrentScreen(4);
            }, 3000);

        } catch (err) {
            console.error(err);
            alert("API connection failed. Ensure backend is running.");
            setCurrentScreen(1);
            setIsScanning(false);
        } finally {
            setLoading(false);
        }
    };

    // ── Dynamic Recalculation Effect (Slider) ───────────────────────────────────
    const [liveScenarios, setLiveScenarios] = useState<any>(null);

    useEffect(() => {
        if (!analysisData || !analysisData.base_metrics) return;
        const base = analysisData.base_metrics;
        const green_pct = sliderValue / 100.0;
        const dev_pct = 1.0 - green_pct;

        const eco_val = (base.carbon_10yr_100pct * green_pct) + (base.flood_10yr_100pct * green_pct) + (base.water_10yr_100pct * green_pct);
        const dev_val = (base.dev_profit_100pct * dev_pct) - (base.flood_risk_cost_100pct * dev_pct * (1.0 + green_pct));

        let s_solar = 0;
        if (intent === "Set up Solar Farm" || green_pct > 0.15) {
            s_solar = base.solar_revenue_base;
        }

        const total = eco_val + dev_val + s_solar;

        setLiveScenarios({
            total_value: total,
            dev_profit: base.dev_profit_100pct * dev_pct,
            flood_risks: -(base.flood_risk_cost_100pct * dev_pct * (1.0 + green_pct)),
            carbon: base.carbon_10yr_100pct * green_pct,
            flood_sav: base.flood_10yr_100pct * green_pct,
            solar: s_solar
        });

    }, [sliderValue, analysisData, intent]);

    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans">
            {/* Sidebar Pane */}
            <div className="w-[440px] bg-white border-r-8 border-black flex flex-col shadow-[8px_0_0_0_#000] z-20 relative h-full">

                {/* Header */}
                <div className="p-6 border-b-4 border-black bg-white sticky top-0 z-50 flex items-center justify-between">
                    <Logo variant="earthy" size={32} />
                    <button onClick={() => router.push("/dashboard")} className="p-2 border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all text-black">
                        <ArrowRight className="w-5 h-5 rotate-180 stroke-[3]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative bg-white">
                    <AnimatePresence mode="wait">

                        {/* SCREEN 1: INPUT FORM */}
                        {currentScreen === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                                <div>
                                    <h1 className="text-4xl font-black text-black uppercase tracking-tight leading-none">Analyse<br />My Land</h1>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-sm font-black text-black uppercase tracking-widest bg-green-200 inline-block px-2 py-1 border-2 border-black">Section A — Land Details</h3>

                                    <div className="space-y-3 relative z-[100]">
                                        <label className="text-xs font-black uppercase">📍 Drop Pin or Search</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black stroke-[3]" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => handleSearchInput(e.target.value)}
                                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                className="w-full pl-10 pr-4 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000]"
                                                placeholder="Enter City or Lat,Lng"
                                            />
                                            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold animate-pulse text-gray-400">Loading...</div>}
                                            {showDropdown && searchResults.length > 0 && (
                                                <div className="absolute top-full mb-4 left-0 w-full bg-white border-4 border-black shadow-[6px_6px_0_0_#000] z-[9999]">
                                                    {searchResults.map(r => (
                                                        <button
                                                            key={r.place_id}
                                                            type="button"
                                                            onMouseDown={(e) => { e.preventDefault(); handleSelectPlace(r); }}
                                                            className="block w-full text-left px-4 py-3 border-b-4 border-black last:border-0 hover:bg-green-300 font-black uppercase text-xs cursor-pointer"
                                                        >
                                                            {r.display_name.split(",").slice(0, 2).join(",")}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase">Latitude</label>
                                            <input
                                                type="text"
                                                value={manualLat}
                                                onChange={e => {
                                                    setManualLat(e.target.value);
                                                    const lat = parseFloat(e.target.value);
                                                    const lng = parseFloat(manualLng);
                                                    if (!isNaN(lat) && !isNaN(lng)) flyToRef.current?.(lat, lng, 16);
                                                }}
                                                className="w-full px-4 py-3 border-4 border-black font-black shadow-[4px_4px_0_0_#000]" placeholder="13.0827"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase">Longitude</label>
                                            <input
                                                type="text"
                                                value={manualLng}
                                                onChange={e => {
                                                    setManualLng(e.target.value);
                                                    const lat = parseFloat(manualLat);
                                                    const lng = parseFloat(e.target.value);
                                                    if (!isNaN(lat) && !isNaN(lng)) flyToRef.current?.(lat, lng, 16);
                                                }}
                                                className="w-full px-4 py-3 border-4 border-black font-black shadow-[4px_4px_0_0_#000]" placeholder="80.2707"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase">Area (sqm)</label>
                                            <input type="number" value={area} onChange={e => setArea(e.target.value)} className="w-full px-4 py-3 border-4 border-black font-black shadow-[4px_4px_0_0_#000]" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase">Land Type</label>
                                            <select value={landType} onChange={e => setLandType(e.target.value)} className="w-full px-4 py-3 border-4 border-black font-black shadow-[4px_4px_0_0_#000] bg-white appearance-none">
                                                {LAND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4 border-t-4 border-black">
                                    <h3 className="text-sm font-black text-black uppercase tracking-widest bg-[#bbf7d0] inline-block px-2 py-1 border-2 border-black">Section B — Their Plan</h3>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase">What do you want to do?</label>
                                        <div className="flex flex-col gap-2">
                                            {INTENT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setIntent(opt.value)}
                                                    className={`py-3 px-4 border-4 text-left font-black uppercase flex items-center gap-3 transition-colors ${intent === opt.value ? 'bg-black text-green-400 border-black shadow-[4px_4px_0_0_#22c55e]' : 'bg-white border-black hover:bg-green-200'}`}
                                                >
                                                    <opt.icon className="w-5 h-5 stroke-[3]" /> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase">Planned Investment (₹)</label>
                                        <input type="number" value={investment} onChange={e => setInvestment(e.target.value)} className="w-full px-4 py-3 border-4 border-black font-black shadow-[4px_4px_0_0_#000]" placeholder="5000000" />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase">Timeline Horizon</label>
                                        <div className="flex gap-4">
                                            {[5, 10, 20].map(yr => (
                                                <button
                                                    key={yr}
                                                    onClick={() => setTimeline(yr)}
                                                    className={`flex-1 py-3 border-4 font-black uppercase transition-colors ${timeline === yr ? 'bg-black text-green-400 border-black shadow-[4px_4px_0_0_#22c55e]' : 'bg-white border-black hover:bg-green-200'}`}
                                                >
                                                    {yr} Yrs
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* SCREEN 2: SCANNING STATS POPIN */}
                        {currentScreen === 2 && (
                            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 flex flex-col h-full items-center justify-center">
                                <Loader2 className="w-16 h-16 animate-spin stroke-[3] text-green-500" />
                                <h2 className="text-2xl font-black uppercase tracking-widest text-center animate-pulse">Running Live<br />Satellite Scan</h2>
                            </motion.div>
                        )}

                        {/* SCREEN 4/5/6: SCENARIOS & ACTION PLAN */}
                        {(currentScreen >= 4) && analysisData && (
                            <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black uppercase tracking-tight bg-green-200 inline-block px-3 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">Valuation Models</h3>

                                    {/* Cards stack vertically in the sidebar */}
                                    {["your_plan", "full_conserve", "smart_hybrid"].map((key) => {
                                        const s = analysisData.scenarios[key];
                                        const isHybrid = key === "smart_hybrid";
                                        const isActive = isHybrid; // for styling

                                        // Use live reactive data for "Smart Hybrid" if slider moved
                                        let t = s.total_value;
                                        if (isHybrid && liveScenarios) t = liveScenarios.total_value;

                                        return (
                                            <div key={key} className={`p-4 border-4 border-black relative ${isActive ? 'bg-[#bbf7d0] shadow-[6px_6px_0_0_#000]' : 'bg-white shadow-[4px_4px_0_0_#000]'}`}>
                                                {isHybrid && <div className="absolute top-0 right-0 bg-yellow-400 border-l-4 border-b-4 border-black px-2 py-1 text-[10px] font-black uppercase">⭐ Optimised</div>}
                                                <div className="text-xs font-black uppercase opacity-60">{s.title === intent ? "Your Plan" : s.title}</div>
                                                <div className="text-xl font-black uppercase">{formatToWords(t)}</div>
                                                <div className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">{timeline} Year Value</div>

                                                <div className="mt-4 pt-4 border-t-2 border-black grid gap-3 text-xs font-bold uppercase">
                                                    {(s.breakdown.dev_profit > 0 || isHybrid) && (
                                                        <div className="flex justify-between group relative cursor-help">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>Dev Profit</span>
                                                                <span className="w-4 h-4 rounded-full bg-slate-200 border border-black flex items-center justify-center text-[10px] font-black text-black">i</span>
                                                            </div>
                                                            <span>+{formatToWords(isHybrid && liveScenarios ? liveScenarios.dev_profit : s.breakdown.dev_profit)}</span>
                                                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white p-2.5 text-[10px] z-50 w-[240px] border-2 border-black shadow-[4px_4px_0_0_#22c55e] normal-case tracking-normal">
                                                                Estimated using local construction costs & global real-estate ROI multipliers based on input investment.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(s.breakdown.flood_risk_cost < 0 || isHybrid) && (
                                                        <div className="flex justify-between text-red-600 group relative cursor-help">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>Flood Risk</span>
                                                                <span className="w-4 h-4 rounded-full bg-slate-200 border border-black flex items-center justify-center text-[10px] font-black text-black">i</span>
                                                            </div>
                                                            <span>-{formatToWords(Math.abs(isHybrid && liveScenarios ? liveScenarios.flood_risks : s.breakdown.flood_risk_cost))}</span>
                                                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white p-2.5 text-[10px] z-50 w-[240px] border-2 border-black shadow-[4px_4px_0_0_#22c55e] normal-case tracking-normal">
                                                                Assessed by combining OpenTopography DEM API elevation data with local NDMA historic flood hazard shapefiles.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(s.breakdown.carbon > 0 || isHybrid) && (
                                                        <div className="flex justify-between text-green-700 group relative cursor-help">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>Carbon Credits</span>
                                                                <span className="w-4 h-4 rounded-full bg-slate-200 border border-black flex items-center justify-center text-[10px] font-black text-black">i</span>
                                                            </div>
                                                            <span>+{formatToWords(isHybrid && liveScenarios ? liveScenarios.carbon : s.breakdown.carbon)}</span>
                                                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white p-2.5 text-[10px] z-50 w-[240px] border-2 border-black shadow-[4px_4px_0_0_#22c55e] normal-case tracking-normal">
                                                                Calculated via Google Earth Engine API (NDVI & Canopy Cover), applying IPCC baseline biomass metrics.
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(s.breakdown.solar > 0 || isHybrid) && (
                                                        <div className="flex justify-between text-yellow-600 group relative cursor-help">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>Solar Gen</span>
                                                                <span className="w-4 h-4 rounded-full bg-slate-200 border border-black flex items-center justify-center text-[10px] font-black text-black">i</span>
                                                            </div>
                                                            <span>+{formatToWords(isHybrid && liveScenarios ? liveScenarios.solar : s.breakdown.solar)}</span>
                                                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-black text-white p-2.5 text-[10px] z-50 w-[240px] border-2 border-black shadow-[4px_4px_0_0_#22c55e] normal-case tracking-normal">
                                                                Calculated using average daily kW/m² fetched dynamically from the NASA POWER climatology database API.
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4 font-black uppercase text-xs pt-2 border-t-2 border-black flex justify-between items-center">
                                                    <span>Risk Level:</span>
                                                    <span className={`px-2 py-1 border-2 border-black ${s.risk === 'High' ? 'bg-red-400' : s.risk === 'Moderate' ? 'bg-yellow-400' : 'bg-green-400'}`}>{s.risk}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Slider (Screen 5) */}
                                <div className="space-y-4 pt-4">
                                    <h3 className="text-xl font-black uppercase">Interactive Threshold</h3>
                                    <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
                                        <div className="flex justify-between text-xs font-black uppercase mb-4">
                                            <span className="text-green-600">Green Space ({sliderValue}%)</span>
                                            <span className="text-black">Development ({100 - sliderValue}%)</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="90"
                                            value={sliderValue}
                                            onChange={(e) => setSliderValue(parseInt(e.target.value))}
                                            className="w-full accent-black h-4 bg-green-200 border-2 border-black appearance-none cursor-pointer"
                                        />
                                        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-center text-gray-500">Live re-calculates map polygon & values</p>
                                    </div>
                                </div>

                                {/* Action Plan (Screen 6) */}
                                <div className="space-y-4 pt-4">
                                    <h3 className="text-xl font-black uppercase">Dynamic Action Plan</h3>
                                    <div className="border-4 border-black bg-[#f0f9ff] shadow-[4px_4px_0_0_#000] p-5 space-y-5">

                                        {aiRecommendation && (
                                            <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#22c55e] relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 bg-green-500 text-black px-2 py-0.5 text-[8px] font-black uppercase border-l-2 border-b-2 border-black">
                                                    Live Intelligence
                                                </div>
                                                <div className="flex items-center gap-3 mb-3 text-black">
                                                    <div className="bg-black p-1.5 rounded-full">
                                                        <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
                                                    </div>
                                                    <span className="font-black uppercase text-xs tracking-tighter">AI Advisory Response</span>
                                                </div>
                                                <div className="space-y-3 bg-slate-50 p-3 border-2 border-black border-dashed">
                                                    {aiRecommendation.split('\n').filter(line => line.trim().length > 0).map((point, i) => (
                                                        <div key={i} className="flex gap-2 items-start">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0 shadow-[1px_1px_0_0_#000]" />
                                                            <span className="text-[10px] font-black leading-tight uppercase text-black/80">
                                                                {point.replace(/^[•\-\d.\s]+/, '').trim()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {intent.includes("Housing") || intent.includes("Commercial") ? (
                                            <>
                                                <div className="flex gap-3 items-start">
                                                    <Zap className="w-5 h-5 mt-1 stroke-[3]" />
                                                    <div>
                                                        <span className="font-black uppercase text-sm block">Rooftop Solar Integration</span>
                                                        <span className="text-xs font-bold leading-relaxed block mt-1">Recommended system: 5kW. Estimated ¥1.8 Lakh payback in 4.7 years. Reduces operating constraints.</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-start border-t-2 border-black pt-4">
                                                    <Droplets className="w-5 h-5 mt-1 stroke-[3]" />
                                                    <div>
                                                        <span className="font-black uppercase text-sm block">Rainwater Harvesting</span>
                                                        <span className="text-xs font-bold leading-relaxed block mt-1">Required tank: 5000L. Cuts municipal dependency by 40% and acts as minor flood sink.</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : intent.includes("Farming") ? (
                                            <>
                                                <div className="flex gap-3 items-start">
                                                    <TreePine className="w-5 h-5 mt-1 stroke-[3]" />
                                                    <div>
                                                        <span className="font-black uppercase text-sm block">Agroforestry Border</span>
                                                        <span className="text-xs font-bold leading-relaxed block mt-1">Plant native timber species on 15% perimeter. Qualifies for VCS carbon credits via local aggregators.</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-start border-t-2 border-black pt-4">
                                                    <Zap className="w-5 h-5 mt-1 stroke-[3]" />
                                                    <div>
                                                        <span className="font-black uppercase text-sm block">PM-KUSUM Solar</span>
                                                        <span className="text-xs font-bold leading-relaxed block mt-1">Deploy ground-mount solar panels in degraded quadrants. Govt subsidizes installation up to 60%.</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="font-black uppercase text-sm text-center py-4">
                                                Hybrid strategy recommended based on exact coordinates and spatial risk profile.
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Action Button */}
                <div className="p-6 border-t-4 border-black bg-white">
                    {currentScreen === 1 ? (
                        <button
                            onClick={handleAnalyze}
                            className="w-full py-5 bg-black text-green-400 border-4 border-black font-black text-xl hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#22c55e] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center uppercase tracking-widest shadow-[4px_4px_0_0_#000]"
                        >
                            Analyse Land
                        </button>
                    ) : currentScreen >= 4 ? (
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem('ecotech_live_report', JSON.stringify({
                                    raw_data: analysisData.raw_data,
                                    scenarios: analysisData.scenarios
                                }));
                                router.push('/analysis/report?id=live');
                            }}
                            className="w-full py-5 bg-green-500 text-black border-4 border-black font-black text-xl hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-1 active:shadow-none transition-all flex justify-center gap-3 uppercase tracking-widest shadow-[4px_4px_0_0_#000]"
                        >
                            <DownloadCloud className="w-6 h-6 stroke-[3]" />
                            Export PDF Report
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Map Canvas */}
            <div className="flex-1 relative bg-slate-100 h-full overflow-hidden">
                <SmartMap
                    manualLat={manualLat}
                    manualLng={manualLng}
                    flyToRef={flyToRef}
                    isScanning={isScanning}
                    raw_data={analysisData?.raw_data}
                    sliderValue={sliderValue}
                    showLayers={currentScreen >= 3}
                    layers={layers}
                    drawnPolygon={polygon}
                    onPolygonDrawn={(lat: string, lng: string, drawnArea: string, coords: any[]) => {
                        setManualLat(lat);
                        setManualLng(lng);
                        setArea(drawnArea);
                        setPolygon(coords);
                        fetchPreAnalysis(parseFloat(lat), parseFloat(lng));
                    }}
                />

                {/* AI Recommendation Widget (Top Right) */}
                <AnimatePresence>
                    {currentScreen === 1 && (loadingAi || aiRecommendation) && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="absolute top-6 right-6 z-[1000] bg-white border-4 border-black shadow-[6px_6px_0_0_#000] w-80 max-h-[400px] flex flex-col pointer-events-auto"
                        >
                            <div className="bg-black text-white p-3 flex items-center justify-between border-b-4 border-black">
                                <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-green-400" />
                                    AI Ecosystem Advisor
                                </span>
                                {loadingAi ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                                ) : (
                                    <button onClick={() => setAiRecommendation(null)} className="hover:text-red-400"><X className="w-4 h-4" /></button>
                                )}
                            </div>
                            <div className="p-4 overflow-y-auto w-full max-h-[340px] text-xs font-bold leading-relaxed scrollbar-hide text-black space-y-3">
                                {loadingAi ? (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-2 bg-gray-200 rounded w-full"></div>
                                        <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                                        <div className="h-2 bg-gray-200 rounded w-4/6"></div>
                                        <div className="mt-4 text-[10px] uppercase text-gray-400">Scanning 8km radius (Overpass Map Data)...</div>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap">{aiRecommendation}</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Retractable Legend (Top Left) */}
                <AnimatePresence>
                    {analysisData && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="absolute top-6 left-6 z-[1000] pointer-events-auto"
                        >
                            {!legendOpen ? (
                                <button
                                    onClick={() => setLegendOpen(true)}
                                    className="bg-white border-4 border-black p-3 shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all flex items-center gap-2 group"
                                >
                                    <Info className="w-6 h-6 stroke-[3] text-green-600 group-hover:rotate-12 transition-transform" />
                                    <span className="font-black uppercase text-[10px] tracking-widest text-black">Insights Legend</span>
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ x: -250, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000] w-[320px] flex flex-col"
                                >
                                    <div className="bg-green-400 text-black p-4 border-b-4 border-black flex items-center justify-between">
                                        <span className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                            <Info className="w-5 h-5 stroke-[3]" />
                                            Environmental Terms
                                        </span>
                                        <button
                                            onClick={() => setLegendOpen(false)}
                                            className="bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-red-500 transition-colors border-2 border-black"
                                        >
                                            <ChevronLeft className="w-5 h-5 stroke-[4]" />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-5 overflow-y-auto max-h-[500px]">
                                        {LEGEND_TERMS.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <div className="w-10 h-10 bg-slate-100 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
                                                    <item.icon className="w-5 h-5 stroke-[3] text-black" />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase text-green-700 block tracking-tight">{item.term}</span>
                                                    <p className="text-[10px] font-bold text-black opacity-80 leading-relaxed uppercase">{item.definition}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t-2 border-dashed border-black">
                                        <span className="text-[9px] font-black uppercase text-gray-400">Data Sources: IPCC, NASA Power, GEE</span>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
