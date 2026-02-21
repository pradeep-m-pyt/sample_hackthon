"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sprout, MapPin, Ruler, Loader2, ArrowRight,
    Search, X, CheckCircle2, AlertCircle, Building2,
    Globe, TreePine, Zap
} from "lucide-react";
import api from "@/lib/api";
import { Logo } from "@/components/shared/Logo";

const LandMap = dynamic(() => import("@/components/Map/LandMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
    ),
});

// ── Nominatim result type ─────────────────────────────────────────────────
interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    class: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
    };
}

const INTENT_OPTIONS = [
    { value: "housing", label: "Residential Housing", icon: Building2, color: "blue" },
    { value: "solar", label: "Solar Farm / Renewable", icon: Zap, color: "yellow" },
    { value: "agriculture", label: "Agriculture / Farming", icon: Sprout, color: "lime" },
    { value: "preserve", label: "Preserve Ecosystem", icon: TreePine, color: "green" },
    { value: "industry", label: "Industrial Site", icon: Building2, color: "orange" },
    { value: "mixed", label: "Mixed Use Hybrid", icon: Globe, color: "purple" },
];

export default function MapPage() {
    const router = useRouter();
    const flyToRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null);

    // Land polygon state
    const [polygon, setPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
    const [area, setArea] = useState<number>(0);

    // Form state
    const [name, setName] = useState("");
    const [intent, setIntent] = useState("housing");

    // Location search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [selectedPlace, setSelectedPlace] = useState<NominatimResult | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Analysis state
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detections, setDetections] = useState<any>(null);

    // Manual coordinates state
    const [manualLat, setManualLat] = useState("");
    const [manualLng, setManualLng] = useState("");

    // ── Handlers ─────────────────────────────────────────────────────────
    const handlePolygonComplete = useCallback(async (coords: { lat: number; lng: number }[], calculatedArea: number) => {
        setPolygon(coords);
        setArea(calculatedArea);

        // Update manual inputs for clarity
        if (coords.length > 0) {
            setManualLat(coords[0].lat.toFixed(6));
            setManualLng(coords[0].lng.toFixed(6));
        }

        // Auto-detect land type from classify_land endpoint
        setDetecting(true);
        try {
            const res = await api.post("/land/detect", { polygon: coords });
            setDetections(res.data);

            // Auto-populate name if detected and field is still empty
            if (res.data.detected_name && !name) {
                setName(res.data.detected_name);
            }

            // Auto-suggest intent based on dominant land type
            const dt = res.data.dominant_type;
            if (dt === "urban") setIntent("housing");
            else if (dt === "agriculture") setIntent("agriculture");
            else if (dt === "forest") setIntent("preserve");
            else if (dt === "open_land") setIntent("solar");
        } catch (err) {
            console.error("Auto-detection failed:", err);
            // Non-fatal: user can still fill in manually
        } finally {
            setDetecting(false);
        }
    }, [name]);

    // Helper to generate a 100m x 100m square around a point
    const generateAutoPolygon = (lat: number, lng: number) => {
        const offset = 0.00045; // Approx 50m in degrees at typical latitudes
        const coords = [
            { lat: lat + offset, lng: lng - offset },
            { lat: lat + offset, lng: lng + offset },
            { lat: lat - offset, lng: lng + offset },
            { lat: lat - offset, lng: lng - offset }
        ];
        handlePolygonComplete(coords, 100 * 100);
    };

    const handleLocateManual = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (isNaN(lat) || isNaN(lng)) {
            setSearchError("Please enter valid coordinates.");
            return;
        }

        if (flyToRef.current) {
            flyToRef.current(lat, lng, 16);
        }
        generateAutoPolygon(lat, lng);
        setSearchError("");
    };

    // Debounce search to avoid hammering Nominatim
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchInput = (value: string) => {
        setSearchQuery(value);
        setSearchError("");
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
        setSearchError("");
        try {
            // Tamil Nadu bounding box for focus
            const viewbox = "76.2,13.5,80.5,8.0";
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=7&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(query)}`,
                { headers: { "Accept-Language": "en" } }
            );
            if (!res.ok) throw new Error("Search failed");
            const results: NominatimResult[] = await res.json();
            setSearchResults(results);
            setShowDropdown(true);
            if (results.length === 0) setSearchError("No locations found. Try a different search.");
        } catch {
            setSearchError("Search failed. Please check your connection.");
        } finally {
            setSearching(false);
        }
    };

    const handleSelectPlace = (place: NominatimResult) => {
        setSelectedPlace(place);
        setSearchQuery(place.display_name.split(",").slice(0, 3).join(", "));
        setShowDropdown(false);
        setSearchResults([]);

        // Auto-fill project name from place
        const addr = place.address;
        const localName = addr?.city || addr?.town || addr?.village || place.display_name.split(",")[0];
        if (!name) setName(localName);

        // Fly map to the location
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);

        setManualLat(place.lat);
        setManualLng(place.lon);

        if (flyToRef.current) {
            flyToRef.current(lat, lng, 16);
        }

        // Auto-generate polygon for instant analysis readiness
        generateAutoPolygon(lat, lng);
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setSelectedPlace(null);
        setShowDropdown(false);
        setSearchError("");
    };

    const startAnalysis = async () => {
        if (!polygon || !name) return;
        setLoading(true);
        try {
            const res = await api.post("/land/analyze", {
                name,
                polygon,
                area_m2: area,
                user_intent: intent,
            });
            router.push(`/analysis?id=${res.data.project_id}`);
        } catch (err) {
            console.error(err);
            alert("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#FAF7F2] overflow-hidden font-sans">
            {/* ── Sidebar (Left) ─────────────────────────────────────────── */}
            <div className="w-[420px] bg-white border-r border-violet-100 flex flex-col shadow-2xl z-20 relative">
                {/* Header */}
                <div className="p-6 border-b border-violet-50 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                    <Logo variant="lavender" size={32} />
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="p-2 hover:bg-violet-50 rounded-xl transition-all text-violet-600 group"
                        title="Back to Projects"
                    >
                        <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                    {/* Intro */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-indigo-950 tracking-tight">Land Analyzer</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">3 Steps to Discovery</p>
                    </div>

                    {/* ── Step 1: Location Discovery ────────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-violet-600 flex items-center gap-2 uppercase tracking-widest">
                                <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">01</span>
                                Search Location
                            </label>
                            {selectedPlace && (
                                <button onClick={clearSearch} className="text-[10px] font-bold text-slate-400 hover:text-violet-600 uppercase tracking-widest transition-colors">
                                    Reset
                                </button>
                            )}
                        </div>

                        <div className="relative group">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 group-focus-within:text-violet-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="City, State or Coordinates..."
                                    className="w-full pl-11 pr-11 py-3.5 bg-violet-50/50 border border-violet-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm placeholder:text-slate-400 font-semibold"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                />
                                {searching && (
                                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-violet-600" />
                                )}
                                {searchQuery && !searching && (
                                    <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <X className="w-4 h-4 text-slate-400 hover:text-slate-700 transition" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            <AnimatePresence>
                                {showDropdown && searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-violet-100 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                                    >
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.place_id}
                                                onClick={() => handleSelectPlace(result)}
                                                className="w-full px-5 py-4 text-left hover:bg-violet-50 transition-colors border-b border-violet-50 last:border-0 group/item flex items-start gap-3"
                                            >
                                                <MapPin className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0 group-hover/item:text-violet-600" />
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-black text-indigo-950 line-clamp-1">{result.display_name.split(',')[0]}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 line-clamp-2 uppercase tracking-tight">{result.display_name.split(',').slice(1).join(',')}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Manual Lat/Lng Inputs */}
                            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-violet-50">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Latitude</label>
                                    <input
                                        type="text"
                                        placeholder="13.0827"
                                        value={manualLat}
                                        onChange={(e) => setManualLat(e.target.value)}
                                        className="w-full px-4 py-3 bg-violet-50/20 border border-violet-100 rounded-2xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white outline-none transition-all font-mono font-bold text-indigo-900"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Longitude</label>
                                    <input
                                        type="text"
                                        placeholder="80.2707"
                                        value={manualLng}
                                        onChange={(e) => setManualLng(e.target.value)}
                                        className="w-full px-4 py-3 bg-violet-50/20 border border-violet-100 rounded-2xl text-xs focus:ring-2 focus:ring-violet-500 focus:bg-white outline-none transition-all font-mono font-bold text-indigo-900"
                                    />
                                </div>
                                <button
                                    onClick={handleLocateManual}
                                    className="col-span-2 py-4 bg-indigo-950 text-white rounded-2xl text-[12px] font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 active:scale-[0.98] uppercase tracking-widest"
                                >
                                    <Globe className="w-4 h-4 text-violet-400 animate-pulse" />
                                    Locate & Auto-Detect
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-violet-50" />
                        <span className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em]">Engine Params</span>
                        <div className="flex-1 h-px bg-violet-50" />
                    </div>

                    {/* ── Step 2: Site Configuration ───────────────────────────── */}
                    <div className="space-y-5">
                        <label className="text-xs font-black text-violet-600 flex items-center gap-2 uppercase tracking-widest">
                            <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">02</span>
                            Site Configuration
                        </label>

                        {/* Project Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Project Name</label>
                            <input
                                type="text"
                                placeholder="E.g. Northern Wetlands Phase I"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-3.5 bg-violet-50/20 border border-violet-100 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm font-bold text-indigo-950 placeholder:text-slate-300 shadow-sm"
                            />
                        </div>

                        {/* Primary Intent */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Investment Goal</label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {INTENT_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const selected = intent === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setIntent(opt.value)}
                                            className={`px-4 py-3.5 rounded-2xl border text-left transition-all flex flex-col gap-3 relative overflow-hidden group/btn ${selected
                                                ? "bg-violet-600 border-violet-600 text-white shadow-xl shadow-violet-200"
                                                : "bg-[#FAF7F2] border-violet-100 text-indigo-950 hover:border-violet-300 hover:bg-white shadow-inner shadow-violet-50/50"
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 transition-transform group-hover/btn:scale-110 ${selected ? "text-violet-200" : "text-violet-400"}`} />
                                            <span className="text-[11px] font-black leading-tight uppercase tracking-wide">{opt.label}</span>
                                            {selected && (
                                                <div className="absolute top-0 right-0 w-10 h-10 bg-white/20 rounded-bl-full translate-x-3 -translate-y-3" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-5">
                        <label className="text-xs font-black text-violet-600 flex items-center gap-2 uppercase tracking-widest">
                            <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">03</span>
                            Generation & Valuation
                        </label>

                        {/* Area Stats */}
                        {polygon && polygon.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 bg-indigo-950 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/30 rounded-bl-full blur-3xl group-hover:scale-110 transition-transform" />
                                <div className="space-y-5 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                                                <Ruler className="w-4 h-4 text-violet-300" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/60">Site Coverage</span>
                                        </div>
                                        <span className="text-xl font-black text-white">{area < 10000 ? `${area.toFixed(0)} m²` : `${(area / 4046.86).toFixed(2)} Acres`}</span>
                                    </div>

                                    {detecting ? (
                                        <div className="flex items-center gap-3 py-1 px-3 bg-white/5 rounded-xl border border-white/5">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                                            <span className="text-[10px] uppercase font-black tracking-[0.3em] text-violet-300/80 animate-pulse">Spectral Scanning...</span>
                                        </div>
                                    ) : (
                                        detections && (
                                            <div className="pt-4 border-t border-white/10 space-y-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
                                                        <TreePine className="w-4 h-4 text-violet-100" />
                                                    </div>
                                                    <span className="text-xs font-black text-white uppercase tracking-widest">{detections.dominant_type}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {detections.distribution && Object.entries(detections.distribution).map(([cat, val]: [any, any]) => (
                                                        val > 0 && (
                                                            <span key={cat} className="text-[9px] px-3 py-1 bg-white/5 rounded-lg font-black uppercase tracking-widest text-violet-200 border border-white/5">
                                                                {cat}: {(val * 100).toFixed(0)}%
                                                            </span>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </motion.div>
                        )}

                        <button
                            onClick={startAnalysis}
                            disabled={loading || !polygon || polygon.length === 0}
                            className="w-full py-5 bg-violet-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-violet-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-violet-200 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group/run"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="uppercase tracking-widest">Crunching...</span>
                                </>
                            ) : (
                                <>
                                    <Sprout className="w-7 h-7 group-hover/run:scale-110 transition-transform" />
                                    Launch Valuation
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Map Canvas (Right) ────────────────────────────────────────── */}
            <div className="flex-1 relative bg-[#FAF7F2]">
                <LandMap onPolygonComplete={handlePolygonComplete} flyToRef={flyToRef} />

                {/* Legend Overlay */}
                <div className="absolute top-8 right-8 z-[400] bg-white/80 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-violet-100 shadow-2xl space-y-5 min-w-[200px]">
                    <h3 className="text-[10px] font-black text-indigo-950 uppercase tracking-[0.4em] border-b border-violet-50 pb-3">GIS Legend</h3>
                    <div className="space-y-3.5">
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 bg-violet-500 rounded-lg shadow-lg shadow-violet-200" />
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Study Area</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 bg-indigo-950 rounded-lg shadow-lg shadow-indigo-200" />
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Target Center</span>
                        </div>
                    </div>
                </div>

                {/* Removed Quick Hint card as per requirements */}
            </div>
        </div>
    );
}
