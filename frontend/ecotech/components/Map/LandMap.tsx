"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";

// Fix Leaflet icons
const fixLeafletIcons = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

interface LandMapProps {
    onPolygonComplete: (coords: { lat: number; lng: number }[], area: number) => void;
}

const LandMap = ({ onPolygonComplete }: LandMapProps) => {
    useEffect(() => {
        fixLeafletIcons();
    }, []);

    const _onCreated = (e: any) => {
        const { layerType, layer } = e;
        if (layerType === "polygon") {
            const latlngs = layer.getLatLngs()[0];
            const coords = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));

            // Calculate area in square meters using Leaflet's built-in utility
            const area = L.GeometryUtil.geodesicArea(latlngs);

            onPolygonComplete(coords, area);
        }
    };

    return (
        <MapContainer
            center={[13.0827, 80.2707]} // Default to Chennai
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
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
                            shapeOptions: {
                                color: "#16a34a",
                            },
                        },
                    }}
                />
            </FeatureGroup>
        </MapContainer>
    );
};

export default LandMap;
