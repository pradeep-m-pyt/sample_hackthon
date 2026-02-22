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

  const item: any = {
    hidden: { opacity: 0, y: 50, rotate: -5 },
    show: { opacity: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 200, damping: 15 } },
  };

  const iconAnim: any = {
    hover: { scale: 1.2, rotate: 10, transition: { type: "spring", stiffness: 300 } }
  };

  return (
    <div className="flex flex-col gap-24 pb-24 bg-white font-sans selection:bg-green-400 selection:text-black">
      {/* Hero Section */}
      <section className="relative px-4 pt-24 pb-16 md:pt-40 md:pb-24 overflow-hidden border-b-4 border-black">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center gap-10">

          <motion.div
            initial={{ opacity: 0, y: -20, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            className="px-6 py-3 bg-[#bbf7d0] border-4 border-black shadow-[4px_4px_0_0_#000] text-black text-sm font-black uppercase tracking-widest flex items-center gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-3 h-3 bg-black rounded-full"
            />
            EnvROI: Quantifying Nature's Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-black uppercase leading-[0.9]"
          >
            Invest in <br className="hidden md:block" />
            <span className="bg-green-500 px-4 text-white hover:text-black transition-colors p-2 border-4 border-black shadow-[8px_8px_0_0_#000] rotate-2 inline-block ml-4 mt-4 mb-4">The Future</span> <br className="hidden md:block" /> of Land
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-2xl text-black max-w-3xl leading-relaxed font-bold border-l-8 border-green-500 pl-6 text-left"
          >
            Environmental ROI is the new gold standard. Unlock carbon value, solar potential, and cross-sector ecological returns with high-precision AI.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-6 pt-8 w-full md:w-auto justify-center"
          >
            <Link
              href="/map"
              className="px-10 py-6 bg-green-500 text-black border-4 border-black shadow-[8px_8px_0_0_#000] font-black text-xl hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-4 group"
            >
              START ANALYSIS
              <motion.div variants={iconAnim} whileHover="hover">
                <MoveRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
              </motion.div>
            </Link>
            <Link
              href="/signup"
              className="px-10 py-6 bg-white text-black border-4 border-black shadow-[8px_8px_0_0_#000] font-black text-xl hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center"
            >
              EXPLORE MARKETS
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Land Analyzed", value: "24K+", color: "bg-green-400" },
            { label: "Carbon Modelled", value: "1.2M", color: "bg-white" },
            { label: "Global Clusters", value: "150+", color: "bg-[#bbf7d0]" },
            { label: "Ecosystem Alpha", value: "₹450", color: "bg-green-500" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? 2 : -2 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              className={`${stat.color} p-8 border-4 border-black shadow-[6px_6px_0_0_#000] hover:-translate-y-2 hover:shadow-[10px_10px_0_0_#000] transition-all`}
            >
              <div className="text-4xl md:text-6xl font-black text-black mb-2">{stat.value}</div>
              <div className="text-black uppercase tracking-widest text-sm font-bold border-t-4 border-black pt-4 mt-4">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-left mb-16 border-l-8 border-green-500 pl-8">
          <span className="bg-black text-green-400 font-bold tracking-widest text-sm uppercase mb-4 px-4 py-2 inline-block border-2 border-black">Our Capability</span>
          <h2 className="text-5xl md:text-7xl font-black text-black mb-6 uppercase leading-tight">Multi-Dimensional<br />Analysis</h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-10"
        >
          {/* Card 1 */}
          <motion.div variants={item} className="p-8 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] group hover:-translate-y-2 hover:bg-green-50 hover:shadow-[12px_12px_0_0_#000] transition-all relative">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring" }}
              className="w-20 h-20 bg-green-400 border-4 border-black flex items-center justify-center text-black mb-8 shadow-[4px_4px_0_0_#000] rounded-full"
            >
              <Shield className="w-10 h-10" strokeWidth={2.5} />
            </motion.div>
            <h3 className="text-3xl font-black text-black mb-4 uppercase">Climate Resiliency</h3>
            <p className="text-black font-medium leading-relaxed mb-8 text-lg border-b-4 border-black pb-8">Advanced flood modeling that predicts avoided damage values and suggests nature-based protection zones.</p>
            <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider group/link cursor-pointer bg-green-400 border-2 border-black px-4 py-2 w-max shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all">
              DETAILS <ArrowUpRight className="w-5 h-5 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" strokeWidth={3} />
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={item} className="p-8 bg-green-400 border-4 border-black shadow-[8px_8px_0_0_#000] group hover:-translate-y-2 hover:bg-green-500 hover:shadow-[12px_12px_0_0_#000] transition-all relative">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring" }}
              className="w-20 h-20 bg-white border-4 border-black flex items-center justify-center text-black mb-8 shadow-[4px_4px_0_0_#000] rounded-full"
            >
              <Sun className="w-10 h-10" strokeWidth={2.5} />
            </motion.div>
            <h3 className="text-3xl font-black text-black mb-4 uppercase">Solar Intelligence</h3>
            <p className="text-black font-medium leading-relaxed mb-8 text-lg border-b-4 border-black pb-8">Leveraging 4-year GHI history and temperature derating factors to provide bankable solar NPV reports.</p>
            <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider group/link cursor-pointer bg-white border-2 border-black px-4 py-2 w-max shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all">
              DETAILS <ArrowUpRight className="w-5 h-5 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" strokeWidth={3} />
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={item} className="p-8 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] group hover:-translate-y-2 hover:bg-[#bbf7d0] hover:shadow-[12px_12px_0_0_#000] transition-all relative">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring" }}
              className="w-20 h-20 bg-green-500 border-4 border-black flex items-center justify-center text-black mb-8 shadow-[4px_4px_0_0_#000] rounded-full"
            >
              <TreeDeciduous className="w-10 h-10" strokeWidth={2.5} />
            </motion.div>
            <h3 className="text-3xl font-black text-black mb-4 uppercase">Carbon Sequestration</h3>
            <p className="text-black font-medium leading-relaxed mb-8 text-lg border-b-4 border-black pb-8">Real-time detection of forest canopy and soil carbon potential using voluntary market SCC pricing.</p>
            <div className="flex items-center gap-2 text-black font-black uppercase tracking-wider group/link cursor-pointer bg-[#bbf7d0] border-2 border-black px-4 py-2 w-max shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all">
              DETAILS <ArrowUpRight className="w-5 h-5 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" strokeWidth={3} />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Call to Action */}
      <section className="max-w-6xl mx-auto px-4 mt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-10 md:p-20 bg-green-500 border-8 border-black shadow-[16px_16px_0_0_#000] text-center"
        >
          <div className="relative z-10 flex flex-col items-center gap-10">
            <h2 className="text-5xl md:text-8xl font-black text-black max-w-4xl uppercase leading-none">
              Unlock the <br className="hidden md:block" /> <span className="text-white bg-black px-4 inline-block -rotate-2 mt-2">Hidden Value</span> <br className="hidden md:block" /> of Your Land
            </h2>
            <p className="text-black text-xl md:text-3xl max-w-2xl font-black bg-white px-6 py-4 border-4 border-black shadow-[4px_4px_0_0_#000] rotate-1">
              Start your analysis in seconds. No complex setup.
            </p>
            <div className="flex flex-col sm:flex-row gap-8 mt-8 w-full md:w-auto">
              <Link href="/signup" className="px-12 py-6 bg-black text-green-400 border-4 border-black shadow-[8px_8px_0_0_#22c55e] font-black text-2xl hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#22c55e] active:translate-y-2 active:shadow-none transition-all group">
                JOIN NOW
              </Link>
              <Link href="/map" className="px-12 py-6 bg-white text-black border-4 border-black shadow-[8px_8px_0_0_#000] font-black text-2xl hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000] active:translate-y-2 active:shadow-none transition-all">
                TRY SANDBOX
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-12">
              {["Bankable Reports", "Satellite Intelligence", "AI Engine", "Climate-Resilient Modeling"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-black text-sm font-black uppercase bg-white border-2 border-black px-4 py-2 shadow-[2px_2px_0_0_#000]">
                  <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={3} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
