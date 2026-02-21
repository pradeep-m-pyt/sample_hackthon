"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MoveRight, Shield, Sun, TreeDeciduous, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export default function LandingPage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-100/50 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto text-center flex flex-col items-center gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 mb-4"
          >
            <Logo variant="earthy" size={64} showText={false} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-medium flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            EnvROI: Making Nature's Value Visible
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl"
          >
            Quantify the <span className="gradient-text">Economic Value</span> of Your Land
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed"
          >
            Compare environmental ROI alongside financial returns. Use satellite data and AI to make evidence-based land use decisions that benefit both the economy and the planet.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <Link
              href="/map"
              className="px-8 py-4 bg-green-600 text-white rounded-full font-semibold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2 group"
            >
              Analyze Your Land
              <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-full font-semibold text-lg hover:bg-slate-50 transition-all"
            >
              Join Communities
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 py-16 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Land Analyzed", value: "24k+ Acres" },
            { label: "Carbon Modelled", value: "1.2M Tons" },
            { label: "Communities", value: "150+" },
            { label: "Economic Impact", value: "₹450 Cr" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">{stat.value}</div>
              <div className="text-slate-400 text-sm md:text-base">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Comprehensive Ecosystem Analysis</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">We use state-of-the-art climate models and satellite imagery to quantify invisible value.</p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          <motion.div variants={item} className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-green-200 hover:shadow-xl hover:shadow-green-50 transition-all group">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Flood Mitigation</h3>
            <p className="text-slate-600 leading-relaxed mb-6">Calculate avoided damage costs through nature-based buffers and permeable land planning.</p>
            <div className="flex items-center gap-1 text-blue-600 font-medium cursor-pointer">
              Explore Model <ArrowUpRight className="w-4 h-4" />
            </div>
          </motion.div>

          <motion.div variants={item} className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-green-200 hover:shadow-xl hover:shadow-green-50 transition-all group">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Sun className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Solar Potential</h3>
            <p className="text-slate-600 leading-relaxed mb-6">Estimate ROI for solar installations based on high-resolution irradiance data and local grid tariffs.</p>
            <div className="flex items-center gap-1 text-green-600 font-medium cursor-pointer">
              Explore Model <ArrowUpRight className="w-4 h-4" />
            </div>
          </motion.div>

          <motion.div variants={item} className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-green-200 hover:shadow-xl hover:shadow-green-50 transition-all group">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TreeDeciduous className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Carbon Sequestration</h3>
            <p className="text-slate-600 leading-relaxed mb-6">Quantify carbon stocks and annual capture value using Social Cost of Carbon (SCC) standards.</p>
            <div className="flex items-center gap-1 text-emerald-600 font-medium cursor-pointer">
              Explore Model <ArrowUpRight className="w-4 h-4" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Call to Action */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative p-8 md:p-16 rounded-[2.5rem] bg-green-600 overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-700 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 flex flex-col items-center gap-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Ready to see the invisible value?</h2>
            <p className="text-green-50 text-lg max-w-xl">Join hundreds of planners and land owners making smarter, greener decisions today.</p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/signup" className="px-8 py-4 bg-white text-green-600 rounded-full font-bold hover:bg-green-50 transition-all">
                Get Started for Free
              </Link>
              <Link href="/map" className="px-8 py-4 bg-green-700 text-white rounded-full font-bold hover:bg-green-800 transition-all border border-green-500">
                Try the Map Tool
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              {["Audit-Ready Reports", "Real-time Sat Data", "AI Analysis", "NPV Calculations"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-green-100 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
