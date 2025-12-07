"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Heart, Crown, Calendar, Bell } from "lucide-react";

export default function BridalModePage() {
    return (
        <main className="relative flex flex-col w-full min-h-screen overflow-hidden">
            
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900"></div>
                
                {/* Floating Orbs */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-teal-500/20 to-emerald-500/10 rounded-full blur-[120px] animate-float-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-br from-rose-500/15 to-pink-500/10 rounded-full blur-[140px] animate-float-slow animation-delay-2000"></div>
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-full blur-[100px] animate-float"></div>
                
                {/* Sparkle Particles */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`
                            }}
                        ></div>
                    ))}
                </div>
                
                {/* Subtle Grid */}
                <div 
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                ></div>
            </div>

            {/* Header */}
            <div className="relative z-10 w-full p-6 flex items-center justify-between">
                <Link href="/">
                    <button className="group flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full text-white/80 hover:text-white border border-white/10 transition-all">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back</span>
                    </button>
                </Link>
                
                <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
                        Bridal Suite
                    </span>
                </div>
                
                <div className="w-24"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
                
                {/* Icon Container */}
                <div className="relative mb-8 animate-fade-in-scale">
                    {/* Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full blur-3xl opacity-30 scale-150"></div>
                    
                    {/* Ring */}
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-pulse-ring"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-pulse-ring animation-delay-500"></div>
                        
                        <div className="relative p-10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
                            <Crown className="w-20 h-20 text-teal-300 animate-float" />
                        </div>
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center max-w-2xl animate-fade-in-up animation-delay-200">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 backdrop-blur-md rounded-full border border-teal-500/20 mb-6">
                        <Sparkles className="w-4 h-4 text-teal-400" />
                        <span className="text-sm font-medium text-teal-300">Coming Soon</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
                        Bridal{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-300">
                            Consultation
                        </span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-white/60 leading-relaxed mb-10">
                        Your perfect wedding look, powered by AI. We're crafting an exclusive bridal styling experience 
                        that will help you find the ideal hairstyle, makeup, and accessories for your special day.
                    </p>

                    {/* Features Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        {[
                            { icon: Heart, title: "Personalized", desc: "Tailored to your style" },
                            { icon: Crown, title: "Complete Look", desc: "Hair, makeup & more" },
                            { icon: Calendar, title: "Timeline Ready", desc: "Plan your beauty journey" }
                        ].map((feature, idx) => (
                            <div 
                                key={idx}
                                className="p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 animate-fade-in-up"
                                style={{ animationDelay: `${300 + idx * 100}ms` }}
                            >
                                <feature.icon className="w-8 h-8 text-teal-400 mb-3" />
                                <h3 className="text-white font-bold mb-1">{feature.title}</h3>
                                <p className="text-white/50 text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Notify Button */}
                    <button className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 rounded-2xl text-white font-bold shadow-xl shadow-teal-500/25 transition-all hover:scale-105 active:scale-95">
                        <Bell className="w-5 h-5 group-hover:animate-bounce" />
                        <span>Notify Me When Ready</span>
                    </button>
                </div>

                {/* Bottom Decoration */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-4 text-white/30 text-sm">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></span>
                            AI Powered
                        </span>
                        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                        <span>Premium Experience</span>
                        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                        <span>Launching 2025</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
