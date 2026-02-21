"use client";

import React from "react";
import { motion } from "framer-motion";

interface LogoProps {
    variant?: "earthy" | "forest" | "moss";
    size?: number;
    showText?: boolean;
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({
    variant = "earthy",
    size = 40,
    showText = true,
    className = "",
}) => {
    const isDark = variant === "forest" || variant === "moss";

    const leafVariants = {
        animate: {
            rotate: [0, 4, 0],
            transition: {
                duration: 4,
                ease: "easeInOut",
                repeat: Infinity,
            },
        },
    };

    const waterVariants = {
        animate: {
            opacity: [0.5, 0.8, 0.5],
            scaleX: [1, 1.04, 1],
            transition: {
                duration: 2.8,
                ease: "easeInOut",
                repeat: Infinity,
            },
        },
    };

    const getColors = () => {
        switch (variant) {
            case "forest":
                return {
                    text: "text-[#e8f0d8]",
                    roi: "text-[#86c94a]",
                    tag: "text-[#86c94a]/60",
                    water: "#5ab8d8",
                    terrain: "#2d5a27",
                    bars: ["#5a8f2a", "#6aaa3a", "#86c94a", "#a8e060"],
                    trend: "#c8f080",
                    leaf: "#86c94a",
                    pin: "#e8b84a",
                };
            case "moss":
                return {
                    text: "text-white",
                    roi: "text-[#c8f080]",
                    tag: "text-[#c8f080]/75",
                    water: "rgba(200,240,255,0.7)",
                    terrain: "rgba(255,255,255,0.1)",
                    bars: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0.75)", "#ffffff"],
                    trend: "#c8f080",
                    leaf: "rgba(255,255,255,0.25)",
                    pin: "#f5d06a",
                };
            default: // earthy
                return {
                    text: "text-[#2d4a1e]",
                    roi: "text-[#5a8f2a]",
                    tag: "text-[#8a7a5a]",
                    water: "#4a9ab8",
                    terrain: "#7aab55",
                    bars: ["#a8c97a", "#7aab55", "#5a8f2a", "#3d6e1a"],
                    trend: "#2d4a1e",
                    leaf: "#5a8f2a",
                    pin: "#c8a84a",
                };
        }
    };

    const colors = getColors();

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
            >
                {/* Water / Wetland base */}
                <ellipse cx="40" cy="68" rx="28" ry="6" fill={colors.water} opacity="0.35" />
                <motion.path
                    animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scaleX: [1, 1.04, 1],
                    }}
                    transition={{
                        duration: 2.8,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }}
                    d="M16 64 Q24 60 32 63 Q40 66 48 63 Q56 60 64 64"
                    stroke={colors.water}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.55"
                />
                <path
                    d="M20 68 Q30 65 40 67 Q50 69 60 67"
                    stroke={colors.water}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.35"
                />

                {/* Terrain layers */}
                <path
                    d="M12 50 Q24 42 40 46 Q56 50 68 44 L68 56 Q56 60 40 56 Q24 52 12 56 Z"
                    fill={colors.terrain}
                    opacity="0.35"
                />

                {/* Bar chart (ROI) */}
                <rect x="18" y="36" width="7" height="16" rx="2.5" fill={colors.bars[0]} opacity="0.7" />
                <rect x="28" y="28" width="7" height="24" rx="2.5" fill={colors.bars[1]} opacity="0.85" />
                <rect x="38" y="20" width="7" height="32" rx="2.5" fill={colors.bars[2]} />
                <rect x="48" y="14" width="7" height="38" rx="2.5" fill={colors.bars[3]} />

                {/* Trend line arrow */}
                <path
                    d="M16 38 L27 30 L37 22 L49 15"
                    stroke={colors.trend}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <polygon points="54,12 49,15 52,19" fill={colors.trend} />

                {/* Leaf */}
                <motion.g
                    animate={{
                        rotate: [0, 4, 0],
                    }}
                    transition={{
                        duration: 4,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }}
                    style={{ originX: "56px", originY: "20px" }}
                >
                    <path
                        d="M56 20 C62 10, 74 13, 71 24 C69 30, 60 30, 56 20 Z"
                        fill={colors.leaf}
                        opacity="0.75"
                    />
                    <path
                        d="M56 20 C62 22, 67 25, 71 24"
                        stroke={colors.trend}
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.6"
                    />
                </motion.g>

                {/* Map pin */}
                <circle cx="22" cy="22" r="6" fill={colors.pin} opacity="0.9" />
                <circle cx="22" cy="22" r="3" fill={variant === "earthy" ? "#faf6ef" : variant === "forest" ? "#1a2e1a" : "rgba(45,90,39,0.8)"} />
                <line x1="22" y1="28" x2="22" y2="34" stroke={colors.pin} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            </svg>

            {showText && (
                <div className="flex flex-col leading-none">
                    <span className={`text-2xl font-black tracking-tighter ${colors.text}`}>
                        Env<span className={colors.roi}>ROI</span>
                    </span>
                    <span className={`text-[8px] uppercase tracking-[0.25em] font-medium ${colors.tag}`}>
                        Eco · Valuation · Engine
                    </span>
                </div>
            )}
        </div>
    );
};
