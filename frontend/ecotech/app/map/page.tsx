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

    // ── Handlers ─────────────────────────────────────────────────────────
    const handlePolygonComplete = useCallback(async (coords: { lat: number; lng: number }[], calculatedArea: number) => {
        setPolygon(coords);
        setArea(calculatedArea);

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
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
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
        if (flyToRef.current) {
            flyToRef.current(lat, lng, 15);
        }
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
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
            {/* ── Map ─────────────────────────────────────────────────────── */}
            <div className="flex-1 relative">
                <LandMap onPolygonComplete={handlePolygonComplete} flyToRef={flyToRef} />

                {/* Draw tip overlay */}
                <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-lg max-w-[220px] pointer-events-none">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        🖊 Use the <strong>polygon tool</strong> on the left to draw your land boundary after searching.
                    </p>
                </div>

                {/* Selected place badge on map */}
                <AnimatePresence>
                    {selectedPlace && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border border-green-100"
                        >
                            <MapPin className="w-4 h-4 text-green-600 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-slate-800 max-w-xs truncate">
                                    {selectedPlace.address?.city || selectedPlace.address?.town || selectedPlace.display_name.split(",")[0]}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    {parseFloat(selectedPlace.lat).toFixed(4)}, {parseFloat(selectedPlace.lon).toFixed(4)}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <div className="w-[420px] border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="p-8 pb-0">
                    <div className="flex items-center gap-2 text-green-700 font-bold uppercase tracking-wider text-xs mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        Land Selection
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Define Your Project</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Search a location, draw the boundary, then launch the valuation engine.
                    </p>
                </div>

                <div className="flex flex-col gap-6 p-8 flex-1">

                    {/* ── Step 1: Location Search ───────────────────────────── */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">1</span>
                            Search Location
                        </label>

                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search city, village, district, state…"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                                />
                                {searching && (
                                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-green-600" />
                                )}
                                {searchQuery && !searching && (
                                    <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <X className="w-4 h-4 text-slate-400 hover:text-slate-700 transition" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown results */}
                            <AnimatePresence>
                                {showDropdown && searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="absolute z-50 top-full mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden"
                                    >
                                        {searchResults.map((result) => {
                                            const state = result.address?.state || "";
                                            const country = result.address?.country || "";
                                            const parts = result.display_name.split(",").slice(0, 2).join(",");
                                            return (
                                                <button
                                                    key={result.place_id}
                                                    onClick={() => handleSelectPlace(result)}
                                                    className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3"
                                                >
                                                    <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{parts}</p>
                                                        <p className="text-[11px] text-slate-400">{[state, country].filter(Boolean).join(", ")}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            {searchError && (
                                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {searchError}
                                </p>
                            )}

                            {/* Selected confirmation */}
                            {selectedPlace && !showDropdown && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Map navigated to selected location
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 text-slate-300">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400 font-medium">then draw boundary on map</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* ── Step 2: Project Details ───────────────────────────── */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">2</span>
                            Project Details
                        </label>

                        {/* Project Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Chennai Suburban Wetland"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                            />
                        </div>

                        {/* Primary Intent */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Primary Intent</label>
                            <div className="grid grid-cols-2 gap-2">
                                {INTENT_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const selected = intent === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setIntent(opt.value)}
                                            className={`px-3 py-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${selected
                                                    ? "bg-green-50 border-green-400 text-green-800"
                                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${selected ? "text-green-600" : "text-slate-400"}`} />
                                            <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Step 3: Area + Detection Confirmation ─────────────── */}
                    <AnimatePresence>
                        {polygon && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl space-y-3">
                                    {/* Status badge */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-green-800 uppercase tracking-tighter flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">3</span>
                                            Boundary Captured
                                        </span>
                                        {detecting ? (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                DETECTING…
                                            </div>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-green-200 text-green-800 text-[10px] font-bold rounded-full">✓ READY</span>
                                        )}
                                    </div>

                                    {/* Coordinates */}
                                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-green-100">
                                        <div>
                                            <div className="text-[10px] font-bold text-green-700 uppercase">Latitude</div>
                                            <div className="text-sm font-medium text-slate-900">{polygon[0].lat.toFixed(5)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-green-700 uppercase">Longitude</div>
                                            <div className="text-sm font-medium text-slate-900">{polygon[0].lng.toFixed(5)}</div>
                                        </div>
                                    </div>

                                    {/* Area metrics */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                                            <div className="text-lg font-black text-slate-900">{(area / 4046.86).toFixed(2)}</div>
                                            <div className="text-[10px] text-slate-500 font-medium">Acres</div>
                                        </div>
                                        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                                            <div className="text-lg font-black text-slate-900">{(area / 10000).toFixed(3)}</div>
                                            <div className="text-[10px] text-slate-500 font-medium">Hectares</div>
                                        </div>
                                    </div>
                                    <div className="text-center text-[10px] text-slate-400">
                                        {area.toLocaleString(undefined, { maximumFractionDigits: 0 })} m² · {polygon.length} vertices
                                    </div>

                                    {/* Auto-detected land info */}
                                    {detections && !detecting && (
                                        <div className="space-y-2 pt-1">
                                            {detections.detected_name && (
                                                <div className="p-2.5 bg-white rounded-xl border border-green-100 flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                        <MapPin className="w-3.5 h-3.5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Detected Name</div>
                                                        <div className="text-xs font-bold text-slate-800">{detections.detected_name}</div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="p-2.5 bg-white rounded-xl border border-green-100 flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                    <Sprout className="w-3.5 h-3.5 text-green-600" />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Land Composition</div>
                                                    <div className="text-xs font-bold text-slate-800 capitalize">
                                                        {detections.dominant_type}
                                                        {detections.raw_type && detections.raw_type !== "error" && ` (${detections.raw_type})`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── CTA ───────────────────────────────────────────────── */}
                    <div className="mt-auto pt-2">
                        {!polygon && (
                            <p className="text-center text-xs text-slate-400 mb-3">
                                Draw a polygon on the map to enable analysis
                            </p>
                        )}
                        <button
                            onClick={startAnalysis}
                            disabled={!polygon || !name || loading}
                            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Running Analysis…</span>
                                </>
                            ) : (
                                <>
                                    <Sprout className="w-5 h-5" />
                                    <span>Start Ecosystem Analysis</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
