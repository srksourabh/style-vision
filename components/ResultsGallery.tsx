"use client";

import React, { useState } from "react";
import { Hairstyle, AnalysisResult } from "@/utils/analysisEngine";
import { X, Printer, CheckCircle, Smartphone } from "lucide-react";

interface ResultsGalleryProps {
    analysis: AnalysisResult;
    userImage: string;
    onReset: () => void;
}

export default function ResultsGallery({ analysis, userImage, onReset }: ResultsGalleryProps) {
    const [selectedStyle, setSelectedStyle] = useState<Hairstyle | null>(null);

    // Helper to generate a consistent "Match Score"
    const getMatchScore = (id: string) => {
        // Generate a pseudo-random score between 88 and 99 based on ID char code
        const seed = id.charCodeAt(0) + id.charCodeAt(1);
        return 88 + (seed % 12);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full h-full flex flex-col pt-20 pb-10 px-6 overflow-hidden relative">

            {/* Header */}
            {!selectedStyle && (
                <div className="text-center mb-8 space-y-2 animate-in slide-in-from-top fade-in duration-700">
                    <h2 className="text-4xl font-bold text-white">
                        Recommended Styles for <span className="text-teal-400">{analysis.faceShape}</span> Face
                    </h2>
                    <p className="text-purple-200/70 text-lg">
                        Based on your {analysis.jawline.toLowerCase()} jawline and {analysis.skinTone.toLowerCase()} skin tone
                    </p>
                </div>
            )}

            {/* Horizontal Scroll Gallery */}
            <div
                className={`
          flex-1 flex items-center space-x-8 overflow-x-auto pb-8 
          snap-x snap-mandatory scroll-smooth 
          ${selectedStyle ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}
          transition-opacity duration-500
        `}
            >
                {analysis.recommendedStyles.map((style, idx) => (
                    <div
                        key={style.id}
                        onClick={() => setSelectedStyle(style)}
                        className="
              relative flex-shrink-0 w-[350px] h-[500px] rounded-[2.5rem] overflow-hidden 
              snap-center group cursor-pointer 
              border border-white/10 hover:border-teal-400/50 
              transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(45,212,191,0.2)]
            "
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        {/* Image */}
                        <img
                            src={style.imageUrl}
                            alt={style.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

                        {/* Content */}
                        <div className="absolute bottom-0 w-full p-8 space-y-3">
                            <div className="flex items-center space-x-2">
                                <span className="px-3 py-1 text-xs font-bold text-black bg-teal-400 rounded-full">
                                    {getMatchScore(style.id)}% Match
                                </span>
                            </div>
                            <h3 className="text-3xl font-bold text-white leading-tight">
                                {style.name}
                            </h3>
                        </div>
                    </div>
                ))}

                {/* Reset / Back Card */}
                <div
                    onClick={onReset}
                    className="
             flex-shrink-0 w-[200px] h-[500px] rounded-[2.5rem] 
             flex flex-col items-center justify-center space-y-4
             bg-white/5 border border-white/10 cursor-pointer
             hover:bg-white/10 transition-colors
           "
                >
                    <div className="p-4 rounded-full bg-white/10">
                        <X className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-white font-medium">Start Over</span>
                </div>
            </div>

            {/* Full Screen Detail Modal */}
            {selectedStyle && (
                <div className="fixed inset-0 z-50 bg-[#0f0c29] animate-in zoom-in-95 duration-300 flex overflow-hidden">

                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedStyle(null)}
                        className="absolute top-6 right-6 z-50 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition no-print"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Content Grid */}
                    <div className="flex w-full h-full">

                        {/* Left: Visuals */}
                        <div className="w-1/2 h-full relative p-8 print:w-[40%]">
                            <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
                                <img
                                    src={selectedStyle.imageUrl}
                                    alt={selectedStyle.name}
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay User Image Badge (Optional) */}
                                <div className="absolute bottom-6 right-6 w-32 h-32 rounded-2xl overflow-hidden border-2 border-white shadow-lg no-print">
                                    <img src={userImage} alt="You" className="w-full h-full object-cover" />
                                </div>

                                <div className="absolute top-6 left-6 no-print">
                                    <span className="px-5 py-2 text-xl font-bold text-black bg-teal-400 rounded-full shadow-lg">
                                        {getMatchScore(selectedStyle.id)}% Match
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Dashboard */}
                        <div className="w-1/2 h-full p-8 pl-0 overflow-y-auto print:w-[60%] print:p-8">
                            <div className="h-full bg-white/5 backdrop-blur-sm rounded-[3rem] border border-white/10 p-10 flex flex-col space-y-10 print:bg-white print:border-black print:text-black">

                                {/* Title Header */}
                                <div>
                                    <h2 className="text-5xl font-bold text-white mb-2 print:text-black">{selectedStyle.name}</h2>
                                    <div className="flex items-center space-x-4 text-purple-200 print:text-gray-600">
                                        <span className="uppercase tracking-widest text-sm font-semibold">StyleVision Analysis</span>
                                        <div className="h-1 w-1 rounded-full bg-purple-200"></div>
                                        <span className="capitalize">{analysis.faceShape} Face</span>
                                    </div>
                                </div>

                                {/* Section A: Why this works */}
                                <div className="space-y-4">
                                    <h3 className="text-xl text-teal-300 font-medium uppercase tracking-wider flex items-center space-x-2 print:text-black">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>Why It Suits You</span>
                                    </h3>
                                    <p className="text-2xl text-white/90 leading-relaxed font-light print:text-black">
                                        {selectedStyle.suitabilityReason}
                                    </p>
                                </div>

                                {/* Section B: Expert Tip */}
                                <div className="p-6 bg-purple-500/10 rounded-3xl border border-purple-500/20 print:border-black print:bg-gray-100">
                                    <h3 className="text-sm text-purple-300 font-bold uppercase tracking-wider mb-3 print:text-gray-700">
                                        Pro Tip
                                    </h3>
                                    <p className="text-lg text-white italic font-serif print:text-black">
                                        "{selectedStyle.expertTip}"
                                    </p>
                                </div>

                                {/* Section C: Instructions */}
                                <div className="flex-1">
                                    <h3 className="text-xl text-teal-300 font-medium uppercase tracking-wider mb-6 print:text-black">
                                        Stylist Instructions
                                    </h3>
                                    <ul className="space-y-4">
                                        {selectedStyle.instructions.map((step, i) => (
                                            <li key={i} className="flex items-start space-x-4">
                                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white print:text-black print:bg-gray-200">
                                                    {i + 1}
                                                </span>
                                                <span className="text-lg text-white/80 print:text-black">{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Action Footer (No Print) */}
                                <div className="pt-8 border-t border-white/10 flex items-center space-x-4 no-print">
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 flex items-center justify-center space-x-3 h-16 bg-white text-black hover:bg-gray-200 rounded-2xl font-bold text-lg transition"
                                    >
                                        <Printer className="w-6 h-6" />
                                        <span>Print Guide</span>
                                    </button>
                                    <button className="flex-1 flex items-center justify-center space-x-3 h-16 bg-transparent border border-white/20 hover:bg-white/5 text-white rounded-2xl font-bold text-lg transition">
                                        <Smartphone className="w-6 h-6" />
                                        <span>Send to Phone</span>
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
