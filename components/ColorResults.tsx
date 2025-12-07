"use client";

import React from "react";
import { ColorAnalysisResult } from "@/utils/analysisEngine";
import { Droplet, Sun, Snowflake, XCircle, Printer, Sparkles, Palette, ArrowLeft, Download, Lightbulb } from "lucide-react";

interface ColorResultsProps {
    analysis: ColorAnalysisResult;
    userImage: string;
    onReset: () => void;
}

export default function ColorResults({ analysis, userImage, onReset }: ColorResultsProps) {

    const seasonConfig = {
        'Spring': {
            icon: <Sun className="w-12 h-12" />,
            gradient: 'from-amber-400 via-orange-400 to-rose-400',
            bgGradient: 'from-amber-50 via-orange-50 to-rose-50',
            accentColor: 'amber',
            iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500'
        },
        'Summer': {
            icon: <Sun className="w-12 h-12" />,
            gradient: 'from-sky-400 via-blue-400 to-indigo-400',
            bgGradient: 'from-sky-50 via-blue-50 to-indigo-50',
            accentColor: 'sky',
            iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500'
        },
        'Autumn': {
            icon: <Droplet className="w-12 h-12" />,
            gradient: 'from-orange-400 via-amber-500 to-red-500',
            bgGradient: 'from-orange-50 via-amber-50 to-red-50',
            accentColor: 'orange',
            iconBg: 'bg-gradient-to-br from-orange-400 to-red-500'
        },
        'Winter': {
            icon: <Snowflake className="w-12 h-12" />,
            gradient: 'from-blue-400 via-indigo-400 to-purple-500',
            bgGradient: 'from-blue-50 via-indigo-50 to-purple-50',
            accentColor: 'blue',
            iconBg: 'bg-gradient-to-br from-blue-400 to-purple-500'
        }
    };

    const config = seasonConfig[analysis.season];

    const handlePrint = () => {
        window.print();
    };

    // Helper to get avoid color name (handles both string and object formats)
    const getAvoidColorName = (color: string | { name: string; reason: string }): string => {
        return typeof color === 'string' ? color : color.name;
    };

    // Helper to get avoid color reason if available
    const getAvoidColorReason = (color: string | { name: string; reason: string }): string | null => {
        return typeof color === 'object' ? color.reason : null;
    };

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden">
            
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient}`}></div>
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-teal-200/30 to-cyan-200/20 rounded-full blur-[100px] animate-float-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-br from-purple-200/30 to-pink-200/20 rounded-full blur-[120px] animate-float-slow animation-delay-2000"></div>
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 animate-fade-in-up">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onReset}
                            className="p-3 bg-white/80 hover:bg-white backdrop-blur-md rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all no-print"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Your Personal Palette</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Palette className="w-4 h-4 text-teal-500" />
                                <span className="text-slate-500">AI Analysis Complete</span>
                                <span className="text-slate-300">•</span>
                                <span className={`font-semibold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                                    {analysis.skinTone} Undertones
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-3 no-print">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/80 hover:bg-white backdrop-blur-md rounded-xl border border-slate-200/50 text-slate-700 font-medium shadow-sm hover:shadow-md transition-all"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all">
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                    {/* Season Card */}
                    <div className="group relative rounded-[2rem] overflow-hidden">
                        {/* Glow Effect */}
                        <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-[2rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity`}></div>
                        
                        <div className="relative h-full bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-6">
                            {/* Decorative Elements */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-500">
                                    Season Type
                                </span>
                            </div>
                            
                            {/* Icon */}
                            <div className={`p-6 ${config.iconBg} rounded-2xl text-white shadow-xl animate-float`}>
                                {config.icon}
                            </div>
                            
                            {/* Season Name */}
                            <div>
                                <h2 className={`text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                                    {analysis.season}
                                </h2>
                                <p className="mt-4 text-lg text-slate-600 max-w-md leading-relaxed">
                                    {analysis.seasonDescription || `Your ${analysis.season} palette is perfectly suited to your natural coloring.`}
                                </p>
                            </div>

                            {/* Undertone Info */}
                            {analysis.undertone && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-sm text-slate-500">Undertone:</span>
                                    <span className="text-sm font-semibold text-slate-700">{analysis.undertone}</span>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-6 pt-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">{analysis.bestColors.length}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Recommended</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200"></div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">{analysis.avoidColors.length}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">To Avoid</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Image Card */}
                    <div className="group relative rounded-[2rem] overflow-hidden aspect-[4/3]">
                        <div className="absolute -inset-1 bg-gradient-to-r from-slate-300 to-slate-400 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        
                        <div className="relative w-full h-full rounded-[2rem] overflow-hidden border border-white/50 shadow-xl">
                            <img src={userImage} alt="Your Analysis" className="w-full h-full object-cover" />
                            
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                            
                            {/* Badge */}
                            <div className="absolute top-4 left-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full border border-white/50 shadow-sm">
                                    <Sparkles className="w-4 h-4 text-teal-500" />
                                    <span className="text-sm font-medium text-slate-800">Your Photo</span>
                                </div>
                            </div>
                            
                            {/* Info */}
                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-center justify-between">
                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-800 font-semibold shadow-sm">
                                        {analysis.skinTone} Undertones
                                    </span>
                                    <span className={`px-4 py-2 bg-gradient-to-r ${config.gradient} rounded-xl text-white font-semibold shadow-lg`}>
                                        {analysis.season}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Tips Section (if available) */}
                {analysis.keyTips && analysis.keyTips.length > 0 && (
                    <div className="mb-8 animate-fade-in-up animation-delay-150">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/50 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 rounded-xl">
                                    <Lightbulb className="w-5 h-5 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Pro Tips</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {analysis.keyTips.map((tip, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 rounded-xl">
                                        <span className="text-amber-500 font-bold">{idx + 1}.</span>
                                        <p className="text-sm text-slate-600">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recommended Colors Section */}
                <div className="mb-8 animate-fade-in-up animation-delay-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-teal-100 rounded-xl">
                            <Sparkles className="w-5 h-5 text-teal-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Recommended Shades</h3>
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
                            {analysis.bestColors.length} colors
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {analysis.bestColors.map((color, idx) => (
                            <div 
                                key={color.id} 
                                className="group relative rounded-2xl overflow-hidden animate-fade-in-up"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: color.hexCode, filter: 'blur(12px)' }}></div>
                                
                                <div className="relative bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                                    {/* Color Swatch */}
                                    <div 
                                        className="w-full h-36 relative overflow-hidden"
                                        style={{ backgroundColor: color.hexCode }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                                        <div className="absolute bottom-3 right-3">
                                            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-mono text-slate-700">
                                                {color.hexCode}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="p-5">
                                        <h4 className="text-lg font-bold text-slate-800 mb-1">{color.name}</h4>
                                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{color.description}</p>
                                        
                                        {/* Expert Tip */}
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-start gap-2">
                                                <span className="text-amber-500">💡</span>
                                                <p className="text-xs text-slate-600 italic leading-relaxed">{color.expertTip}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Colors to Avoid Section */}
                <div className="mb-8 animate-fade-in-up animation-delay-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-100 rounded-xl">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Shades to Avoid</h3>
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                            {analysis.avoidColors.length} colors
                        </span>
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur-xl border border-red-100/50 rounded-2xl p-6 shadow-sm">
                        <p className="text-slate-600 mb-6">
                            These colors may clash with your <span className="font-semibold">{analysis.skinTone.toLowerCase()}</span> undertones or wash you out.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analysis.avoidColors.map((color, idx) => (
                                <div 
                                    key={idx} 
                                    className="p-4 bg-red-50/50 rounded-xl border border-red-100/50 animate-fade-in-up"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <span className="font-semibold text-red-700">{getAvoidColorName(color)}</span>
                                    </div>
                                    {getAvoidColorReason(color) && (
                                        <p className="text-sm text-red-600/80 ml-8">{getAvoidColorReason(color)}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-center py-8 no-print">
                    <button
                        onClick={onReset}
                        className="group flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Analyze Again
                    </button>
                </div>
            </div>
        </div>
    );
}
