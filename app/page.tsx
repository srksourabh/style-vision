'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Sparkles, Loader2, ChevronDown, ChevronUp, Star, Scissors, Palette, SwitchCamera, X, ArrowRight, CheckCircle, Zap } from 'lucide-react';
import { analyzeWithGemini, analyzeColorWithGemini, AnalysisResult, ColorAnalysisResult } from '@/utils/geminiService';
import Image from 'next/image';

type AnalysisMode = 'hairstyle' | 'color' | 'bridal';
type CaptureMode = 'upload' | 'camera';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [colorResult, setColorResult] = useState<ColorAnalysisResult | null>(null);
  const [activeMode, setActiveMode] = useState<AnalysisMode>('hairstyle');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApp, setShowApp] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Logo colors from the uploaded image
  const logoColors = {
    purple: '#a855f7',
    purpleDark: '#7c3aed',
    teal: '#14b8a6',
    tealLight: '#2dd4bf',
    navy: '#1e1b4b',
  };

  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        console.log('Could not enumerate devices:', err);
      }
    };
    checkCameras();
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return false;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let skinPixels = 0;
    const totalPixels = canvas.width * canvas.height;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const checkRadius = Math.min(canvas.width, canvas.height) * 0.25;

    for (let y = Math.max(0, centerY - checkRadius); y < Math.min(canvas.height, centerY + checkRadius); y++) {
      for (let x = Math.max(0, centerX - checkRadius); x < Math.min(canvas.width, centerX + checkRadius); x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15) {
          skinPixels++;
        }
      }
    }

    const skinRatio = skinPixels / (Math.PI * checkRadius * checkRadius);
    return skinRatio > 0.15;
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      detectionIntervalRef.current = setInterval(() => {
        const detected = detectFace();
        setFaceDetected(detected);
      }, 200);
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setFaceDetected(false);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isCameraActive, detectFace]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const error = err as { name?: string };
      console.error('Camera error:', err);
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera. Please try again.');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setIsCameraActive(false);
    setFaceDetected(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => { startCamera(); }, 100);
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setImage(imageData);
    stopCamera();
    setAnalysisResult(null);
    setColorResult(null);
    setError(null);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysisResult(null);
        setColorResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    setExpandedCard(null);
    try {
      if (activeMode === 'hairstyle') {
        const result = await analyzeWithGemini(image);
        setAnalysisResult(result);
        setColorResult(null);
      } else if (activeMode === 'color') {
        const result = await analyzeColorWithGemini(image);
        setColorResult(result);
        setAnalysisResult(null);
      }
    } catch (err) {
      setError('Analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setImage(null);
    setAnalysisResult(null);
    setColorResult(null);
    setError(null);
    setExpandedCard(null);
    stopCamera();
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getMaintenanceColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-teal-600 bg-teal-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!showApp) {
    return (
      <main className="min-h-screen bg-white">
        {/* Header */}
        <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12">
                  <Image 
                    src="/StyleVision_Logo.jpg" 
                    alt="StyleVision" 
                    width={48} 
                    height={48}
                    className="object-contain"
                  />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                  StyleVision
                </span>
              </div>
              <button 
                onClick={() => setShowApp(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Launch App
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-20 pb-32 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              {/* Main Logo */}
              <div className="mb-12 flex justify-center">
                <div className="relative">
                  <div className="w-48 h-48 relative">
                    <Image 
                      src="/StyleVision_Logo.jpg" 
                      alt="StyleVision AI" 
                      width={192} 
                      height={192}
                      className="object-contain drop-shadow-2xl"
                      priority
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-bold rounded-full shadow-lg animate-bounce">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      AI Powered
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 tracking-tight">
                <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-teal-500 bg-clip-text text-transparent">
                  Discover Your Perfect Style
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
                AI-powered beauty analysis for personalized hairstyle, hair color, and bridal styling recommendations
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <button 
                  onClick={() => setShowApp(true)}
                  className="group px-10 py-5 bg-gradient-to-r from-purple-600 to-teal-500 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Start Free Analysis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-10 py-5 border-2 border-gray-200 text-gray-700 text-lg font-semibold rounded-2xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-300">
                  Learn More
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-medium">100% Privacy Protected</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium">Instant Results</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
                  <Sparkles className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-medium">Google Gemini AI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <p className="text-purple-600 font-semibold mb-3 tracking-wide uppercase text-sm">Features</p>
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">
                Powered by Advanced AI
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Professional-quality style recommendations using cutting-edge technology
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Hair Analysis */}
              <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Scissors className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Hair Analysis</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get personalized hairstyle recommendations based on your face shape, features, and style preferences
                </p>
              </div>

              {/* Color Analysis */}
              <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-teal-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Palette className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Color Analysis</h3>
                <p className="text-gray-600 leading-relaxed">
                  Discover your color season and perfect hair colors that complement your natural skin tone
                </p>
              </div>

              {/* Bridal Studio */}
              <div className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-teal-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Star className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Bridal Studio</h3>
                <p className="text-gray-600 leading-relaxed">
                  Special bridal hairstyle and makeup recommendations for your perfect wedding day look
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <p className="text-teal-600 font-semibold mb-3 tracking-wide uppercase text-sm">Process</p>
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">
                Three Simple Steps
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Capture Photo</h3>
                <p className="text-gray-600">
                  Use your camera or upload a photo. Our AI works best with clear, front-facing shots
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AI Analysis</h3>
                <p className="text-gray-600">
                  Our advanced AI analyzes your facial features, skin tone, and current style
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-teal-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Get Results</h3>
                <p className="text-gray-600">
                  Receive personalized recommendations with confidence scores and styling tips
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image 
                src="/StyleVision_Logo.jpg" 
                alt="StyleVision" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                StyleVision
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2025 StyleVision AI. Your photos are never stored or shared.
            </p>
          </div>
        </footer>
      </main>
    );
  }

  // App Interface (Camera + Analysis)
  return (
    <main className="min-h-screen bg-white">
      {/* App Header */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image 
                src="/StyleVision_Logo.jpg" 
                alt="StyleVision" 
                width={40} 
                height={40}
                className="object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                StyleVision
              </span>
            </div>
            <button 
              onClick={() => setShowApp(false)}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mode Selection */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveMode('hairstyle')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeMode === 'hairstyle'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Scissors className="w-5 h-5 inline mr-2" />
            Hair Analysis
          </button>
          <button
            onClick={() => setActiveMode('color')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeMode === 'color'
                ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Palette className="w-5 h-5 inline mr-2" />
            Color Analysis
          </button>
          <button
            onClick={() => setActiveMode('bridal')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeMode === 'bridal'
                ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star className="w-5 h-5 inline mr-2" />
            Bridal Studio
          </button>
        </div>

        {!image ? (
          <div className="max-w-2xl mx-auto">
            {/* Capture Mode Toggle */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => {
                  setCaptureMode('camera');
                  if (!isCameraActive) startCamera();
                }}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  captureMode === 'camera'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Camera className="w-5 h-5 inline mr-2" />
                Use Camera
              </button>
              <button
                onClick={() => {
                  setCaptureMode('upload');
                  stopCamera();
                }}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  captureMode === 'upload'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Upload className="w-5 h-5 inline mr-2" />
                Upload Photo
              </button>
            </div>

            {captureMode === 'camera' ? (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                {/* Camera Window */}
                <div className="relative aspect-[4/5] max-w-md mx-auto bg-gray-100 rounded-xl overflow-hidden">
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
                      
                      {/* Face Detection Overlay */}
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
                            className="transition-all duration-300"
                          />
                        </svg>
                      </div>

                      {/* Status Message */}
                      <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <div className={`px-4 py-2 rounded-full font-semibold text-sm ${
                          faceDetected 
                            ? 'bg-teal-500 text-white' 
                            : 'bg-purple-500 text-white'
                        }`}>
                          {faceDetected ? '✓ Face Detected - Ready!' : 'Position your face in the oval'}
                        </div>
                      </div>

                      {/* Countdown */}
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-8xl font-black text-white animate-ping">
                            {countdown}
                          </div>
                        </div>
                      )}

                      {/* Camera Controls */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                        {hasMultipleCameras && (
                          <button
                            onClick={switchCamera}
                            className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-all shadow-lg"
                          >
                            <SwitchCamera className="w-6 h-6 text-gray-700" />
                          </button>
                        )}
                        <button
                          onClick={faceDetected ? startCountdown : undefined}
                          disabled={!faceDetected || countdown !== null}
                          className={`px-8 py-3 rounded-full font-bold transition-all shadow-lg ${
                            faceDetected && countdown === null
                              ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white hover:scale-105'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Camera className="w-5 h-5 inline mr-2" />
                          Capture Photo
                        </button>
                        <button
                          onClick={capturePhoto}
                          className="p-3 bg-white/90 backdrop-blur rounded-full hover:bg-white transition-all shadow-lg"
                        >
                          <span className="text-sm font-medium text-gray-700">Manual</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <button
                        onClick={startCamera}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-xl"
                      >
                        <Camera className="w-6 h-6 inline mr-2" />
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {cameraError}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Your Photo</h3>
                  <p className="text-gray-500 mb-6">JPG, PNG or JPEG (max 10MB)</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    Choose File
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              <div className="relative aspect-square max-w-md mx-auto bg-gray-100 rounded-xl overflow-hidden">
                <img src={image} alt="Captured" className="w-full h-full object-cover" />
                <button
                  onClick={resetAnalysis}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {!analysisResult && !colorResult && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full mt-6 px-8 py-4 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 inline mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 inline mr-2" />
                      Analyze with AI
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Results */}
            {(analysisResult || colorResult) && (
              <div className="space-y-4">
                {analysisResult && analysisResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-purple-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{rec.name}</h3>
                        <p className="text-sm text-gray-500">{rec.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(rec.suitabilityScore)}`}>
                        {Math.round(rec.suitabilityScore * 100)}%
                      </div>
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
                ))}

                {colorResult && (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Your Color Profile</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Season</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
                          {colorResult.season}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Recommended Colors</p>
                        <div className="flex flex-wrap gap-2">
                          {colorResult.recommendations.map((color, i) => (
                            <span key={i} className="px-4 py-2 bg-gradient-to-r from-purple-100 to-teal-100 text-gray-800 rounded-full text-sm font-medium">
                              {color.colorName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="lg:col-span-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
