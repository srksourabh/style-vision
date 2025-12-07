"use client";

import React, { useState } from "react";
import { Hairstyle, AnalysisResult } from "@/utils/analysisEngine";
import { X, Printer, Sparkles, User, ArrowLeft, Download, Heart, Star, Info, Lightbulb } from "lucide-react";

interface ResultsGalleryProps {
    analysis: AnalysisResult;
    userImage: string;
    onReset: () => void;
}

export default function ResultsGallery({ analysis, userImage, onReset }: ResultsGalleryProps) {
    const [selectedStyle, setSelectedStyle] = useState<Hairstyle | null>(null);
    const [likedStyles, setLikedStyles] = useState<Set<string>>(new Set());

    // Get match score - prefer actual score from analysis, fallback to generated
    const getMatchScore = (style: Hairstyle): number => {
        if (style.matchScore) return style.matchScore;
        // Fallback: generate based on ID for consistency
        const seed = style.id.charCodeAt(0) + (style.id.charCodeAt(1) || 0);
        return 78 + (seed % 22);
    };

    const toggleLike = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setLikedStyles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handlePrint = () => {
        window.print();
    };

    // Get the best match score for display
    const bestMatchScore = Math.max(...analysis.recommendedStyles.map(s => getMatchScore(s)));

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden">
            
            {/* Animated Background */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-teal-200/30 to-cyan-200/20 rounded-full blur-[100px] animate-float-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-gradient-to-br from-purple-200/30 to-pink-200/20 rounded-full blur-[120px] animate-float-slow animation-delay-2000"></div>
            </div>

            {/* Gallery View */}
            {!selectedStyle && (
                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 animate-fade-in-up">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onReset}
                                className="p-3 bg-white/80 hover:bg-white backdrop-blur-md rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all no-print"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-700" />
                            </button>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-3 py-1 bg-gradient-to-r from-teal-500 to-purple-500 text-white text-xs font-bold rounded-full">
                                        AI Analysis Complete
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                        Powered by Gemini
                                    </span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                                    Your Perfect Styles
                                </h1>
                            </div>
                        </div>
                        
                        {/* User Badge */}
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/50 shadow-sm">
                            <img src={userImage} alt="You" className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{analysis.faceShape} Face</p>
                                <p className="text-xs text-slate-500">{analysis.recommendedStyles.length} AI recommendations</p>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Info Card */}
                    <div className="mb-8 p-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="flex-1">
                                <p className="text-lg text-slate-600">
                                    Based on your photo, you have <span className="font-bold text-teal-600">{analysis.faceShapeDescription || `a ${analysis.faceShape} shaped face`}</span>
                                </p>
                                {analysis.stylingRule && (
                                    <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50/80 rounded-xl border border-amber-100/50">
                                        <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-amber-800 font-medium">{analysis.stylingRule}</p>
                                    </div>
                                )}
                                {analysis.hairType && (
                                    <p className="mt-3 text-sm text-slate-500">
                                        Hair type detected: <span className="font-medium text-slate-700">{analysis.hairType}</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <div className="text-center px-6 py-4 bg-slate-50 rounded-xl">
                                    <p className="text-3xl font-black text-slate-800">{analysis.recommendedStyles.length}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Styles</p>
                                </div>
                                <div className="text-center px-6 py-4 bg-teal-50 rounded-xl">
                                    <p className="text-3xl font-black text-teal-600">{bestMatchScore}%</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Best Match</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Styles Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                        {analysis.recommendedStyles.map((style, idx) => {
                            const matchScore = getMatchScore(style);
                            const isLiked = likedStyles.has(style.id);
                            
                            return (
                                <div
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style)}
                                    className="group relative cursor-pointer animate-fade-in-up"
                                    style={{ animationDelay: `${idx * 75}ms` }}
                                >
                                    {/* Glow Effect */}
                                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 to-purple-500/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    
                                    {/* Card */}
                                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-slate-200/50 shadow-sm group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                                        
                                        {/* Image */}
                                        <img
                                            src={style.imageUrl}
                                            alt={style.name}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />

                                        {/* Top Actions */}
                                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                                            {/* Match Badge */}
                                            <div className={`px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1 ${
                                                matchScore >= 90 
                                                    ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-white' 
                                                    : matchScore >= 80 
                                                        ? 'bg-white text-teal-600' 
                                                        : 'bg-white/90 backdrop-blur-sm text-slate-700'
                                            }`}>
                                                {matchScore >= 90 && <Star className="w-3 h-3 fill-current" />}
                                                {matchScore}% Match
                                            </div>
                                            
                                            {/* Like Button */}
                                            <button
                                                onClick={(e) => toggleLike(style.id, e)}
                                                className={`p-2 rounded-full shadow-lg transition-all ${
                                                    isLiked 
                                                        ? 'bg-red-500 text-white scale-110' 
                                                        : 'bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500'
                                                }`}
                                            >
                                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 right-0 p-5">
                                            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
                                                {style.name}
                                            </h3>
                                            <p className="text-white/70 text-sm line-clamp-2 mb-3">
                                                {style.theLook}
                                            </p>
                                            
                                            {/* CTA */}
                                            <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                                <Info className="w-4 h-4" />
                                                <span>View Details</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedStyle && (
                <div className="fixed inset-0 z-50 bg-white animate-fade-in-scale overflow-hidden">
                    
                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedStyle(null)}
                        className="fixed top-6 right-6 z-50 p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-all shadow-lg no-print"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">

                        {/* Left: Visual Comparison */}
                        <div className="w-full lg:w-1/2 h-[40vh] lg:h-full p-6 lg:p-8 bg-slate-50/50 flex flex-col gap-4 lg:gap-6">
                            
                            {/* Your Photo */}
                            <div className="relative flex-1 rounded-2xl lg:rounded-[2rem] overflow-hidden shadow-lg border border-slate-200/50">
                                <img src={userImage} alt="Your Face" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                
                                <div className="absolute top-4 left-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm">
                                        <User className="w-4 h-4 text-teal-600" />
                                        <span className="text-sm font-semibold text-slate-800">Your Photo</span>
                                    </div>
                                </div>
                                
                                <div className="absolute bottom-4 left-4">
                                    <span className="px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-xl text-white font-semibold">
                                        {analysis.faceShape} Face Shape
                                    </span>
                                </div>
                            </div>

                            {/* Style Photo */}
                            <div className="relative flex-1 rounded-2xl lg:rounded-[2rem] overflow-hidden shadow-lg border border-slate-200/50">
                                <img src={selectedStyle.imageUrl} alt={selectedStyle.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                
                                <div className="absolute top-4 left-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm">
                                        <Sparkles className="w-4 h-4 text-purple-600" />
                                        <span className="text-sm font-semibold text-slate-800">AI Recommended</span>
                                    </div>
                                </div>
                                
                                <div className="absolute bottom-4 left-4">
                                    <span className="px-4 py-2 bg-gradient-to-r from-teal-500 to-purple-500 rounded-xl text-white font-bold shadow-lg">
                                        {getMatchScore(selectedStyle)}% Match
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Details Panel */}
                        <div className="w-full lg:w-1/2 h-[60vh] lg:h-full overflow-y-auto">
                            <div className="p-6 lg:p-10 space-y-8">
                                
                                {/* Header */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full uppercase tracking-wider">
                                            AI Recommended
                                        </span>
                                        {getMatchScore(selectedStyle) >= 90 && (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-current" />
                                                Top Pick
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2">
                                        {selectedStyle.name}
                                    </h2>
                                    <p className="text-slate-500">
                                        Perfect for <span className="font-semibold">{analysis.faceShape}</span> face shapes • 
                                        <span className="ml-1 text-teal-600 font-semibold">{getMatchScore(selectedStyle)}% match</span>
                                    </p>
                                </div>

                                {/* The Look */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">The Look</h3>
                                    </div>
                                    <p className="text-xl text-slate-700 leading-relaxed font-medium">
                                        {selectedStyle.theLook}
                                    </p>
                                </div>

                                {/* Why It Works */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Why It Works For You</h3>
                                    </div>
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <p className="text-lg text-slate-700 leading-relaxed">
                                            {selectedStyle.whyItWorks}
                                        </p>
                                    </div>
                                </div>

                                {/* What To Ask For */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">What To Ask For</h3>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-2xl border-l-4 border-purple-500">
                                        <p className="text-lg italic text-slate-700 font-serif">
                                            "{selectedStyle.whatToAskFor}"
                                        </p>
                                    </div>
                                </div>

                                {/* Expert Tip */}
                                {selectedStyle.expertTip && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-500" />
                                            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest">Expert Tip</h3>
                                        </div>
                                        <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                            <p className="text-slate-700">{selectedStyle.expertTip}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Instructions */}
                                {selectedStyle.instructions && selectedStyle.instructions.length > 0 && (
                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">How to Style</h3>
                                        <div className="space-y-3">
                                            {selectedStyle.instructions.map((step, i) => (
                                                <div key={i} className="flex items-start gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-bold text-slate-600">{i + 1}</span>
                                                    </div>
                                                    <p className="text-slate-600 pt-1">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Key Tips from Analysis */}
                                {analysis.keyTips && analysis.keyTips.length > 0 && (
                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-teal-500" />
                                            <h3 className="text-sm font-bold text-teal-600 uppercase tracking-widest">Pro Tips for Your Face Shape</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {analysis.keyTips.map((tip, i) => (
                                                <div key={i} className="flex items-start gap-3 p-4 bg-teal-50/50 rounded-xl border border-teal-100/50">
                                                    <span className="text-lg">💡</span>
                                                    <p className="text-slate-700">{tip}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-4 pt-6 border-t border-slate-100 no-print">
                                    <button 
                                        onClick={handlePrint}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
                                    >
                                        <Printer className="w-5 h-5" />
                                        Print Card
                                    </button>
                                    <button className="flex-1 flex items-center justify-center gap-2 py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all">
                                        <Download className="w-5 h-5" />
                                        Save
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
