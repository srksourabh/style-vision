"use client";

import React, { useState, useEffect } from "react";
import CameraCapture from "@/components/CameraCapture";
import ResultsGallery from "@/components/ResultsGallery";
import { analyzeFace, AnalysisResult } from "@/utils/analysisEngine";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function HairModePage() {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const handleCapture = async (imageData: string) => {
        setCapturedImage(imageData);
        setIsAnalyzing(true);

        // Trigger Analysis
        const result = await analyzeFace(imageData);
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

            {/* View Switcher */}
            {!capturedImage ? (
                <>
                    {/* Header / Nav (Only visible on Camera Screen) */}
                    <div className="absolute top-0 left-0 w-full p-6 z-50 flex items-center justify-between pointer-events-none">
                        <Link href="/" className="pointer-events-auto">
                            <button className="flex items-center space-x-2 text-white/70 hover:text-white transition bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Back to Home</span>
                            </button>
                        </Link>
                        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-purple-300">
                            Hair Mode Analysis
                        </h1>
                        <div className="w-20"></div>
                    </div>

                    <div className="flex-1 w-full h-full">
                        <CameraCapture onCapture={handleCapture} />
                    </div>
                </>
            ) : (
                <div className="w-full h-full relative">

                    {/* Analysis Loading Screen */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0c29]">
                            <div className="relative w-64 h-64">
                                {/* Pulse Effect */}
                                <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 border-4 border-t-teal-400 border-r-purple-500 border-b-teal-400 border-l-purple-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-4 rounded-full overflow-hidden border-2 border-white/20">
                                    <img src={capturedImage} alt="Analyzing" className="w-full h-full object-cover opacity-50" />
                                </div>
                            </div>
                            <h2 className="mt-8 text-3xl font-bold text-white animate-pulse">
                                Analyzing Facial Features...
                            </h2>
                            <p className="text-purple-200/60 mt-2 text-lg">
                                Scanning face shape, jawline, and skin tone
                            </p>
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
