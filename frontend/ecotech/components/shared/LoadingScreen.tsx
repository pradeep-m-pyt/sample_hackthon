"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";

interface LoadingScreenProps {
    isVisible: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isVisible }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-8"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center gap-6"
                    >
                        <Logo variant="earthy" size={100} showText={true} className="scale-125 md:scale-150" />

                        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mt-8">
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="w-full h-full bg-green-600 rounded-full"
                            />
                        </div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-slate-400 text-[10px] font-mono tracking-[0.3em] uppercase"
                        >
                            Initializing Valuation Engine
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
