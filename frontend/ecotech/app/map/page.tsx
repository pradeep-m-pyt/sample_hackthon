"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, MapPin, Ruler, Loader2, ArrowRight, Info } from "lucide-react";
import api from "@/lib/api";

const LandMap = dynamic(() => import("@/components/Map/LandMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
    ),
});

export default function MapPage() {
    const router = useRouter();
    const [polygon, setPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
    const [area, setArea] = useState<number>(0);
    const [name, setName] = useState("");
    const [intent, setIntent] = useState("housing");
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detections, setDetections] = useState<any>(null);

    const handlePolygonComplete = useCallback(async (coords: { lat: number; lng: number }[], calculatedArea: number) => {
        setPolygon(coords);
        setArea(calculatedArea);

        // Trigger auto-detection
        setDetecting(true);
        try {
            const res = await api.post("/land/detect", { polygon: coords });
            setDetections(res.data);

            // Auto-populate name if found
            if (res.data.name && !name) {
                setName(res.data.name);
            }

            // Auto-populate intent based on type
            if (res.data.dominant_type === "urban") setIntent("housing");
            else if (res.data.dominant_type === "agriculture") setIntent("agriculture");
            else if (res.data.dominant_type === "forest") setIntent("preserve");
            else if (res.data.dominant_type === "open_land") setIntent("solar");
        } catch (err) {
            console.error("Detection failed:", err);
        } finally {
            setDetecting(false);
        }
    }, [name]);

    const startAnalysis = async () => {
        if (!polygon || !name) return;
        setLoading(true);
        try {
            const res = await api.post("/land/analyze", {
                name,
                polygon,
                area_m2: area,
                user_intent: intent
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
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Map Section */}
            <div className="flex-1 relative">
                <LandMap onPolygonComplete={handlePolygonComplete} />

                {/* Floating Help */}
                <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur p-3 rounded-2xl border border-slate-200 shadow-lg max-w-xs pointer-events-none">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <Info className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Use the polygon tool on the left to draw and select your land area for analysis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sidebar Panel */}
            <div className="w-[400px] border-l border-slate-200 bg-white p-8 flex flex-col gap-8 overflow-y-auto">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 font-bold uppercase tracking-wider text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        Land Selection
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Define Your Project</h1>
                    <p className="text-slate-500 text-sm">Draw land on the map to start the ecosystem valuation engine.</p>
                </div>

                <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Project Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Chennai Suburban Plot"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Primary Intent</label>
                        <select
                            value={intent}
                            onChange={(e) => setIntent(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-medium"
                        >
                            <option value="housing">Residential Housing</option>
                            <option value="solar">Solar Farm / Renewable</option>
                            <option value="agriculture">Agriculture / Farming</option>
                            <option value="preserve">Preserve Ecosystem</option>
                            <option value="industry">Industrial Site</option>
                            <option value="mixed">Mixed Use Hybrid</option>
                        </select>
                    </div>

                    <AnimatePresence>
                        {polygon && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-5 bg-green-50 border border-green-100 rounded-2xl space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-green-800 uppercase tracking-tighter">Status</span>
                                    {detecting ? (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            DETECTING...
                                        </div>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-green-200 text-green-800 text-[10px] font-bold rounded-full">LAND SELECTED</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-green-100">
                                    <div>
                                        <div className="text-[10px] font-bold text-green-700 uppercase">Latitude</div>
                                        <div className="text-sm font-medium text-slate-900">{detections?.lat?.toFixed(5) || polygon[0].lat.toFixed(5)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-green-700 uppercase">Longitude</div>
                                        <div className="text-sm font-medium text-slate-900">{detections?.lng?.toFixed(5) || polygon[0].lng.toFixed(5)}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                        <Ruler className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{(area / 4046.86).toFixed(2)} Acres</div>
                                        <div className="text-[10px] text-slate-500">Surface area: {area.toLocaleString()} m²</div>
                                    </div>
                                </div>

                                {detections && (
                                    <div className="space-y-3 pt-2">
                                        {detections.name && (
                                            <div className="p-3 bg-white rounded-xl border border-green-100 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Detected Name</div>
                                                    <div className="text-xs font-bold text-slate-800">{detections.name}</div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-3 bg-white rounded-xl border border-green-100 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                                <Sprout className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Land Composition</div>
                                                <div className="text-xs font-bold text-slate-800 capitalize">
                                                    {detections.dominant_type} ({detections.raw_type || 'Natural'})
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={startAnalysis}
                    disabled={!polygon || !name || loading}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:bg-slate-200 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2 group mt-auto"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Start Engine Analysis
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
