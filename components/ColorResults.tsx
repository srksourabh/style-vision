"use client";

import React from "react";
import { ColorAnalysisResult } from "@/utils/analysisEngine";
import { Droplet, Sun, Snowflake, XCircle, Printer } from "lucide-react";

interface ColorResultsProps {
    analysis: ColorAnalysisResult;
    userImage: string;
    onReset: () => void;
}

export default function ColorResults({ analysis, userImage, onReset }: ColorResultsProps) {

    const seasonIcons = {
        'Spring': <Sun className="w-16 h-16 text-yellow-300" />,
        'Summer': <Sun className="w-16 h-16 text-yellow-100" />,
        'Autumn': <Droplet className="w-16 h-16 text-orange-400" />,
        'Winter': <Snowflake className="w-16 h-16 text-blue-200" />
    };

    const seasonDescriptions = {
        'Spring': 'Fresh, warm, and radiant. Your palette is full of energy.',
        'Summer': 'Cool, soft, and muted. Pastels and misty tones suit you best.',
        'Autumn': 'Warm, rich, and earthy. Think nature, spices, and gold.',
        'Winter': 'Cool, clear, and vivid. Deep contrasts and icy lights look stunning.'
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full h-full flex flex-col p-6 overflow-y-auto animate-in slide-in-from-bottom duration-700">

            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-4xl font-bold text-white mb-2">Your Personal Palette</h2>
                    <p className="text-xl text-purple-200">
                        Analysis Results: <span className="font-bold text-teal-300">{analysis.skinTone} Skin Tone</span>
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition no-print"
                >
                    <Printer className="w-5 h-5" />
                    <span>Print Palette</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* Left: Seasonal Identity */}
                <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-tr from-purple-900/40 to-teal-900/40 border border-white/10 p-10 flex flex-col justify-center items-center text-center space-y-6">
                    <div className="p-8 rounded-full bg-white/5 border border-white/5 shadow-2xl animate-float">
                        {seasonIcons[analysis.season]}
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tight uppercase drop-shadow-lg">
                        {analysis.season}
                    </h1>
                    <p className="text-2xl text-white/80 font-light max-w-md">
                        {seasonDescriptions[analysis.season]}
                    </p>
                </div>

                {/* Right: User Image & Context */}
                <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                    <img src={userImage} alt="You" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8">
                        <span className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white font-medium border border-white/20">
                            Captured Analysis
                        </span>
                    </div>
                </div>
            </div>

            {/* Color Palettes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8">

                {/* Best Hair Colors */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
                        <Droplet className="w-6 h-6 text-teal-400" />
                        <span>Recommended Shades</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analysis.bestColors.map((color) => (
                            <div key={color.id} className="group p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition duration-300">
                                <div
                                    className="w-full h-32 rounded-2xl mb-4 shadow-lg"
                                    style={{ backgroundColor: color.hexCode }}
                                ></div>
                                <h4 className="text-xl font-bold text-white mb-1">{color.name}</h4>
                                <p className="text-sm text-gray-400 mb-3">{color.description}</p>
                                <div className="bg-black/20 rounded-xl p-3">
                                    <p className="text-xs text-teal-200 italic">"{color.expertTip}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Colors to Avoid */}
                <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white flex items-center space-x-2">
                        <XCircle className="w-6 h-6 text-red-400" />
                        <span>Shades to Avoid</span>
                    </h3>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 h-full">
                        <p className="text-gray-300 mb-6">These colors may clash with your {analysis.skinTone.toLowerCase()} undertones or wash you out.</p>
                        <div className="space-y-3">
                            {analysis.avoidColors.map((color, idx) => (
                                <div key={idx} className="flex items-center space-x-3 text-red-200">
                                    <XCircle className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium text-lg">{color}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Action Footer */}
            <div className="flex justify-center p-8 no-print">
                <button
                    onClick={onReset}
                    className="px-8 py-3 bg-white hover:bg-gray-200 text-black font-bold rounded-2xl transition shadow-lg"
                >
                    Analyze Again
                </button>
            </div>

        </div>
    );
}
