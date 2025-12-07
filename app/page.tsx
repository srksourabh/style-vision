'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Sparkles, Loader2, ChevronDown, ChevronUp, Star, Clock, Scissors, Palette, Zap, Shield, Video, SwitchCamera, X, ArrowRight, Brain, Heart } from 'lucide-react';
import { analyzeWithGemini, analyzeColorWithGemini, AnalysisResult, ColorAnalysisResult } from '@/utils/geminiService';

type AnalysisMode = 'hairstyle' | 'color';
type CaptureMode = 'upload' | 'camera';

const StyleVisionLogo = ({ size = 'large' }: { size?: 'small' | 'medium' | 'large' }) => {
  const dimensions = { small: 48, medium: 80, large: 200 };
  const s = dimensions[size];
  
  return (
    <div className="relative group">
      <svg width={s} height={s} viewBox="0 0 200 200" className="drop-shadow-2xl">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#042f2e" />
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="mixedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#bgGrad)" stroke="url(#mixedGrad)" strokeWidth="2"/>
        <circle cx="100" cy="100" r="85" fill="none" stroke="url(#purpleGrad)" strokeWidth="1" opacity="0.3"/>
        <path d="M70 60 Q100 55 120 70 Q145 90 130 110 Q115 130 100 125 Q85 120 75 130 Q60 145 80 155 Q110 170 135 150" fill="none" stroke="url(#purpleGrad)" strokeWidth="8" strokeLinecap="round" filter="url(#glow)" className="animate-pulse"/>
        <path d="M65 70 Q75 50 90 55" fill="none" stroke="url(#tealGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
        <path d="M130 65 Q145 75 140 90" fill="none" stroke="url(#tealGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
        <circle cx="55" cy="90" r="4" fill="url(#tealGrad)" className="animate-ping" style={{animationDuration: '2s'}}/>
        <circle cx="150" cy="105" r="3" fill="url(#purpleGrad)" className="animate-ping" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}/>
        <circle cx="95" cy="45" r="3" fill="url(#tealGrad)" className="animate-ping" style={{animationDuration: '3s', animationDelay: '1s'}}/>
        <ellipse cx="100" cy="100" rx="25" ry="18" fill="none" stroke="url(#tealGrad)" strokeWidth="3" opacity="0.6"/>
        <circle cx="100" cy="100" r="8" fill="url(#mixedGrad)"/>
        <circle cx="103" cy="97" r="3" fill="white" opacity="0.8"/>
      </svg>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-teal-500/20 blur-xl -z-10 group-hover:blur-2xl transition-all duration-500" />
    </div>
  );
};

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => { startCamera(); }, 100);
    }
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
      } else {
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
    if (score >= 0.9) return 'text-teal-400 bg-teal-500/20 border-teal-500/30';
    if (score >= 0.8) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (score >= 0.7) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
  };

  const getMaintenanceColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-teal-400 bg-teal-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'High': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  if (!showApp) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="orb orb-purple w-[700px] h-[700px] -top-64 -left-64" />
          <div className="orb orb-teal w-[600px] h-[600px] top-1/2 -right-64" style={{ animationDelay: '-5s' }} />
          <div className="orb orb-purple w-[500px] h-[500px] -bottom-48 left-1/3" style={{ animationDelay: '-10s' }} />
          <div className="orb orb-teal w-[300px] h-[300px] top-1/4 right-1/4" style={{ animationDelay: '-7s' }} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative z-10">
          <nav className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StyleVisionLogo size="small" />
                <span className="text-xl font-bold gradient-text">StyleVision</span>
              </div>
              <button onClick={() => setShowApp(true)} className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300">
                Launch App
              </button>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 pt-12 pb-24">
            <div className="text-center max-w-5xl mx-auto">
              <div className="mb-10 flex justify-center">
                <div className="relative">
                  <StyleVisionLogo size="large" />
                  <div className="absolute -bottom-2 -right-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-teal-500/30 animate-bounce">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> AI Powered
                    </span>
                  </div>
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight">
                <span className="gradient-text">Style</span>
                <span className="text-white">Vision</span>
                <span className="text-purple-400 opacity-80"> AI</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                Discover your perfect hairstyle with <span className="text-purple-400 font-medium">AI-powered</span> face analysis.
                Get personalized recommendations in <span className="text-teal-400 font-medium">seconds</span>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <button onClick={() => setShowApp(true)} className="group px-10 py-5 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white text-xl font-bold rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3">
                  <Camera className="w-6 h-6" />
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="px-10 py-5 border-2 border-slate-700 text-slate-300 text-xl font-semibold rounded-2xl hover:border-teal-500/50 hover:text-teal-400 hover:bg-teal-500/5 transition-all duration-300 flex items-center justify-center gap-3">
                  <Video className="w-6 h-6" />
                  Watch Demo
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 text-slate-500">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 border border-slate-700/50">
                  <Shield className="w-5 h-5 text-teal-500" />
                  <span>Photos Never Stored</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 border border-slate-700/50">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <span>Results in Seconds</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 border border-slate-700/50">
                  <Sparkles className="w-5 h-5 text-teal-500" />
                  <span>Powered by Gemini</span>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 py-24">
            <div className="text-center mb-16">
              <p className="text-purple-400 font-semibold mb-4 tracking-widest uppercase">Features</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-white">Why Choose </span>
                <span className="gradient-text">StyleVision</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">Advanced AI technology meets personalized style recommendations</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card p-8 group hover:bg-gradient-to-br hover:from-purple-900/20 hover:to-slate-900/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Video className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Live Camera Capture</h3>
                <p className="text-slate-400 leading-relaxed">Take a selfie directly with your phone or laptop camera. Works seamlessly on all modern browsers.</p>
              </div>
              <div className="card card-teal p-8 group hover:bg-gradient-to-br hover:from-teal-900/20 hover:to-slate-900/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <Palette className="w-8 h-8 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Color Analysis</h3>
                <p className="text-slate-400 leading-relaxed">Discover your color season and get hair color recommendations that complement your skin tone.</p>
              </div>
              <div className="card p-8 group hover:bg-gradient-to-br hover:from-indigo-900/20 hover:to-slate-900/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Brain className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Face Analysis</h3>
                <p className="text-slate-400 leading-relaxed">Our AI examines your face shape, features, and current hair to give personalized recommendations.</p>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 py-24">
            <div className="glass rounded-3xl p-10 md:p-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-teal-500/10 to-transparent rounded-full blur-3xl" />
              <div className="relative">
                <div className="text-center mb-16">
                  <p className="text-teal-400 font-semibold mb-4 tracking-widest uppercase">Process</p>
                  <h2 className="text-4xl md:text-5xl font-bold">
                    <span className="text-white">How It </span>
                    <span className="gradient-text">Works</span>
                  </h2>
                </div>
                <div className="grid md:grid-cols-3 gap-12">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-purple-500/30 rotate-3 hover:rotate-0 transition-transform">1</div>
                    <h3 className="text-xl font-bold text-white mb-3">Take a Selfie</h3>
                    <p className="text-slate-400">Use your camera or upload an existing photo. Front-facing works best.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/30 -rotate-3 hover:rotate-0 transition-transform">2</div>
                    <h3 className="text-xl font-bold text-white mb-3">AI Analysis</h3>
                    <p className="text-slate-400">Our AI examines your face shape, features, skin tone, and current hair.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-teal-500/30 rotate-3 hover:rotate-0 transition-transform">3</div>
                    <h3 className="text-xl font-bold text-white mb-3">Get Results</h3>
                    <p className="text-slate-400">Receive personalized hairstyle or color recommendations with styling tips.</p>
                  </div>
                </div>
                <div className="text-center mt-16">
                  <button onClick={() => setShowApp(true)} className="px-12 py-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 text-white text-lg font-bold rounded-2xl hover:shadow-2xl hover:shadow-purple-500/30 hover:scale-105 transition-all duration-300">
                    Try It Now — It&apos;s Free
                  </button>
                </div>
              </div>
            </div>
          </div>
          <footer className="py-16 border-t border-slate-800/50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <StyleVisionLogo size="small" />
                  <div>
                    <span className="text-lg font-bold gradient-text">StyleVision AI</span>
                    <p className="text-slate-500 text-sm">AI-Powered Hair Recommendations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <span>Built with</span>
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  <span>• Powered by Google Gemini 2.0 Flash</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="orb orb-purple w-[400px] h-[400px] -top-32 -right-32 opacity-40" />
        <div className="orb orb-teal w-[300px] h-[300px] bottom-0 -left-32 opacity-40" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <button onClick={() => { setShowApp(false); stopCamera(); resetAnalysis(); }} className="flex items-center justify-center gap-3 mb-4 mx-auto hover:opacity-80 transition-opacity group">
            <StyleVisionLogo size="medium" />
          </button>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            <span className="gradient-text">StyleVision</span>
            <span className="text-white"> AI</span>
          </h1>
          <p className="text-slate-400 text-lg">Take a selfie or upload your photo for AI-powered recommendations</p>
        </div>
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-2xl bg-slate-800/50 border border-slate-700/50 p-1.5 backdrop-blur-sm">
            <button onClick={() => setActiveMode('hairstyle')} className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${activeMode === 'hairstyle' ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30' : 'text-slate-400 hover:text-white'}`}>
              <Scissors className="w-4 h-4" />
              Hairstyle
            </button>
            <button onClick={() => setActiveMode('color')} className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${activeMode === 'color' ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-500/30' : 'text-slate-400 hover:text-white'}`}>
              <Palette className="w-4 h-4" />
              Color
            </button>
          </div>
        </div>
        {!image ? (
          <div className="max-w-xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-xl bg-slate-800/30 border border-slate-700/50 p-1 backdrop-blur-sm">
                <button onClick={() => { setCaptureMode('camera'); stopCamera(); }} className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${captureMode === 'camera' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <Video className="w-4 h-4" />
                  Camera
                </button>
                <button onClick={() => { setCaptureMode('upload'); stopCamera(); }} className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${captureMode === 'upload' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
            </div>
            {captureMode === 'camera' ? (
              <div className="card overflow-hidden">
                {!isCameraActive ? (
                  <div className="p-12 text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Take a Selfie?</h3>
                    <p className="text-slate-400 mb-6">Position your face clearly in the frame</p>
                    {cameraError && (
                      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{cameraError}</div>
                    )}
                    <button onClick={startCamera} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all flex items-center gap-3 mx-auto">
                      <Video className="w-6 h-6" />
                      Start Camera
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <video ref={videoRef} autoPlay playsInline muted className={`w-full h-auto max-h-[500px] object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center justify-center gap-4">
                        {hasMultipleCameras && (
                          <button onClick={switchCamera} className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all">
                            <SwitchCamera className="w-6 h-6" />
                          </button>
                        )}
                        <button onClick={capturePhoto} className="p-5 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full shadow-xl shadow-purple-500/30 hover:scale-110 transition-transform">
                          <Camera className="w-8 h-8 text-white" />
                        </button>
                        <button onClick={stopCamera} className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-red-500/50 transition-all">
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-80 border-2 border-purple-500/30 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="card p-12 text-center cursor-pointer hover:border-purple-500/50 transition-all group border-2 border-dashed border-slate-700">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Your Photo</h3>
                <p className="text-slate-400 mb-4">Click to select or drag and drop</p>
                <p className="text-sm text-slate-500">Supports JPG, PNG up to 10MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="card p-2 overflow-hidden">
                <div className="relative rounded-xl overflow-hidden">
                  <img src={image} alt="Captured" className="w-full h-auto max-h-[500px] object-cover" />
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3 text-purple-400" />
                        <p className="font-semibold text-white">Analyzing your features...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                  {isAnalyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Analyzing...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" />Analyze {activeMode === 'hairstyle' ? 'Hairstyle' : 'Color'}</>
                  )}
                </button>
                <button onClick={resetAnalysis} className="py-4 px-6 border border-slate-700 text-slate-300 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Retake
                </button>
              </div>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">{error}</div>
              )}
              {analysisResult && (
                <div className="card p-6">
                  <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-purple-400" />
                    Your Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Face Shape</p>
                      <p className="font-bold text-purple-300">{analysisResult.faceShape}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Hair Type</p>
                      <p className="font-bold text-purple-300">{analysisResult.hairType}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Hair Texture</p>
                      <p className="font-bold text-purple-300">{analysisResult.hairTexture}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Confidence</p>
                      <p className="font-bold text-teal-300">{Math.round(analysisResult.confidenceScore * 100)}%</p>
                    </div>
                  </div>
                  {analysisResult.expertTip && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-teal-500/10 rounded-xl border border-purple-500/20">
                      <p className="text-sm font-bold text-purple-300">💡 Expert Tip</p>
                      <p className="text-slate-300 mt-1 text-sm">{analysisResult.expertTip}</p>
                    </div>
                  )}
                </div>
              )}
              {colorResult && (
                <div className="card p-6">
                  <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                    Your Color Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Skin Tone</p>
                      <p className="font-bold text-teal-300">{colorResult.skinTone}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Undertone</p>
                      <p className="font-bold text-teal-300 capitalize">{colorResult.undertone}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Season</p>
                      <p className="font-bold text-teal-300">{colorResult.season}</p>
                    </div>
                  </div>
                  {colorResult.expertTip && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-xl border border-teal-500/20">
                      <p className="text-sm font-bold text-teal-300">💡 Expert Tip</p>
                      <p className="text-slate-300 mt-1 text-sm">{colorResult.expertTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {analysisResult && (
                <>
                  <h2 className="text-2xl font-black text-white">Recommended Hairstyles</h2>
                  {analysisResult.recommendations.map((rec, index) => (
                    <div key={index} className="card overflow-hidden">
                      <div onClick={() => setExpandedCard(expandedCard === index ? null : index)} className="p-5 cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 text-white rounded-lg flex items-center justify-center font-black text-sm">{index + 1}</span>
                              <h3 className="text-lg font-bold text-white">{rec.name}</h3>
                            </div>
                            <p className="text-slate-400 text-sm line-clamp-2">{rec.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(rec.suitabilityScore)}`}>
                              {Math.round(rec.suitabilityScore * 100)}% Match
                            </span>
                            {expandedCard === index ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </div>
                        </div>
                      </div>
                      {expandedCard === index && (
                        <div className="px-5 pb-5 border-t border-slate-700/50 pt-4">
                          <div className="flex items-center gap-4 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getMaintenanceColor(rec.maintenanceLevel)}`}>
                              <Clock className="w-3 h-3" />{rec.maintenanceLevel} Maintenance
                            </span>
                          </div>
                          <div className="mb-4">
                            <h4 className="font-bold text-white mb-2">Styling Tips</h4>
                            <ul className="space-y-1">
                              {rec.stylingTips.map((tip, i) => (
                                <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                  <span className="text-purple-400 mt-1">•</span>{tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-2">Best For</h4>
                            <div className="flex flex-wrap gap-2">
                              {rec.bestFor.map((item, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs border border-slate-700 font-medium">{item}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
              {colorResult && (
                <>
                  <h2 className="text-2xl font-black text-white">Recommended Hair Colors</h2>
                  {colorResult.recommendations.map((rec, index) => (
                    <div key={index} className="card overflow-hidden">
                      <div onClick={() => setExpandedCard(expandedCard === index ? null : index)} className="p-5 cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 rounded-xl shadow-lg border-2 border-slate-600" style={{ backgroundColor: rec.hexCode }} />
                            <div>
                              <h3 className="text-lg font-bold text-white">{rec.colorName}</h3>
                              <p className="text-sm text-slate-400">{rec.hexCode}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(rec.suitabilityScore)}`}>
                              {Math.round(rec.suitabilityScore * 100)}% Match
                            </span>
                            {expandedCard === index ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </div>
                        </div>
                      </div>
                      {expandedCard === index && (
                        <div className="px-5 pb-5 border-t border-slate-700/50 pt-4">
                          <p className="text-slate-400 mb-4">{rec.description}</p>
                          <div className="flex items-center gap-4 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getMaintenanceColor(rec.maintenanceLevel)}`}>
                              <Clock className="w-3 h-3" />{rec.maintenanceLevel} Maintenance
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white mb-2">Benefits</h4>
                            <div className="flex flex-wrap gap-2">
                              {rec.bestFor.map((item, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs border border-slate-700 font-medium">{item}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
              {!analysisResult && !colorResult && !isAnalyzing && (
                <div className="card p-8 text-center border-2 border-dashed border-slate-700">
                  <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Click &quot;Analyze&quot; to get your personalized {activeMode === 'hairstyle' ? 'hairstyle' : 'color'} recommendations</p>
                </div>
              )}
            </div>
          </div>
        )}
        <footer className="mt-16 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <span>StyleVision AI</span>
            <span>•</span>
            <span>Powered by Google Gemini 2.0 Flash</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
