"use client";

import React, { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import ResultsGallery from "@/components/ResultsGallery";
import { analyzeFace, AnalysisResult } from "@/utils/analysisEngine";
import { ArrowLeft, Loader2, Sparkles, ScanFace, Brain, Palette, ImagePlus, Wand2 } from "lucide-react";
import Link from "next/link";

export default function HairModePage() {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [loadingStep, setLoadingStep] = useState(0);

    // Enhanced loading steps for Gemini 3 Pro hybrid system
    const loadingSteps = [
        { icon: ScanFace, text: "Detecting facial features...", color: "text-teal-400" },
        { icon: Brain, text: "Analyzing with Gemini 3 Pro...", color: "text-purple-400" },
        { icon: Palette, text: "Matching perfect styles...", color: "text-amber-400" },
        { icon: ImagePlus, text: "Generating AI visualizations...", color: "text-pink-400" },
        { icon: Wand2, text: "Finalizing your recommendations...", color: "text-emerald-400" }
    ];

    const handleCapture = async (imageData: string) => {
        setCapturedImage(imageData);
        setIsAnalyzing(true);
        setLoadingStep(0);

        // Animate through loading steps (longer for AI image generation)
        const stepInterval = setInterval(() => {
            setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
        }, 2000); // 2s per step for hybrid system

        try {
            // Use Gemini 3 Pro hybrid analysis with AI image generation
            const result = await analyzeFace(imageData, {
                generateImages: true,      // Enable AI image generation
                maxImagesToGenerate: 3,    // Generate for top 3 styles
                includeBackView: false     // Front view only for now
            });
            
            clearInterval(stepInterval);
            setAnalysisResult(result);
        } catch (error) {
            console.error('Analysis error:', error);
            clearInterval(stepInterval);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setCapturedImage(null);
        setAnalysisResult(null);
        setIsAnalyzing(false);
        setLoadingStep(0);
    };

    return (
        <main className="relative flex flex-col w-full min-h-screen bg-white overflow-hidden">

            {!capturedImage ? (
                <>
                    {/* Header */}
                    <div className="absolute top-0 left-0 w-full p-6 z-50 flex items-center justify-between pointer-events-none">
                        <Link href="/" className="pointer-events-auto">
                            <button className="group flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full text-white/80 hover:text-white border border-white/10 transition-all shadow-lg">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Back</span>
                            </button>
                        </Link>
                        
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
                            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">
                                Hair Mode
                            </span>
                        </div>
                        
                        <div className="w-24"></div>
                    </div>

                    <div className="flex-1 w-full h-screen">
                        <CameraCapture onCapture={handleCapture} mode="hair" />
                    </div>
                </>
            ) : (
                <div className="w-full min-h-screen relative">

                    {/* Analysis Loading Screen - Enhanced for Gemini 3 */}
                    {isAnalyzing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                            
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                                <div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] bg-gradient-to-br from-teal-500/20 to-cyan-500/10 rounded-full blur-[150px] animate-float-slow"></div>
                                <div className="absolute bottom-[-30%] right-[-20%] w-[900px] h-[900px] bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full blur-[180px] animate-float-slow animation-delay-2000"></div>
                                {/* Extra glow for AI generation phase */}
                                {loadingStep >= 3 && (
                                    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-pink-500/30 to-rose-500/20 rounded-full blur-[120px] animate-pulse"></div>
                                )}
                            </div>

                            <div className="relative z-10 flex flex-col items-center justify-center p-8">
                                
                                {/* Animated Avatar Container */}
                                <div className="relative mb-12">
                                    {/* Outer Rings */}
                                    <div className="absolute inset-0 scale-150">
                                        <div className="absolute inset-0 rounded-full border border-teal-500/30 animate-pulse-ring"></div>
                                        <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-pulse-ring animation-delay-500"></div>
                                        {loadingStep >= 3 && (
                                            <div className="absolute inset-0 rounded-full border-2 border-pink-500/50 animate-pulse-ring animation-delay-1000"></div>
                                        )}
                                    </div>
                                    
                                    {/* Spinning Gradient Border */}
                                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                                        <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${
                                            loadingStep >= 3 
                                                ? 'from-pink-500 via-purple-500 to-teal-500' 
                                                : 'from-teal-500 via-purple-500 to-pink-500'
                                        } animate-rotate-slow opacity-75 blur-sm`}></div>
                                        <div className="absolute inset-1 rounded-full bg-slate-900"></div>
                                        
                                        {/* User Image */}
                                        <div className="absolute inset-3 rounded-full overflow-hidden border-2 border-white/20">
                                            <img 
                                                src={capturedImage} 
                                                alt="Analyzing" 
                                                className="w-full h-full object-cover opacity-60"
                                            />
                                            {/* Scan Effect */}
                                            <div className={`absolute inset-0 ${
                                                loadingStep >= 3 
                                                    ? 'bg-gradient-to-b from-pink-400/40 via-transparent to-purple-400/30' 
                                                    : 'bg-gradient-to-b from-teal-400/30 via-transparent to-transparent'
                                            } animate-scan-line`}></div>
                                            
                                            {/* AI Generation overlay effect */}
                                            {loadingStep >= 3 && (
                                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Center Icon */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center border shadow-2xl transition-all duration-500 ${
                                            loadingStep >= 3 
                                                ? 'bg-gradient-to-br from-pink-900/80 to-purple-900/80 border-pink-500/30' 
                                                : 'bg-slate-900/80 border-white/10'
                                        }`}>
                                            {React.createElement(loadingSteps[loadingStep].icon, {
                                                className: `w-8 h-8 ${loadingSteps[loadingStep].color} animate-pulse`
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Loading Text */}
                                <div className="text-center space-y-4">
                                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                        {loadingStep >= 3 ? 'Creating Your Looks' : 'AI Analysis in Progress'}
                                    </h2>
                                    
                                    {/* Current Step */}
                                    <div className="flex items-center justify-center gap-3 min-h-[40px]">
                                        <Loader2 className={`w-5 h-5 ${loadingSteps[loadingStep].color} animate-spin`} />
                                        <p className={`text-lg font-medium ${loadingSteps[loadingStep].color}`}>
                                            {loadingSteps[loadingStep].text}
                                        </p>
                                    </div>
                                    
                                    {/* Progress Dots */}
                                    <div className="flex items-center justify-center gap-2 pt-4">
                                        {loadingSteps.map((step, idx) => (
                                            <div 
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                                                    idx <= loadingStep 
                                                        ? idx >= 3 
                                                            ? 'bg-gradient-to-r from-pink-400 to-purple-400 scale-100' 
                                                            : 'bg-gradient-to-r from-teal-400 to-purple-400 scale-100' 
                                                        : 'bg-white/20 scale-75'
                                                }`}
                                            ></div>
                                        ))}
                                    </div>

                                    {/* AI Generation Badge */}
                                    {loadingStep >= 3 && (
                                        <div className="mt-6 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full border border-pink-500/30 animate-fade-in">
                                            <span className="text-sm font-medium text-pink-300">
                                                ✨ Generating AI hairstyle previews...
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Info */}
                                <div className="mt-12 text-center space-y-2">
                                    <p className="text-white/60 text-sm font-medium">
                                        Powered by Google Gemini 3 Pro
                                    </p>
                                    <p className="text-white/40 text-xs">
                                        {loadingStep >= 3 
                                            ? 'AI-generated previews • Photorealistic visualization' 
                                            : 'Advanced face analysis • Personalized recommendations'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Gallery */}
                    {!isAnalyzing && analysisResult && (
                        <ResultsGallery
                            analysis={analysisResult}
                            userImage={capturedImage}
                            onReset={handleReset}
                        />
                    )}
                </div>
            )}
        </main>
    );
}
