'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, Palette, Heart, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Scissors, Loader2 } from 'lucide-react';

// Types
interface HairstyleRecommendation {
  name: string;
  description: string;
  suitabilityScore: number;
  maintenanceLevel: string;
  stylingTips: string[];
  bestFor: string[];
  cuttingTechnique?: string;
  lengthChange?: string;
  dailyStyling?: string;
}

interface ColorRecommendation {
  name: string;
  hexCode: string;
  description: string;
  suitabilityScore: number;
  maintenanceLevel: string;
  bestFor: string[];
  technique?: string;
}

interface FaceAnalysis {
  faceShape: string;
  faceAnalysis: {
    jawline?: string;
    forehead?: string;
    cheekbones?: string;
    bestFeatures?: string;
    areasToBalance?: string;
  };
  currentHair: {
    estimatedLength?: string;
    texture?: string;
    density?: string;
  };
  expertTip: string;
}

// Reference images for hairstyles (Unsplash - free to use)
const hairstyleRefImages: Record<string, string[]> = {
  'crop': [
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&h=300&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&h=300&fit=crop&crop=face',
  ],
  'fade': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face',
  ],
  'textured': [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop&crop=face',
  ],
  'side': [
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=300&h=300&fit=crop&crop=face',
  ],
  'default': [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=300&h=300&fit=crop&crop=face',
  ],
};

const getRefImages = (name: string): string[] => {
  const lower = name.toLowerCase();
  if (lower.includes('crop') || lower.includes('buzz') || lower.includes('crew')) return hairstyleRefImages['crop'];
  if (lower.includes('fade') || lower.includes('taper')) return hairstyleRefImages['fade'];
  if (lower.includes('textured') || lower.includes('volume') || lower.includes('messy')) return hairstyleRefImages['textured'];
  if (lower.includes('side') || lower.includes('part') || lower.includes('classic')) return hairstyleRefImages['side'];
  return hairstyleRefImages['default'];
};

export default function StyleVision() {
  const [currentView, setCurrentView] = useState<'landing' | 'camera'>('landing');
  const [analysisMode, setAnalysisMode] = useState<'hair' | 'color' | 'bridal' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [hairResults, setHairResults] = useState<HairstyleRecommendation[] | null>(null);
  const [colorResults, setColorResults] = useState<ColorRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);

  const detectFace = useCallback((): boolean => {
    if (!videoRef.current || !canvasRef.current) return false;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || video.videoWidth === 0) return false;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const cx = canvas.width / 2, cy = canvas.height * 0.4;
    const rx = canvas.width * 0.2, ry = canvas.height * 0.2;
    let skin = 0, total = 0;

    for (let y = cy - ry; y < cy + ry; y += 4) {
      for (let x = cx - rx; x < cx + rx; x += 4) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) {
          const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) skin++;
          total++;
        }
      }
    }
    return total > 0 && skin / total > 0.3;
  }, []);

  const startDetection = useCallback(() => {
    if (detectionRef.current) clearInterval(detectionRef.current);
    detectionRef.current = setInterval(() => setFaceDetected(detectFace()), 200);
  }, [detectFace]);

  useEffect(() => {
    if (faceDetected && countdown === null && !capturedPhoto && isCameraReady) setCountdown(3);
  }, [faceDetected, countdown, capturedPhoto, isCameraReady]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { capturePhoto(); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (facingMode === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    setCapturedPhoto(c.toDataURL('image/jpeg', 0.95));
    stopCamera();
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (detectionRef.current) { clearInterval(detectionRef.current); detectionRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setIsCameraReady(false);
    setFaceDetected(false);
  }, []);

  const initCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setCameraError(null);
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
      });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await new Promise<void>((res, rej) => {
        const to = setTimeout(() => rej(new Error('Timeout')), 10000);
        v.onloadedmetadata = () => { clearTimeout(to); res(); };
        v.onerror = () => { clearTimeout(to); rej(new Error('Error')); };
      });
      await v.play();
      setIsCameraReady(true);
      setTimeout(startDetection, 500);
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      setCameraError(err.name === 'NotAllowedError' ? 'Camera access denied' : err.message || 'Camera error');
      setIsCameraActive(false);
    }
  }, [facingMode, startDetection]);

  useEffect(() => {
    if (isCameraActive && !isCameraReady) initCamera();
  }, [isCameraActive, isCameraReady, initCamera]);

  const analyze = async () => {
    if (!capturedPhoto) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/virtual-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPhoto: capturedPhoto, analysisType: analysisMode === 'color' ? 'color' : 'hair' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      if (data.success) {
        setFaceAnalysis(data.analysis);
        if (analysisMode === 'color') setColorResults(data.recommendations);
        else setHairResults(data.recommendations);
      } else throw new Error(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const start = (mode: 'hair' | 'color' | 'bridal') => {
    setAnalysisMode(mode);
    setCurrentView('camera');
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setFaceAnalysis(null);
    setError(null);
  };

  const back = () => {
    stopCamera();
    setCurrentView('landing');
    setAnalysisMode(null);
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setFaceAnalysis(null);
  };

  const retake = () => {
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setFaceAnalysis(null);
    setCountdown(null);
    setIsCameraActive(true);
    setIsCameraReady(false);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const scoreColor = (s: number) => s >= 0.8 ? 'bg-green-100 text-green-800 border-green-300' : s >= 0.6 ? 'bg-teal-100 text-teal-800 border-teal-300' : 'bg-purple-100 text-purple-800 border-purple-300';
  const maintColor = (l: string) => l === 'Low' ? 'bg-green-100 text-green-800' : l === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800';

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/StyleVision_Logo.jpg" alt="StyleVision" className="w-12 h-12 rounded-lg" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">StyleVision AI</h1>
            </div>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold">Sign In</button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
            <Scissors className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">AI-Powered Haircut Recommendations</span>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Find Your Perfect Haircut
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            AI analyzes your face shape and features to recommend haircuts that will look great on YOU
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button onClick={() => start('hair')} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
              <Scissors className="w-5 h-5" /> Haircut Analysis
            </button>
            <button onClick={() => start('color')} className="px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
              <Palette className="w-5 h-5" /> Color Analysis
            </button>
            <button onClick={() => start('bridal')} className="px-8 py-4 bg-gradient-to-r from-purple-600 via-teal-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
              <Heart className="w-5 h-5" /> Bridal Studio
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 bg-purple-50 rounded-xl">
              <Camera className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">1. Take Photo</h3>
              <p className="text-gray-600">AI detects your face and analyzes features</p>
            </div>
            <div className="p-6 bg-teal-50 rounded-xl">
              <Sparkles className="w-12 h-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">2. Get Recommendations</h3>
              <p className="text-gray-600">Personalized cuts for your face shape</p>
            </div>
            <div className="p-6 bg-purple-50 rounded-xl">
              <Scissors className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">3. Show Your Barber</h3>
              <p className="text-gray-600">Get cutting instructions to share</p>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-8 mt-20">
          <p className="text-center text-gray-400">© 2025 StyleVision AI</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={back} className="flex items-center gap-2 text-gray-700">
            <ChevronDown className="w-5 h-5 rotate-90" /> Back
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            {analysisMode === 'hair' ? 'Haircut Analysis' : analysisMode === 'color' ? 'Color Analysis' : 'Bridal Studio'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Camera */}
          <div>
            <div className="bg-white rounded-2xl border-2 p-6">
              {!capturedPhoto ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">Position Your Face</h3>
                    {isCameraReady && (
                      <button onClick={() => { setFacingMode(f => f === 'user' ? 'environment' : 'user'); setIsCameraReady(false); }} className="p-2 bg-gray-100 rounded-full">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-gray-900 rounded-xl overflow-hidden">
                    {isCameraActive ? (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                        {!isCameraReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <RefreshCw className="w-12 h-12 text-purple-500 animate-spin" />
                          </div>
                        )}
                        {isCameraReady && (
                          <>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              <ellipse cx="50%" cy="40%" rx="35%" ry="30%" fill="none" stroke={faceDetected ? '#14b8a6' : '#a855f7'} strokeWidth="3" strokeDasharray="10,5" />
                            </svg>
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full">
                              <p className="text-white text-sm">{faceDetected ? '✓ Face Detected' : 'Position face in oval'}</p>
                            </div>
                            {countdown !== null && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-8xl font-bold text-white animate-pulse">{countdown}</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-500 mb-4" />
                        <button onClick={() => setIsCameraActive(true)} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold">
                          Start Camera
                        </button>
                        {cameraError && <p className="mt-4 text-red-400 text-sm">{cameraError}</p>}
                      </div>
                    )}
                  </div>

                  {isCameraReady && (
                    <button onClick={capturePhoto} className="mt-6 w-full py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                      <Camera className="w-5 h-5" /> Capture Now
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-bold mb-4">Your Photo</h3>
                  <div className="w-full max-w-md mx-auto aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden mb-6">
                    <img src={capturedPhoto} alt="You" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={retake} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5" /> Retake
                    </button>
                    <button onClick={analyze} disabled={isAnalyzing} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Sparkles className="w-5 h-5" /> Analyze</>}
                    </button>
                  </div>
                </>
              )}
            </div>

            {faceAnalysis && (
              <div className="mt-6 bg-gradient-to-br from-purple-50 to-teal-50 rounded-2xl border border-purple-200 p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Your Analysis</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Face Shape</p><p className="font-semibold">{faceAnalysis.faceShape}</p></div>
                  <div><p className="text-gray-500">Hair</p><p className="font-semibold">{faceAnalysis.currentHair?.estimatedLength} {faceAnalysis.currentHair?.texture}</p></div>
                </div>
                {faceAnalysis.expertTip && (
                  <div className="mt-4 p-3 bg-white/60 rounded-lg">
                    <p className="text-sm text-purple-800"><strong>Expert Tip:</strong> {faceAnalysis.expertTip}</p>
                  </div>
                )}
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Results */}
          <div>
            {isAnalyzing && (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 mx-auto text-purple-600 animate-spin mb-4" />
                <p className="font-semibold">Analyzing your features...</p>
              </div>
            )}

            {hairResults && hairResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Scissors className="w-6 h-6 text-purple-600" /> Recommended Haircuts</h2>
                <p className="text-gray-600 mb-4">Based on your {faceAnalysis?.faceShape} face shape</p>

                {hairResults.map((rec, i) => {
                  const imgs = getRefImages(rec.name);
                  return (
                    <div key={i} className="bg-white rounded-2xl border-2 p-6 hover:border-purple-300 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold">{rec.name}</h3>
                          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold border ${scoreColor(rec.suitabilityScore)}`}>
                            {Math.round(rec.suitabilityScore * 100)}% Match
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${maintColor(rec.maintenanceLevel)}`}>
                          {rec.maintenanceLevel}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-4">{rec.description}</p>

                      {/* Reference Images */}
                      <div className="flex gap-2 mb-4">
                        {imgs.map((src, j) => (
                          <img key={j} src={src} alt={`${rec.name} example`} className="w-20 h-20 rounded-lg object-cover" loading="lazy" />
                        ))}
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 text-center p-2">
                          Reference styles
                        </div>
                      </div>

                      {rec.lengthChange && <p className="text-sm text-purple-700 font-medium mb-3">✂️ {rec.lengthChange}</p>}

                      {expandedCard === i && (
                        <div className="space-y-3 pt-4 border-t">
                          {rec.cuttingTechnique && (
                            <div className="p-4 bg-purple-50 rounded-lg">
                              <p className="text-sm font-bold text-purple-800 mb-1">📋 Show Your Barber:</p>
                              <p className="text-sm text-purple-900">{rec.cuttingTechnique}</p>
                            </div>
                          )}
                          {rec.dailyStyling && <p className="text-sm"><strong>Daily Styling:</strong> {rec.dailyStyling}</p>}
                          {rec.stylingTips?.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold mb-1">Styling Tips:</p>
                              <ul className="text-sm text-gray-600 list-disc list-inside">{rec.stylingTips.map((t, k) => <li key={k}>{t}</li>)}</ul>
                            </div>
                          )}
                          {rec.bestFor?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {rec.bestFor.map((b, k) => <span key={k} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{b}</span>)}
                            </div>
                          )}
                        </div>
                      )}

                      <button onClick={() => setExpandedCard(expandedCard === i ? null : i)} className="mt-4 text-purple-600 font-semibold text-sm flex items-center gap-1">
                        {expandedCard === i ? <>Less <ChevronUp className="w-4 h-4" /></> : <>Cutting Instructions <ChevronDown className="w-4 h-4" /></>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {colorResults && colorResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Color Recommendations</h2>
                {colorResults.map((c, i) => (
                  <div key={i} className="bg-white rounded-2xl border-2 p-6 flex gap-4">
                    <div className="w-16 h-16 rounded-lg shadow-lg flex-shrink-0" style={{ backgroundColor: c.hexCode }} />
                    <div>
                      <h3 className="text-xl font-bold">{c.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{c.description}</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${scoreColor(c.suitabilityScore)}`}>
                        {Math.round(c.suitabilityScore * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!hairResults && !colorResults && !error && !isAnalyzing && (
              <div className="text-center py-12 text-gray-500">
                <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold">Take a photo to get haircut recommendations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
