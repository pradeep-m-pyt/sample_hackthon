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
      <section className="relative px-4 pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden beige-gradient">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-100/40 rounded-full blur-[120px] -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[120px] translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto text-center flex flex-col items-center gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 mb-4"
          >
            <Logo variant="lavender" size={72} showText={false} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-5 py-2 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-sm font-semibold flex items-center gap-2 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
            </span>
            EnvROI: Quantifying Nature's Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tight text-indigo-950 max-w-5xl"
          >
            Invest in the <span className="gradient-text">Future of Land</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-600 max-w-3xl leading-relaxed font-medium"
          >
            Environmental ROI is the new gold standard. Use high-precision satellite intelligence and AI to unlock carbon value, solar potential, and cross-sector ecological returns.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-5 pt-6"
          >
            <Link
              href="/map"
              className="px-10 py-5 bg-violet-600 text-white rounded-2xl font-bold text-xl hover:bg-violet-700 transition-all shadow-2xl shadow-violet-200 flex items-center gap-3 group"
            >
              Start Analysis
              <MoveRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup"
              className="px-10 py-5 bg-white text-indigo-950 border-2 border-slate-100 rounded-2xl font-bold text-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              Explore Markets
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-indigo-950 py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500 via-transparent to-transparent opacity-20" />
        </div>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-12 text-center relative z-10">
          {[
            { label: "Land Analyzed", value: "24,000+", suffix: "Acres" },
            { label: "Carbon Modelled", value: "1.2M", suffix: "Tons" },
            { label: "Global Clusters", value: "150+", suffix: "Nodes" },
            { label: "Ecosystem Alpha", value: "₹450", suffix: "Cr" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-4xl md:text-5xl font-black text-violet-300 mb-2 truncate">{stat.value}</div>
              <div className="text-violet-100/60 uppercase tracking-widest text-[10px] font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-20">
          <span className="text-violet-600 font-bold tracking-widest text-xs uppercase mb-4 block">Our Capability</span>
          <h2 className="text-4xl md:text-5xl font-black text-indigo-950 mb-6">Multi-Dimensional Analysis</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">We bridge the gap between ecological preservation and financial growth using hyper-local data.</p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-10"
        >
          <motion.div variants={item} className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-100 transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl group-hover:bg-blue-100/50 transition-colors" />
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-indigo-950 mb-4">Climate Resiliency</h3>
            <p className="text-slate-500 leading-relaxed mb-8 text-[15px]">Advanced flood modeling that predicts avoided damage values and suggests nature-based protection zones.</p>
            <div className="flex items-center gap-2 text-blue-600 font-bold group/link cursor-pointer">
              Model Details <ArrowUpRight className="w-4 h-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </div>
          </motion.div>

          <motion.div variants={item} className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-100 transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-50/50 rounded-full blur-2xl group-hover:bg-violet-100/50 transition-colors" />
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mb-8 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner">
              <Sun className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-indigo-950 mb-4">Solar Intelligence</h3>
            <p className="text-slate-500 leading-relaxed mb-8 text-[15px]">Leveraging 4-year GHI history and temperature derating factors to provide bankable solar NPV reports.</p>
            <div className="flex items-center gap-2 text-violet-600 font-bold group/link cursor-pointer">
              Model Details <ArrowUpRight className="w-4 h-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </div>
          </motion.div>

          <motion.div variants={item} className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-violet-200 hover:shadow-2xl hover:shadow-violet-100 transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50/50 rounded-full blur-2xl group-hover:bg-emerald-100/50 transition-colors" />
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
              <TreeDeciduous className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-indigo-950 mb-4">Carbon Sequestration</h3>
            <p className="text-slate-500 leading-relaxed mb-8 text-[15px]">Real-time detection of forest canopy and soil carbon potential using voluntary market SCC pricing.</p>
            <div className="flex items-center gap-2 text-emerald-600 font-bold group/link cursor-pointer">
              Model Details <ArrowUpRight className="w-4 h-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Call to Action */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="relative p-12 md:p-20 rounded-[3rem] bg-indigo-950 overflow-hidden text-center shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-30" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 opacity-30" />

          <div className="relative z-10 flex flex-col items-center gap-8">
            <h2 className="text-4xl md:text-6xl font-black text-white max-w-3xl">Unlock the Hidden Value of Your Land</h2>
            <p className="text-violet-100/70 text-lg md:text-xl max-w-2xl font-medium">Be part of the new ecological economy. Start your analysis in seconds with no setup required.</p>
            <div className="flex flex-col sm:flex-row gap-5 mt-4">
              <Link href="/signup" className="px-10 py-5 bg-violet-600 text-white rounded-2xl font-black text-lg hover:bg-violet-700 transition-all shadow-xl shadow-violet-900/40">
                Join Now to Analyze
              </Link>
              <Link href="/map" className="px-10 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                Try Local Sandbox
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-8 mt-10">
              {["Bankable Reports", "Satellite Intelligence", "AI Engine", "Climate-Resilient Modeling"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-violet-200/60 text-xs font-bold uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4 text-violet-500" />
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
