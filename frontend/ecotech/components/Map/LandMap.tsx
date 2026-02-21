"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";

// Fix Leaflet default icon paths broken by webpack
const fixLeafletIcons = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

// ── Internal component that can imperatively fly the map ──────────────────
interface FlyToControlProps {
    flyToRef: React.MutableRefObject<((lat: number, lng: number, zoom?: number) => void) | null>;
}
function FlyToControl({ flyToRef }: FlyToControlProps) {
    const map = useMap();
    flyToRef.current = (lat, lng, zoom = 15) => {
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    };
    return null;
}

// ── Polygon created callback ───────────────────────────────────────────────
interface LandMapProps {
    onPolygonComplete: (coords: { lat: number; lng: number }[], area: number) => void;
    flyToRef: React.MutableRefObject<((lat: number, lng: number, zoom?: number) => void) | null>;
}

const LandMap = ({ onPolygonComplete, flyToRef }: LandMapProps) => {
    useEffect(() => {
        fixLeafletIcons();
    }, []);

    const _onCreated = (e: any) => {
        const { layerType, layer } = e;
        if (layerType === "polygon") {
            const latlngs = layer.getLatLngs()[0];
            const coords = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
            const area = L.GeometryUtil.geodesicArea(latlngs);
            onPolygonComplete(coords, area);
        }
    };

    return (
        <MapContainer
            center={[20.5937, 78.9629]}  // Default to centre of India
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToControl flyToRef={flyToRef} />
            <FeatureGroup>
                <EditControl
                    position="topleft"
                    onCreated={_onCreated}
                    draw={{
                        rectangle: false,
                        circle: false,
                        polyline: false,
                        circlemarker: false,
                        marker: false,
                        polygon: {
                            allowIntersection: false,
                            drawError: {
                                color: "#e1e1e1",
                                message: "<strong>Error:</strong> shape edges cannot cross!",
                            },
                            shapeOptions: { color: "#16a34a", weight: 3 },
                        },
                    }}
                />
            </FeatureGroup>
        </MapContainer>
    );
};

export default LandMap;
