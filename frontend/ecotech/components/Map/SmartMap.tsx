import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, Rectangle, FeatureGroup, Polygon } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { motion, AnimatePresence } from "framer-motion";

// CSS hack to fix leaflet marker issues in Next.js
const fixLeafletIcons = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

interface FlyToControlProps {
    flyToRef: React.MutableRefObject<((lat: number, lng: number, zoom?: number) => void) | null>;
}
function FlyToControl({ flyToRef }: FlyToControlProps) {
    const map = useMap();
    flyToRef.current = (lat, lng, zoom = 16) => {
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
    };
    return null;
}

interface SmartMapProps {
    manualLat: string;
    manualLng: string;
    flyToRef: any;
    isScanning: boolean;
    raw_data: any;
    sliderValue: number; // 10 to 90
    showLayers: boolean;
    layers: { veg: boolean, flood: boolean, solar: boolean };
    drawnPolygon: any[] | null;
    onPolygonDrawn?: (lat: string, lng: string, area: string, coords: any[]) => void;
}

export default function SmartMap({ manualLat, manualLng, flyToRef, isScanning, raw_data, sliderValue, showLayers, layers, drawnPolygon, onPolygonDrawn }: SmartMapProps) {

    useEffect(() => {
        fixLeafletIcons();
    }, []);

    const centerLat = parseFloat(manualLat) || 20.5937;
    const centerLng = parseFloat(manualLng) || 78.9629;

    // Simulated pseudo-polygon bounds around the center (Approx 1 Hectare)
    const offset1 = 0.0010;
    const offset2 = 0.0015;

    const bounds: L.LatLngBoundsExpression = [
        [centerLat - offset1, centerLng - offset2],
        [centerLat + offset1, centerLng + offset2]
    ];

    // Dynamic slider split calculation for rendering two rectangles
    const greenWidth = offset2 * 2 * (sliderValue / 100);
    const splitLng = (centerLng - offset2) + greenWidth;

    const greenBounds: L.LatLngBoundsExpression = [
        [centerLat - offset1, centerLng - offset2],
        [centerLat + offset1, splitLng]
    ];

    const devBounds: L.LatLngBoundsExpression = [
        [centerLat - offset1, splitLng],
        [centerLat + offset1, centerLng + offset2]
    ];

    // Card styling for the scan popups
    const StatCard = ({ label, val, delay, info }: { label: string, val: any, delay: number, info: string }) => (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: "spring" }}
            className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_0_#000] flex flex-col min-w-[140px] relative group"
        >
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-black opacity-60">{label}</span>
                <span className="w-4 h-4 rounded-full bg-gray-200 border border-black flex items-center justify-center text-[10px] font-black cursor-help">i</span>
            </div>
            <span className="text-lg font-black uppercase">{val}</span>
            <div className="absolute top-0 left-0 -translate-y-full hidden group-hover:block bg-black text-green-400 p-3 text-[9px] z-50 min-w-[180px] font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0_0_#22c55e]">
                {info}
            </div>
        </motion.div>
    );

    const featureGroupRef = useRef<L.FeatureGroup>(null);

    const onCreated = (e: any) => {
        const { layerType, layer } = e;
        if (layerType === "polygon" || layerType === "rectangle") {
            // Keep only one drawn shape at a time
            if (featureGroupRef.current) {
                featureGroupRef.current.getLayers().forEach((l) => {
                    if (l !== layer) {
                        featureGroupRef.current?.removeLayer(l);
                    }
                });
            }

            const latlngs = layer.getLatLngs()[0];
            const area = L.GeometryUtil.geodesicArea(latlngs);
            const center = layer.getBounds().getCenter();
            const standardizedCoords = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));

            if (onPolygonDrawn) {
                onPolygonDrawn(center.lat.toFixed(6), center.lng.toFixed(6), Math.round(area).toString(), standardizedCoords);
            }
        }
    };


    return (
        <div className="w-full h-full relative">
            <MapContainer
                key="smart-map-v2"
                center={[centerLat, centerLng]}
                zoom={5}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
            >
                {/* Standard OSM Tiles (greyscaled slightly via CSS if needed, but keeping native for now) */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="map-tiles"
                />

                <FlyToControl flyToRef={flyToRef} />

                {/* Drawing Controls */}
                <FeatureGroup ref={featureGroupRef}>
                    <EditControl
                        position="topleft"
                        onCreated={onCreated}
                        draw={{
                            polyline: false,
                            circle: false,
                            circlemarker: false,
                            marker: false,
                            rectangle: true,
                            polygon: {
                                allowIntersection: false,
                                drawError: {
                                    color: "#e1e100",
                                    message: "<strong>Oh snap!<strong> you can't draw that!"
                                },
                                shapeOptions: {
                                    color: "#000000",
                                    fillColor: "#4ade80",
                                    weight: 4,
                                    fillOpacity: 0.5,
                                    dashArray: "5, 10"
                                }
                            }
                        }}
                    />
                </FeatureGroup>

                {/* Animated Scanner Overlays */}
                <AnimatePresence>
                    {!isScanning && raw_data && (
                        <>
                            {/* Instead of a single polygon, draw the dual split based on the slider */}
                            <Rectangle bounds={greenBounds} pathOptions={{ color: "#22c55e", weight: 3, fillColor: "#4ade80", fillOpacity: 0.4 }} />
                            <Rectangle bounds={devBounds} pathOptions={{ color: "#000000", weight: 3, fillOpacity: 0.0, dashArray: "5, 10" }} />
                        </>
                    )}
                </AnimatePresence>

                {/* Simulated Overlays via colored geometry when toggled */}
                {showLayers && layers.veg && (
                    drawnPolygon && drawnPolygon.length > 2 ?
                        <Polygon positions={drawnPolygon} pathOptions={{ color: "#16a34a", weight: 0, fillColor: "#16a34a", fillOpacity: 0.5 }} /> :
                        <Rectangle bounds={bounds} pathOptions={{ color: "#16a34a", weight: 0, fillColor: "#16a34a", fillOpacity: 0.5 }} />
                )}
                {showLayers && layers.flood && (
                    drawnPolygon && drawnPolygon.length > 2 ?
                        <Polygon positions={drawnPolygon} pathOptions={{ color: "#2563eb", weight: 0, fillColor: "#3b82f6", fillOpacity: 0.4 }} /> :
                        <Rectangle bounds={bounds} pathOptions={{ color: "#2563eb", weight: 0, fillColor: "#3b82f6", fillOpacity: 0.4 }} />
                )}
                {showLayers && layers.solar && (
                    drawnPolygon && drawnPolygon.length > 2 ?
                        <Polygon positions={drawnPolygon} pathOptions={{ color: "#ea580c", weight: 0, fillColor: "#f97316", fillOpacity: 0.4 }} /> :
                        <Rectangle bounds={bounds} pathOptions={{ color: "#ea580c", weight: 0, fillColor: "#f97316", fillOpacity: 0.4 }} />
                )}
            </MapContainer>

            {/* Radar Scan CSS Animation Overlay */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-green-400 rounded-full animate-ping opacity-20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-green-500 rounded-full animate-ping opacity-40 delay-150" />

                        {/* Scanner Line */}
                        <motion.div
                            className="absolute w-full h-1 bg-green-400 shadow-[0_0_15px_#4ade80]"
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scanning Readouts Overlay */}
            <AnimatePresence>
                {isScanning && raw_data && (
                    <div className="absolute inset-0 pointer-events-none z-[1000] p-8 flex flex-wrap gap-4 content-start">
                        <StatCard label="NDVI Health" val={raw_data.ndvi} delay={0.2} info="Vegetation health from Google Earth Engine MODIS satellite data." />
                        <StatCard label="Canopy Cover" val={`${raw_data.canopy_cover}%`} delay={0.6} info="Tree cover percentage calculated via Hansen Global Forest Change API." />
                        <StatCard label="Flood Risk" val={raw_data.flood_risk} delay={1.0} info="Assessed by combining OpenTopography elevation with NDMA hazard zones." />
                        <StatCard label="Solar Irr" val={`${raw_data.solar_potential}`} delay={1.4} info="Average Daily kWh/m² using the NASA POWER climatology database." />
                        <StatCard label="Carbon Sec" val={`${raw_data.carbon_stock_tonnes}t`} delay={1.8} info="Total carbon tonnage calculated using IPCC baseline biomass metrics." />
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Neobrutalist Map Overrides via inline styles */}
            <style jsx global>{`
                .leaflet-container {
                    background: #f1f5f9;
                    font-family: inherit;
                }
                .leaflet-control-zoom {
                    border: 4px solid #000 !important;
                    border-radius: 0 !important;
                    box-shadow: 4px 4px 0 0 #000 !important;
                }
                .leaflet-control-zoom-in, .leaflet-control-zoom-out {
                    color: #000 !important;
                    background: #fff !important;
                    border-radius: 0 !important;
                }
                .leaflet-control-zoom-in:hover, .leaflet-control-zoom-out:hover {
                    background: #bbf7d0 !important;
                }
            `}</style>
        </div>
    );
}
