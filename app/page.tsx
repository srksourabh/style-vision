"use client";

import React from "react";
import { Scissors, Palette, Sparkles, Camera } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-[#0f0c29]">

      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] animate-float" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[900px] h-[900px] bg-teal-500/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: '1s', animationDuration: '10s' }}></div>
      </div>

      <div className="z-10 flex flex-col items-center w-full max-w-7xl px-4 space-y-16">

        {/* 3D Big Logo Section */}
        <div className="relative group cursor-default">
          <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <h1 className="
             text-[8rem] md:text-[10rem] font-black tracking-tighter text-center leading-none
             text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-400
             drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]
             select-none transform transition-transform duration-500 hover:scale-[1.02]
           "
            style={{
              textShadow: `
               0 1px 0 #ccc,
               0 2px 0 #c9c9c9,
               0 3px 0 #bbb,
               0 4px 0 #b9b9b9,
               0 5px 0 #aaa,
               0 6px 1px rgba(0,0,0,.1),
               0 0 5px rgba(0,0,0,.1),
               0 1px 3px rgba(0,0,0,.3),
               0 3px 5px rgba(0,0,0,.2),
               0 5px 10px rgba(0,0,0,.25),
               0 10px 10px rgba(0,0,0,.2),
               0 20px 20px rgba(0,0,0,.15)
             `
            }}
          >
            Style<span className="text-teal-400" >Vision</span>
          </h1>
          <p className="text-2xl md:text-3xl text-purple-200/80 font-light tracking-[0.5em] text-center mt-4 uppercase">
            Future of Styling
          </p>
        </div>

        {/* 3 Big Square Buttons */}
        <div className="flex flex-col md:flex-row gap-12 w-full justify-center items-center">

          <Link href="/hair-mode">
            <SquareButton
              title="Hair"
              subtitle="Mode"
              icon={<Scissors className="w-20 h-20" />}
              gradient="from-pink-500 to-rose-600"
            />
          </Link>

          <Link href="/color-mode">
            <SquareButton
              title="Color"
              subtitle="Mode"
              icon={<Palette className="w-20 h-20" />}
              gradient="from-violet-500 to-purple-600"
            />
          </Link>

          <Link href="/bridal-mode">
            <SquareButton
              title="Bridal"
              subtitle="Mode"
              icon={<Sparkles className="w-20 h-20" />}
              gradient="from-teal-400 to-emerald-600"
            />
          </Link>

        </div>

      </div>
    </main>
  );
}

function SquareButton({ title, subtitle, icon, gradient }: { title: string; subtitle: string; icon: React.ReactNode; gradient: string }) {
  return (
    <button className="
      group relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96
      rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10
      flex flex-col items-center justify-center space-y-6
      transition-all duration-500 ease-out
      hover:-translate-y-4 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
      hover:border-white/30
    ">

      {/* Hover Gradient Fill */}
      <div className={`
        absolute inset-0 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500
        bg-gradient-to-br ${gradient} mix-blend-overlay
      `}></div>

      {/* Icon Orb */}
      <div className={`
        relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center
        bg-gradient-to-br ${gradient} shadow-2xl
        transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6
      `}>
        <div className="text-white drop-shadow-lg scale-110">
          {icon}
        </div>
        {/* Gloss */}
        <div className="absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-tr from-white/30 to-transparent pointer-events-none"></div>
      </div>

      {/* Text */}
      <div className="text-center z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-wide group-hover:scale-105 transition-transform">
          {title}
        </h2>
        <span className="text-xl md:text-2xl text-white/60 font-medium uppercase tracking-widest group-hover:text-white/90">
          {subtitle}
        </span>
      </div>

    </button>
  );
}
