"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function BridalModePage() {
    return (
        <main className="relative flex flex-col w-full h-screen bg-[#0f0c29] overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-6 z-50 flex items-center justify-between pointer-events-none">
                <Link href="/" className="pointer-events-auto">
                    <button className="flex items-center space-x-2 text-white/70 hover:text-white transition bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Home</span>
                    </button>
                </Link>
                <div className="flex items-center space-x-3">
                    <Sparkles className="w-6 h-6 text-teal-400" />
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-300">
                        Bridal Consultation
                    </h1>
                </div>
                <div className="w-20"></div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <div className="p-8 rounded-full bg-white/5 border border-white/10 animate-float">
                    <Sparkles className="w-24 h-24 text-teal-400 opacity-80" />
                </div>
                <h2 className="text-3xl font-bold text-white">Bridal Styling Suite</h2>
                <p className="text-gray-400 text-lg max-w-md text-center">
                    Find the perfect wedding look that complements your dress and theme.
                </p>
                <button className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition">
                    Enter Suite
                </button>
            </div>
        </main>
    );
}
