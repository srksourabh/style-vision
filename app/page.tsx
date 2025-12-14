'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, Palette, Heart, RefreshCw, ChevronDown, ChevronUp, X, AlertCircle, Wand2, Loader2 } from 'lucide-react';

// Types for virtual try-on
interface HairstyleRecommendation {
  name: string;
  description: string;
  suitabilityScore: number;
  maintenanceLevel: string;
  stylingTips: string[];
  bestFor: string[];
  cuttingTechnique?: string;
  lengthChange?: string;
  visualDescription?: string;
  generatedImage?: string | null;
  generationSuccess?: boolean;
}

interface ColorRecommendation {
  name: string;
  hexCode: string;
  description: string;
  suitabilityScore: number;
  maintenanceLevel: string;
  bestFor: string[];
  technique?: string;
  generatedImage?: string | null;
}

interface FaceAnalysis {
  faceShape: string;
  faceAnalysis: {
    jawline: string;
    forehead: string;
    cheekbones: string;
    faceRatio: string;
    bestFeatures?: string;
    areasToBalance?: string;
  };
  currentHair: {
    estimatedLength: string;
    texture: string;
    density?: string;
    currentStyle?: string;
  };
  expertTip: string;
}

export default function StyleVision() {
  const [currentView, setCurrentView] = useState<'landing' | 'camera'>('landing');
  const [analysisMode, setAnalysisMode] = useState<'hair' | 'color' | 'bridal' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [hairResults, setHairResults] = useState<HairstyleRecommendation[] | null>(null);
  const [colorResults, setColorResults] = useState<ColorRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Face detection
  const detectFace = useCallback((): boolean => {
    if (!videoRef.current || !canvasRef.current) return false;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || video.videoWidth === 0) return false;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.4;
    const radiusX = canvas.width * 0.2;
    const radiusY = canvas.height * 0.2;

    let skinPixels = 0;
    let totalPixels = 0;

    for (let y = Math.max(0, centerY - radiusY); y < Math.min(canvas.height, centerY + radiusY); y += 4) {
      for (let x = Math.max(0, centerX - radiusX); x < Math.min(canvas.width, centerX + radiusX); x += 4) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        if (dx * dx + dy * dy <= 1) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          const r = pixel[0], g = pixel[1], b = pixel[2];
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
            skinPixels++;
          }
          totalPixels++;
        }
      }
    }

    return totalPixels > 0 && (skinPixels / totalPixels) > 0.3;
  }, []);

  const startFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = setInterval(() => {
      setFaceDetected(detectFace());
    }, 200);
  }, [detectFace]);

  useEffect(() => {
    if (faceDetected && countdown === null && !capturedPhoto && isCameraReady) {
      setCountdown(3);
    }
  }, [faceDetected, countdown, capturedPhoto, isCameraReady]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      capturePhotoNow();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev !== null ? prev - 1 : null), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const capturePhotoNow = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.95));
    stopCamera();
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setIsCameraReady(false);
    setFaceDetected(false);
  }, []);

  const initializeCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setCameraError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video load timeout')), 10000);
        video.onloadedmetadata = () => { clearTimeout(timeout); resolve(); };
        video.onerror = () => { clearTimeout(timeout); reject(new Error('Video error')); };
      });

      await video.play();
      setIsCameraReady(true);
      setTimeout(() => startFaceDetection(), 500);

    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permissions.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found.');
      } else {
        setCameraError(`Camera error: ${error.message || 'Unknown error'}`);
      }
      setIsCameraActive(false);
      setIsCameraReady(false);
    }
  }, [facingMode, startFaceDetection]);

  useEffect(() => {
    if (isCameraActive && !isCameraReady && videoRef.current) {
      initializeCamera();
    }
  }, [isCameraActive, isCameraReady, initializeCamera]);

  // Virtual Try-On Analysis
  const analyzePhoto = async () => {
    if (!capturedPhoto) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress('Analyzing your facial features...');
    
    try {
      const response = await fetch('/api/virtual-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhoto: capturedPhoto,
          analysisType: analysisMode === 'color' ? 'color' : 'hair'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      if (result.success) {
        setFaceAnalysis(result.analysis);
        
        if (analysisMode === 'color') {
          setColorResults(result.recommendations);
        } else {
          setHairResults(result.recommendations);
        }
        
        setAnalysisProgress('');
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const startAnalysis = (mode: 'hair' | 'color' | 'bridal') => {
    setAnalysisMode(mode);
    setCurrentView('camera');
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setFaceAnalysis(null);
    setError(null);
  };

  const goBack = () => {
    stopCamera();
    setCurrentView('landing');
    setAnalysisMode(null);
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setFaceAnalysis(null);
    setError(null);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setFaceAnalysis(null);
    setError(null);
    setCountdown(null);
    setIsCameraActive(true);
    setIsCameraReady(false);
  };

  const openImageViewer = (image: string, styleTitle: string) => {
    setViewerImage(image);
    setSelectedStyle(styleTitle);
    setViewerOpen(true);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'border-green-500 text-green-700 bg-green-50';
    if (score >= 0.6) return 'border-teal-500 text-teal-700 bg-teal-50';
    return 'border-purple-500 text-purple-700 bg-purple-50';
  };

  const getMaintenanceColor = (level: string) => {
    if (level === 'Low') return 'bg-green-100 text-green-800';
    if (level === 'Medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/StyleVision_Logo.jpg" alt="StyleVision" className="w-12 h-12 rounded-lg" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                StyleVision AI
              </h1>
            </div>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg transition-shadow">
              Sign In
            </button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-teal-100 rounded-full mb-6">
              <Wand2 className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">AI-Powered Virtual Try-On</span>
            </div>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-teal-500 to-purple-600 bg-clip-text text-transparent">
            See Yourself with New Hairstyles
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Take a photo and our AI will generate realistic previews of YOU with different haircuts based on your face shape and features
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button
              onClick={() => startAnalysis('hair')}
              className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Hairstyle Try-On
            </button>
            <button
              onClick={() => startAnalysis('color')}
              className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
            >
              <Palette className="w-5 h-5" />
              Hair Color Try-On
            </button>
            <button
              onClick={() => startAnalysis('bridal')}
              className="group px-8 py-4 bg-gradient-to-r from-purple-600 via-teal-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
            >
              <Heart className="w-5 h-5" />
              Bridal Studio
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. Take Your Photo</h3>
              <p className="text-gray-600">Our AI detects your face and analyzes your unique features</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-teal-50 to-white rounded-xl border border-teal-100">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. AI Generates Styles</h3>
              <p className="text-gray-600">See realistic previews of YOUR face with different hairstyles</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-teal-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Find Your Look</h3>
              <p className="text-gray-600">Choose the perfect style and show your stylist</p>
            </div>
          </div>
        </section>

        <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400">© 2025 StyleVision AI - Virtual Hairstyle Try-On</p>
          </div>
        </footer>
      </div>
    );
  }

  // Camera View
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
            <ChevronDown className="w-5 h-5 rotate-90" />
            <span className="font-semibold">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <img src="/StyleVision_Logo.jpg" alt="StyleVision" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
              {analysisMode === 'hair' ? 'Hairstyle Try-On' : analysisMode === 'color' ? 'Color Try-On' : 'Bridal Studio'}
            </h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Camera/Photo Section */}
          <div>
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-6">
              {!capturedPhoto ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Position Your Face</h3>
                    {isCameraReady && (
                      <button
                        onClick={() => {
                          setFacingMode(f => f === 'user' ? 'environment' : 'user');
                          setIsCameraReady(false);
                          streamRef.current?.getTracks().forEach(t => t.stop());
                        }}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"
                      >
                        <RefreshCw className="w-5 h-5 text-gray-700" />
                      </button>
                    )}
                  </div>

                  <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-gray-900 rounded-xl overflow-hidden">
                    {isCameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                        
                        {!isCameraReady && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                            <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                            <p className="text-white text-sm">Starting camera...</p>
                          </div>
                        )}

                        {isCameraReady && (
                          <>
                            <div className="absolute inset-0 pointer-events-none">
                              <svg className="w-full h-full">
                                <ellipse
                                  cx="50%" cy="40%" rx="35%" ry="30%"
                                  fill="none"
                                  stroke={faceDetected ? '#14b8a6' : '#a855f7'}
                                  strokeWidth="3"
                                  strokeDasharray="10,5"
                                  opacity="0.8"
                                />
                              </svg>
                            </div>

                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full">
                              <p className="text-white text-sm font-semibold">
                                {faceDetected ? '✓ Face Detected' : 'Position face in oval'}
                              </p>
                            </div>

                            {countdown !== null && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="text-8xl font-bold text-white animate-pulse">{countdown}</div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <Camera className="w-16 h-16 text-gray-500 mb-4" />
                        <button
                          onClick={() => setIsCameraActive(true)}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg"
                        >
                          Start Camera
                        </button>
                        {cameraError && <p className="mt-4 text-sm text-red-400 text-center">{cameraError}</p>}
                      </div>
                    )}
                  </div>

                  {isCameraReady && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={capturePhotoNow}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-xl flex items-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        Capture Now
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Your Photo</h3>
                  <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden mb-6">
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={retakePhoto}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Retake
                    </button>
                    <button
                      onClick={analyzePhoto}
                      disabled={isAnalyzing}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          Generate Styles
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Face Analysis Results */}
            {faceAnalysis && (
              <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-2xl border border-purple-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Your Face Analysis
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Face Shape</p>
                    <p className="font-semibold text-gray-900">{faceAnalysis.faceShape}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Hair</p>
                    <p className="font-semibold text-gray-900">{faceAnalysis.currentHair?.estimatedLength} {faceAnalysis.currentHair?.texture}</p>
                  </div>
                  {faceAnalysis.faceAnalysis?.bestFeatures && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Best Features</p>
                      <p className="font-semibold text-gray-900">{faceAnalysis.faceAnalysis.bestFeatures}</p>
                    </div>
                  )}
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

          {/* Results Section */}
          <div>
            {isAnalyzing && (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-600 animate-spin" />
                <p className="text-lg font-semibold text-gray-900">{analysisProgress || 'Generating your personalized styles...'}</p>
                <p className="text-sm text-gray-500 mt-2">This may take a moment as AI creates images of you with each hairstyle</p>
              </div>
            )}

            {hairResults && hairResults.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-purple-600" />
                  Your Personalized Styles
                </h2>

                {hairResults.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-purple-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{rec.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{rec.description}</p>
                      </div>
                      <div className={`ml-4 px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(rec.suitabilityScore)}`}>
                        {Math.round(rec.suitabilityScore * 100)}%
                      </div>
                    </div>

                    {/* AI Generated Image */}
                    <div className="mb-4">
                      {rec.generatedImage ? (
                        <button
                          onClick={() => openImageViewer(rec.generatedImage!, rec.name)}
                          className="relative w-full aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden group cursor-pointer hover:ring-2 hover:ring-purple-500"
                        >
                          <img
                            src={rec.generatedImage}
                            alt={`You with ${rec.name}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                            <span className="text-white font-semibold">Click to enlarge</span>
                          </div>
                          <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-semibold flex items-center gap-1">
                            <Wand2 className="w-3 h-3" />
                            AI Generated
                          </div>
                        </button>
                      ) : (
                        <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Image generation unavailable</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {rec.lengthChange && (
                      <p className="text-sm text-purple-700 mb-3 font-medium">✂️ {rec.lengthChange}</p>
                    )}

                    {expandedCard === idx && (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        {rec.cuttingTechnique && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Cutting Technique</p>
                            <p className="text-sm text-gray-600">{rec.cuttingTechnique}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Best For</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.bestFor?.map((item, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{item}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Styling Tips</p>
                          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                            {rec.stylingTips?.map((tip, i) => <li key={i}>{tip}</li>)}
                          </ul>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">Maintenance:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMaintenanceColor(rec.maintenanceLevel)}`}>
                            {rec.maintenanceLevel}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
                      className="mt-4 text-purple-600 font-semibold text-sm hover:text-purple-700 flex items-center gap-1"
                    >
                      {expandedCard === idx ? (
                        <>Less Details <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>More Details <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {colorResults && colorResults.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Color Recommendations</h2>
                {colorResults.map((color, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-20 h-20 rounded-lg shadow-lg flex-shrink-0"
                        style={{ backgroundColor: color.hexCode }}
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{color.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{color.description}</p>
                        {color.technique && (
                          <p className="text-sm text-purple-700 mb-2">Technique: {color.technique}</p>
                        )}
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(color.suitabilityScore)}`}>
                          {Math.round(color.suitabilityScore * 100)}% Match
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {!hairResults && !colorResults && !error && !isAnalyzing && (
              <div className="text-center py-12 text-gray-500">
                <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold">Take a photo to see AI-generated hairstyle previews</p>
                <p className="text-sm mt-2">Our AI will show YOU with different haircuts</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewerOpen && viewerImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full">
            <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
              <Wand2 className="w-6 h-6" />
              {selectedStyle}
            </h2>
            
            <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden">
              <img
                src={viewerImage}
                alt={selectedStyle}
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-white/60 text-center mt-4 text-sm">
              AI-generated preview of you with this hairstyle
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
