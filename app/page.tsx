"use client";

import React, { useState } from "react";
import { Scissors, Palette, Crown, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px] translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen px-4 py-8">
        
        {/* Logo Section */}
        <header className="flex flex-col items-center pt-12 pb-8">
          
          {/* Logo Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative w-20 h-20 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center">
              <svg viewBox="0 0 60 60" className="w-12 h-12">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <path 
                  d="M40 15 C40 15 35 10 25 12 C15 14 12 22 18 28 C24 34 38 32 42 40 C46 48 38 55 25 53 C12 51 15 45 15 45" 
                  fill="none" 
                  stroke="url(#logoGrad)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                />
                <circle cx="45" cy="12" r="2.5" fill="#2dd4bf" />
                <circle cx="10" cy="50" r="2" fill="#ec4899" />
              </svg>
            </div>
          </div>

          {/* Logo Text */}
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            <span className="text-white">Style</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400">Vision</span>
          </h1>
          
          {/* Tagline */}
          <p className="mt-4 text-slate-400 text-lg">AI-Powered Beauty & Style Analysis</p>
          
          {/* Badge */}
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-sm text-slate-300">Powered by Gemini AI</span>
          </div>
        </header>

        {/* 3D Cards Section */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl w-full">
            
            {/* Hair Analysis Card */}
            <Card3D
              href="/hair-mode"
              title="Hair"
              subtitle="Analysis"
              description="AI-powered hairstyle recommendations based on your unique face shape"
              icon={<Scissors className="w-8 h-8" />}
              gradientFrom="from-rose-500"
              gradientTo="to-orange-500"
              glowColor="rgba(244, 63, 94, 0.3)"
            />

            {/* Color Analysis Card */}
            <Card3D
              href="/color-mode"
              title="Color"
              subtitle="Analysis"
              description="Find your perfect color palette based on skin undertones"
              icon={<Palette className="w-8 h-8" />}
              gradientFrom="from-violet-500"
              gradientTo="to-purple-500"
              glowColor="rgba(139, 92, 246, 0.3)"
            />

            {/* Bridal Card */}
            <Card3D
              href="/bridal-mode"
              title="Bridal"
              subtitle="Studio"
              description="Complete bridal styling consultation for your perfect day"
              icon={<Crown className="w-8 h-8" />}
              gradientFrom="from-teal-500"
              gradientTo="to-emerald-500"
              glowColor="rgba(20, 184, 166, 0.3)"
            />

          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pb-6">
          <p className="text-slate-500 text-sm">
            Privacy Protected • Instant Results • Professional Accuracy
          </p>
        </footer>

      </div>
    </main>
  );
}

/* 3D Card Component */
interface Card3DProps {
  href: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
}

function Card3D({ href, title, subtitle, description, icon, gradientFrom, gradientTo, glowColor }: Card3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientY - centerY) / 20;
    const y = (e.clientX - centerX) / -20;
    setRotation({ x, y });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <Link href={href}>
      <div
        className="relative cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: '1000px' }}
      >
        {/* Glow Shadow */}
        <div 
          className="absolute inset-0 rounded-3xl transition-all duration-300"
          style={{
            background: glowColor,
            filter: 'blur(30px)',
            opacity: isHovered ? 0.8 : 0.4,
            transform: `translateY(${isHovered ? 20 : 10}px)`,
          }}
        />

        {/* Card */}
        <div
          className="relative transition-transform duration-200 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovered ? 'translateY(-8px) scale(1.02)' : ''}`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Card Face */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
            
            {/* Gradient Hover Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-10' : ''}`} />
            
            {/* Content */}
            <div className="relative h-full p-6 md:p-8 flex flex-col">
              
              {/* Icon */}
              <div 
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center text-white shadow-lg transition-transform duration-300 ${isHovered ? 'scale-110 rotate-3' : ''}`}
              >
                {icon}
              </div>

              {/* Text */}
              <div className="mt-auto">
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="text-3xl md:text-4xl font-black text-white">{title}</h2>
                  <span className="text-xs md:text-sm text-slate-500 uppercase tracking-wider">{subtitle}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{description}</p>
                
                {/* CTA */}
                <div className={`flex items-center gap-2 text-sm font-semibold transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <Sparkles className={`w-4 h-4 ${gradientFrom.replace('from-', 'text-')}`} />
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${gradientFrom} ${gradientTo}`}>Start Analysis</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Corner Accent */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${gradientFrom} ${gradientTo} opacity-5 rounded-bl-[60px]`} />
              
              {/* Bottom Highlight */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo} opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`} />
            </div>

            {/* Inner Border */}
            <div className="absolute inset-[1px] rounded-[23px] border border-white/5 pointer-events-none" />
          </div>

          {/* 3D Depth Effects */}
          <div className="absolute top-1 -right-1 bottom-1 w-1 rounded-r-xl bg-slate-700/50" style={{ transform: 'rotateY(90deg)' }} />
          <div className="absolute -bottom-1 left-1 right-1 h-1 rounded-b-xl bg-slate-700/50" style={{ transform: 'rotateX(-90deg)' }} />
        </div>
      </div>
    </Link>
  );
}
