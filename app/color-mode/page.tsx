"use client";

import React, { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import ColorResults from "@/components/ColorResults";
import { analyzeColor, ColorAnalysisResult } from "@/utils/analysisEngine";
import { ArrowLeft, Palette } from "lucide-react";
import Link from "next/link";

export default function ColorModePage() {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ColorAnalysisResult | null>(null);

    const handleCapture = async (imageData: string) => {
        setCapturedImage(imageData);
        setIsAnalyzing(true);

        // Trigger Analysis
        const result = await analyzeColor(imageData);
        setAnalysisResult(result);
        setIsAnalyzing(false);
    };

    const handleReset = () => {
        setCapturedImage(null);
        setAnalysisResult(null);
        setIsAnalyzing(false);
    };

    return (
        <main className="relative flex flex-col w-full h-screen bg-[#0f0c29] overflow-hidden">

            {!capturedImage ? (
                <>
                    {/* Header */}
                    <div className="absolute top-0 left-0 w-full p-6 z-50 flex items-center justify-between pointer-events-none">
                        <Link href="/" className="pointer-events-auto">
                            <button className="flex items-center space-x-2 text-white/70 hover:text-white transition bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Back to Home</span>
                            </button>
                        </Link>
                        <div className="flex items-center space-x-3">
                            <Palette className="w-6 h-6 text-purple-400" />
                            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-300">
                                Color Analysis
                            </h1>
                        </div>
                        <div className="w-20"></div>
                    </div>

                    {/* Camera */}
                    <div className="flex-1 w-full h-full">
                        <CameraCapture onCapture={handleCapture} />
                    </div>
                </>
            ) : (
                <div className="w-full h-full relative">

                    {/* Loading Screen */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0c29]">
                            <div className="relative w-64 h-64">
                                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 border-4 border-t-purple-400 border-r-pink-500 border-b-purple-400 border-l-pink-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-4 rounded-full overflow-hidden border-2 border-white/20">
                                    <img src={capturedImage} alt="Analyzing" className="w-full h-full object-cover opacity-50 grayscale" />
                                </div>
                            </div>
                            <h2 className="mt-8 text-3xl font-bold text-white animate-pulse">
                                Detecting Undertones...
                            </h2>
                            <p className="text-purple-200/60 mt-2 text-lg">
                                Scanning for Warm, Cool, or Neutral pigments
                            </p>
                        </div>
                    )}

                    {/* Results */}
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
