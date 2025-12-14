'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, Palette, Heart, RefreshCw, ChevronDown, ChevronUp, X, AlertCircle } from 'lucide-react';
import { analyzeWithGemini, analyzeColorWithGemini, HairstyleRecommendation, ColorRecommendation } from '@/utils/geminiService';

// Logo colors from the actual StyleVision logo
const logoColors = {
  purple: '#a855f7',
  purpleDark: '#7c3aed',
  teal: '#14b8a6',
  tealLight: '#2dd4bf',
  navy: '#1e1b4b',
  white: '#ffffff',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Real hairstyle images from Unsplash (free to use)
const hairstyleImageDatabase: Record<string, string[]> = {
  'Layered Lob': [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1595959183082-7b570b7e1dfa?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1554519515-242161756769?w=400&h=400&fit=crop&crop=face',
  ],
  'Textured Pixie': [
    'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face',
  ],
  'Classic Bob': [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=400&h=400&fit=crop&crop=face',
  ],
  'default': [
    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1595959183082-7b570b7e1dfa?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=400&fit=crop&crop=face',
  ]
};

// Get hairstyle images based on style name
const getHairstyleImages = (styleName: string): string[] => {
  // Check if we have specific images for this style
  for (const [key, images] of Object.entries(hairstyleImageDatabase)) {
    if (styleName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(styleName.toLowerCase())) {
      return images;
    }
  }
  // Return default images
  return hairstyleImageDatabase['default'];
};

export default function StyleVision() {
  const [currentView, setCurrentView] = useState<'landing' | 'camera'>('landing');
  const [analysisMode, setAnalysisMode] = useState<'hair' | 'color' | 'bridal' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hairResults, setHairResults] = useState<HairstyleRecommendation[] | null>(null);
  const [colorResults, setColorResults] = useState<ColorRecommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Face detection using skin tone analysis
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
          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];
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
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      const detected = detectFace();
      setFaceDetected(detected);
    }, 200);
  }, [detectFace]);

  // Effect to start countdown when face is detected
  useEffect(() => {
    if (faceDetected && countdown === null && !capturedPhoto && isCameraReady) {
      setCountdown(3);
    }
  }, [faceDetected, countdown, capturedPhoto, isCameraReady]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown <= 0) {
      capturePhotoNow();
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

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
    const photoData = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedPhoto(photoData);
    stopCamera();
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    setFaceDetected(false);
  }, []);

  const initializeCamera = useCallback(async () => {
    if (!videoRef.current) {
      console.log('Video ref not ready yet');
      return;
    }

    console.log('Initializing camera stream...');
    setCameraError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const video = videoRef.current;
      if (!video) {
        console.error('Video element disappeared');
        return;
      }

      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video metadata load timeout'));
        }, 10000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Video element error'));
        };
      });

      await video.play();
      setIsCameraReady(true);
      
      setTimeout(() => {
        startFaceDetection();
      }, 500);

    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      console.error('Camera initialization error:', err);
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permissions in your browser settings and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('Camera is in use by another application. Please close other apps using the camera.');
      } else {
        setCameraError(`Camera error: ${error.message || 'Unknown error. Please refresh and try again.'}`);
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

  const startCamera = () => {
    setCameraError(null);
    setIsCameraActive(true);
  };

  const switchCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isCameraActive) {
      setIsCameraReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (isCameraActive && !isCameraReady && !streamRef.current) {
      const timer = setTimeout(() => {
        initializeCamera();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [facingMode, isCameraActive, isCameraReady, initializeCamera]);

  const capturePhoto = () => {
    capturePhotoNow();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setError(null);
    setCountdown(null);
    setIsUsingFallback(false);
    setIsCameraActive(true);
    setIsCameraReady(false);
  };

  const analyzePhoto = async () => {
    if (!capturedPhoto) return;
    
    setIsAnalyzing(true);
    setError(null);
    setIsUsingFallback(false);
    
    try {
      if (analysisMode === 'hair' || analysisMode === 'bridal') {
        const result = await analyzeWithGemini(capturedPhoto);
        setHairResults(result.recommendations);
        // Check if using fallback (API not configured)
        if (result.recommendations[0]?.name === 'Layered Lob') {
          setIsUsingFallback(true);
        }
      } else if (analysisMode === 'color') {
        const result = await analyzeColorWithGemini(capturedPhoto);
        setColorResults(result.recommendations);
        if (result.recommendations[0]?.colorName === 'Warm Honey Blonde') {
          setIsUsingFallback(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startAnalysis = (mode: 'hair' | 'color' | 'bridal') => {
    setAnalysisMode(mode);
    setCurrentView('camera');
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setError(null);
    setIsUsingFallback(false);
  };

  const goBack = () => {
    stopCamera();
    setCurrentView('landing');
    setAnalysisMode(null);
    setCapturedPhoto(null);
    setHairResults(null);
    setColorResults(null);
    setError(null);
    setIsUsingFallback(false);
  };

  const openImageViewer = (images: string[], styleTitle: string, startIndex: number = 0) => {
    setViewerImages(images);
    setSelectedStyle(styleTitle);
    setCurrentImageIndex(startIndex);
    setViewerOpen(true);
  };

  const closeImageViewer = () => {
    setViewerOpen(false);
    setViewerImages([]);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % viewerImages.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
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
                StyleVision
              </h1>
            </div>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg transition-shadow">
              Sign In
            </button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-4 py-20 text-center">
          <img src="/StyleVision_Logo.jpg" alt="StyleVision" className="w-48 h-48 mx-auto mb-8 rounded-2xl shadow-2xl" />
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-teal-500 to-purple-600 bg-clip-text text-transparent">
            AI-Powered Beauty Analysis
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Discover your perfect hairstyle, color palette, and bridal look with cutting-edge AI technology
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button
              onClick={() => startAnalysis('hair')}
              className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Hair Analysis
            </button>
            <button
              onClick={() => startAnalysis('color')}
              className="group px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2"
            >
              <Palette className="w-5 h-5" />
              Color Analysis
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Live Camera Analysis</h3>
              <p className="text-gray-600">Real-time face detection with instant AI-powered recommendations</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-teal-50 to-white rounded-xl border border-teal-100">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600">Gemini 2.0 Flash delivers professional-grade beauty analysis</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-teal-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Personalized Results</h3>
              <p className="text-gray-600">Tailored recommendations based on your unique features</p>
            </div>
          </div>
        </section>

        <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/StyleVision_Logo.jpg" alt="StyleVision" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold">StyleVision</span>
            </div>
            <p className="text-center text-gray-400">
              © 2025 StyleVision. AI-Powered Beauty Analysis Platform.
            </p>
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
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
            <span className="font-semibold">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <img src="/StyleVision_Logo.jpg" alt="StyleVision" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
              {analysisMode === 'hair' ? 'Hair Analysis' : analysisMode === 'color' ? 'Color Analysis' : 'Bridal Studio'}
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
                        onClick={switchCamera}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        title="Switch Camera"
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
                                  cx="50%"
                                  cy="40%"
                                  rx="35%"
                                  ry="30%"
                                  fill="none"
                                  stroke={faceDetected ? logoColors.teal : logoColors.purple}
                                  strokeWidth="3"
                                  strokeDasharray="10,5"
                                  opacity="0.8"
                                />
                              </svg>
                            </div>

                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full">
                              <p className="text-white text-sm font-semibold">
                                {faceDetected ? '✓ Face Detected - Hold still!' : 'Position your face in the oval'}
                              </p>
                            </div>

                            {countdown !== null && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="text-8xl font-bold text-white animate-pulse">
                                  {countdown}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <Camera className="w-16 h-16 text-gray-500 mb-4" />
                        <button
                          onClick={startCamera}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg transition-shadow"
                        >
                          Start Camera
                        </button>
                        {cameraError && (
                          <p className="mt-4 text-sm text-red-400 text-center max-w-xs">{cameraError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {isCameraReady && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={capturePhoto}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-xl transition-all flex items-center gap-2"
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
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Retake
                    </button>
                    <button
                      onClick={analyzePhoto}
                      disabled={isAnalyzing}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analyze
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Results Section */}
          <div>
            {isUsingFallback && (hairResults || colorResults) && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-semibold text-sm">Demo Mode</p>
                  <p className="text-amber-700 text-sm">
                    Showing sample recommendations. For personalized AI analysis, please configure your Gemini API key in Vercel environment variables.
                  </p>
                </div>
              </div>
            )}

            {(hairResults || colorResults) && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isUsingFallback ? 'Sample Recommendations' : 'Your Personalized Recommendations'}
                </h2>

                {hairResults?.map((rec, idx) => {
                  const styleImages = getHairstyleImages(rec.name);
                  
                  return (
                    <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-purple-300 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{rec.name}</h3>
                          <p className="text-sm text-gray-500">{rec.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(rec.suitabilityScore)}`}>
                          {Math.round(rec.suitabilityScore * 100)}%
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {styleImages.slice(0, 6).map((imgSrc, imgIdx) => (
                          <button
                            key={imgIdx}
                            onClick={() => openImageViewer(styleImages, rec.name, imgIdx)}
                            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                          >
                            <img
                              src={imgSrc}
                              alt={`${rec.name} style ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">
                                View
                              </span>
                            </div>
                            {imgIdx === 0 && (
                              <div className="absolute top-1 left-1 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-semibold">
                                Main
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {expandedCard === idx && (
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Best For</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                              {rec.bestFor.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Styling Tips</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                              {rec.stylingTips.map((tip, i) => <li key={i}>{tip}</li>)}
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
                        className="mt-4 text-purple-600 font-semibold text-sm hover:text-purple-700 transition-colors flex items-center gap-1"
                      >
                        {expandedCard === idx ? (
                          <>Less Details <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>More Details <ChevronDown className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  );
                })}

                {colorResults?.map((color, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-lg shadow-lg flex-shrink-0"
                        style={{ backgroundColor: color.hexCode }}
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{color.colorName}</h3>
                        <p className="text-sm text-gray-500 mb-2">{color.description}</p>
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
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            {!hairResults && !colorResults && !error && (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Capture a photo to get AI-powered recommendations</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={closeImageViewer}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">{selectedStyle}</h2>
            
            <div className="relative aspect-square bg-black rounded-2xl overflow-hidden mb-4">
              <img
                src={viewerImages[currentImageIndex]}
                alt={`${selectedStyle} view ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              <button
                onClick={previousImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
              >
                <ChevronDown className="w-6 h-6 rotate-90" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors"
              >
                <ChevronDown className="w-6 h-6 -rotate-90" />
              </button>
            </div>

            <div className="flex gap-2 justify-center overflow-x-auto pb-2">
              {viewerImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                    currentImageIndex === idx ? 'ring-2 ring-purple-500 scale-105' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <p className="text-white/60 text-center mt-4 text-sm">
              {currentImageIndex + 1} of {viewerImages.length} - Click arrows or thumbnails to browse
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
