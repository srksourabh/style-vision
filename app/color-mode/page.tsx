"use client";

import React, { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import ColorResults from "@/components/ColorResults";
import { analyzeColor, ColorAnalysisResult } from "@/utils/analysisEngine";
import { ArrowLeft, Loader2, Sparkles, Droplet, Sun, Snowflake } from "lucide-react";
import Link from "next/link";

export default function ColorModePage() {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ColorAnalysisResult | null>(null);
    const [loadingStep, setLoadingStep] = useState(0);

    const loadingSteps = [
        { icon: Droplet, text: "Analyzing skin undertones...", color: "text-purple-400" },
        { icon: Sun, text: "Detecting warm pigments...", color: "text-amber-400" },
        { icon: Snowflake, text: "Checking cool tones...", color: "text-blue-400" },
        { icon: Sparkles, text: "Building your color palette...", color: "text-pink-400" }
    ];

    const handleCapture = async (imageData: string) => {
        setCapturedImage(imageData);
        setIsAnalyzing(true);
        setLoadingStep(0);

        // Animate through loading steps
        const stepInterval = setInterval(() => {
            setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
        }, 1500);

        try {
            const result = await analyzeColor(imageData);
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
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                Color Mode
                            </span>
                        </div>
                        
                        <div className="w-24"></div>
                    </div>

                    <div className="flex-1 w-full h-screen">
                        <CameraCapture onCapture={handleCapture} mode="color" />
                    </div>
                </>
            ) : (
                <div className="w-full min-h-screen relative">

                    {/* Analysis Loading Screen */}
                    {isAnalyzing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
                            
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                                <div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-full blur-[150px] animate-float-slow"></div>
                                <div className="absolute bottom-[-30%] right-[-20%] w-[900px] h-[900px] bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-[180px] animate-float-slow animation-delay-2000"></div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center justify-center p-8">
                                
                                {/* Animated Avatar Container */}
                                <div className="relative mb-12">
                                    {/* Outer Rings */}
                                    <div className="absolute inset-0 scale-150">
                                        <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-pulse-ring"></div>
                                        <div className="absolute inset-0 rounded-full border border-pink-500/30 animate-pulse-ring animation-delay-500"></div>
                                    </div>
                                    
                                    {/* Spinning Gradient Border */}
                                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 animate-rotate-slow opacity-75 blur-sm"></div>
                                        <div className="absolute inset-1 rounded-full bg-slate-900"></div>
                                        
                                        {/* User Image */}
                                        <div className="absolute inset-3 rounded-full overflow-hidden border-2 border-white/20">
                                            <img 
                                                src={capturedImage} 
                                                alt="Analyzing" 
                                                className="w-full h-full object-cover opacity-60"
                                            />
                                            {/* Color Scan Effect */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-purple-400/30 via-transparent to-amber-400/20 animate-scan-line"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Center Icon */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-2xl">
                                            {React.createElement(loadingSteps[loadingStep].icon, {
                                                className: `w-8 h-8 ${loadingSteps[loadingStep].color} animate-pulse`
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Loading Text */}
                                <div className="text-center space-y-4">
                                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                        Color Analysis in Progress
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
                                                        ? 'bg-gradient-to-r from-purple-400 to-pink-400 scale-100' 
                                                        : 'bg-white/20 scale-75'
                                                }`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom Info */}
                                <div className="mt-12 text-center">
                                    <p className="text-white/40 text-sm">
                                        Powered by Google Gemini 2.0 Flash
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Color Results */}
                    {!isAnalyzing && analysisResult && (
                        <ColorResults
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
