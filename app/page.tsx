'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, RefreshCw, ChevronDown, X, Loader2, Scissors, Star, Wand2, User, TrendingUp, Quote, Heart, Palette, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface StylistTip {
  stylist_name: string;
  tip: string;
}

interface GeneratedStyle {
  styleIndex: number;
  styleName: string;
  frontImage: string | null;
  backImage: string | null;
  geometricReasoning?: string;
  trendSource?: string;
  celebrityReference?: string;
  stylistTip?: StylistTip;
  description?: string;
  error: string | null;
}

interface FaceAnalysis {
  shape: string;
  measurements?: {
    forehead_width: string;
    forehead_height: string;
    cheekbone_width: string;
    jawline_width: string;
    jawline_shape: string;
    face_length: string;
    chin_shape: string;
    proportions: string;
  };
  stylingGoals?: string;
}

interface SelectedStyle {
  index: number;
}

type AnalysisMode = 'hair' | 'bridal' | 'color';

export default function StyleVision() {
  const [currentView, setCurrentView] = useState<'landing' | 'camera' | 'generating' | 'reveal' | 'results'>('landing');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('hair');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<SelectedStyle | null>(null);
  
  // Flip card states
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  // AI Generation states
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingStyle, setCurrentGeneratingStyle] = useState(0);
  const [generatedStyles, setGeneratedStyles] = useState<GeneratedStyle[]>([]);
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Reveal countdown
  const [revealCountdown, setRevealCountdown] = useState<number>(3);
  
  // Audio
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle card flip
  const toggleFlip = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Play generation sound
  const playGenerationSound = useCallback(() => {
    if (isMuted) return;
    // Create oscillator for futuristic sound
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [isMuted]);

  // Play reveal sound
  const playRevealSound = useCallback(() => {
    if (isMuted) return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.15); // E5
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.3); // G5
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [isMuted]);

  // Generate AI hairstyles
  const generateHairstyles = useCallback(async (photo: string) => {
    setCurrentView('generating');
    setGenerationProgress(0);
    setGeneratedStyles([]);
    setFaceAnalysis(null);
    setGenerationError(null);
    
    try {
      const results: GeneratedStyle[] = [];
      
      for (let i = 0; i < 6; i++) {
        setCurrentGeneratingStyle(i);
        setGenerationProgress(Math.round(((i + 0.5) / 6) * 100));
        playGenerationSound();
        
        try {
          const response = await fetch('/api/generate-hairstyle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userPhoto: photo,
              styleIndex: i,
              mode: analysisMode
            })
          });
          
          const data = await response.json();
          
          if (i === 0 && data.faceAnalysis) {
            setFaceAnalysis(data.faceAnalysis);
          }
          
          if (data.success && data.results && data.results[0]) {
            const result = data.results[0];
            results.push({
              styleIndex: result.styleIndex,
              styleName: result.styleName || `Style ${i + 1}`,
              frontImage: result.frontImage,
              backImage: result.backImage,
              geometricReasoning: result.geometricReasoning,
              trendSource: result.trendSource,
              celebrityReference: result.celebrityReference,
              stylistTip: result.stylistTip,
              description: result.description,
              error: null
            });
          } else {
            results.push({ 
              styleIndex: i, 
              styleName: `Style ${i + 1}`,
              frontImage: null,
              backImage: null,
              error: data.error || 'Failed to generate' 
            });
          }
        } catch (err) {
          results.push({ 
            styleIndex: i, 
            styleName: `Style ${i + 1}`,
            frontImage: null,
            backImage: null,
            error: 'Network error' 
          });
        }
        
        setGeneratedStyles([...results]);
        setGenerationProgress(Math.round(((i + 1) / 6) * 100));
      }
      
      const successCount = results.filter(r => r.frontImage).length;
      if (successCount === 0) {
        setGenerationError('Could not generate styles. Please try again.');
        setCurrentView('results');
      } else {
        // Start reveal countdown
        setCurrentView('reveal');
        setRevealCountdown(3);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationError('Generation failed. Please try again.');
      setCurrentView('results');
    }
  }, [analysisMode, playGenerationSound]);

  // Reveal countdown effect
  useEffect(() => {
    if (currentView !== 'reveal') return;
    
    if (revealCountdown <= 0) {
      playRevealSound();
      setTimeout(() => setCurrentView('results'), 500);
      return;
    }
    
    playRevealSound();
    const timer = setTimeout(() => setRevealCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [currentView, revealCountdown, playRevealSound]);

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

    const cx = canvas.width / 2, cy = canvas.height * 0.4;
    const rx = canvas.width * 0.2, ry = canvas.height * 0.2;
    let skin = 0, total = 0;

    for (let y = cy - ry; y < cy + ry; y += 4) {
      for (let x = cx - rx; x < cx + rx; x += 4) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) {
          const data = ctx.getImageData(x, y, 1, 1).data;
          const r = data[0], g = data[1], b = data[2];
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
    const size = Math.min(v.videoWidth, v.videoHeight);
    c.width = size; 
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    
    const offsetX = (v.videoWidth - size) / 2;
    const offsetY = (v.videoHeight - size) / 2;
    
    if (facingMode === 'user') { 
      ctx.translate(size, 0); 
      ctx.scale(-1, 1); 
      ctx.drawImage(v, offsetX, offsetY, size, size, 0, 0, size, size);
    } else {
      ctx.drawImage(v, offsetX, offsetY, size, size, 0, 0, size, size);
    }
    
    const photo = c.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(photo);
    stopCamera();
    generateHairstyles(photo);
  }, [facingMode, generateHairstyles]);

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

  const startAnalysis = (mode: AnalysisMode) => {
    setAnalysisMode(mode);
    setCurrentView('camera');
    setCapturedPhoto(null);
    setSelectedStyle(null);
    setGeneratedStyles([]);
    setFaceAnalysis(null);
    setGenerationError(null);
    setFlippedCards(new Set());
  };

  const back = () => {
    stopCamera();
    setCurrentView('landing');
    setCapturedPhoto(null);
    setSelectedStyle(null);
    setGeneratedStyles([]);
    setFaceAnalysis(null);
    setFlippedCards(new Set());
  };

  const retake = () => {
    setCapturedPhoto(null);
    setCountdown(null);
    setSelectedStyle(null);
    setCurrentView('camera');
    setIsCameraActive(true);
    setIsCameraReady(false);
    setGeneratedStyles([]);
    setFaceAnalysis(null);
    setGenerationError(null);
    setFlippedCards(new Set());
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Mode config
  const modeConfig = {
    hair: { icon: Scissors, title: 'Hair Analysis', color: 'purple', gradient: 'from-purple-600 to-teal-500' },
    bridal: { icon: Heart, title: 'Bridal Studio', color: 'pink', gradient: 'from-pink-500 to-rose-400' },
    color: { icon: Palette, title: 'Color Analysis', color: 'amber', gradient: 'from-amber-500 to-orange-400' }
  };

  const currentModeConfig = modeConfig[analysisMode];

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50">
        <header className="bg-white/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-teal-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">StyleVision AI</h1>
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-gray-500 hover:text-gray-700">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full mb-4">
            <Wand2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">AI-Powered Face Analysis</span>
          </div>
          
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Discover Your Perfect Look
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            AI analyzes your face shape and recommends personalized styles with tips from world-famous stylists
          </p>

          {/* Mode Selection Cards */}
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            {/* Hair Analysis */}
            <button 
              onClick={() => startAnalysis('hair')}
              className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-300"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-teal-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Scissors className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hair Analysis</h3>
              <p className="text-sm text-gray-600">Find hairstyles that add height, create angles, slim face &amp; define jawline</p>
            </button>

            {/* Bridal Studio */}
            <button 
              onClick={() => startAnalysis('bridal')}
              className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-pink-300"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Bridal Studio</h3>
              <p className="text-sm text-gray-600">Elegant bridal hairstyles for your special day</p>
            </button>

            {/* Color Analysis */}
            <button 
              onClick={() => startAnalysis('color')}
              className="group p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-amber-300"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Color Analysis</h3>
              <p className="text-sm text-gray-600">Discover hair colors that complement your skin tone</p>
            </button>
          </div>
          
          <div className="p-4 bg-white/70 rounded-xl max-w-lg mx-auto">
            <p className="text-xs text-gray-500">
              ✨ <strong>Interactive Results:</strong> Hover to highlight, click to flip and see back view
            </p>
            <p className="text-xs text-gray-500 mt-1">
              💇 Tips from <strong>Javed Habib</strong>, <strong>Aalim Hakim</strong>, <strong>Vidal Sassoon</strong> &amp; more
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Camera View
  if (currentView === 'camera') {
    const ModeIcon = currentModeConfig.icon;
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <header className="bg-black/50 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={back} className="flex items-center gap-1 text-white/80 hover:text-white">
              <ChevronDown className="w-5 h-5 rotate-90" /> Back
            </button>
            <div className="flex items-center gap-2">
              <ModeIcon className="w-5 h-5 text-white" />
              <h1 className="text-white font-semibold">{currentModeConfig.title}</h1>
            </div>
            <div className="w-16" />
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
              {isCameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
                  
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
                    </div>
                  )}
                  
                  {isCameraReady && (
                    <>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <ellipse cx="50%" cy="45%" rx="35%" ry="40%" fill="none" stroke={faceDetected ? '#14b8a6' : '#a855f7'} strokeWidth="2" strokeDasharray="8,4" />
                      </svg>
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 rounded-full">
                        <p className="text-white text-xs font-medium">{faceDetected ? '✓ Face Detected' : 'Position face in oval'}</p>
                      </div>
                      {countdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-7xl font-bold text-white animate-pulse">{countdown}</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <Camera className="w-14 h-14 text-gray-500 mb-3" />
                  <button onClick={() => setIsCameraActive(true)} className={`px-5 py-2.5 bg-gradient-to-r ${currentModeConfig.gradient} text-white rounded-full font-medium text-sm`}>
                    Start Camera
                  </button>
                  {cameraError && <p className="mt-3 text-red-400 text-xs">{cameraError}</p>}
                </div>
              )}
            </div>

            {isCameraReady && (
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setFacingMode(f => f === 'user' ? 'environment' : 'user'); setIsCameraReady(false); }} className="flex-1 py-2.5 bg-white/10 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Flip
                </button>
                <button onClick={capturePhoto} className={`flex-[2] py-2.5 bg-gradient-to-r ${currentModeConfig.gradient} text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2`}>
                  <Camera className="w-4 h-4" /> Capture
                </button>
              </div>
            )}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Generating View - Animated Loading
  if (currentView === 'generating') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${analysisMode === 'bridal' ? 'from-pink-900 to-rose-800' : analysisMode === 'color' ? 'from-amber-900 to-orange-800' : 'from-purple-900 to-teal-900'} flex items-center justify-center p-4 overflow-hidden`}>
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Rotating rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/10 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute w-48 h-48 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
          <div className="absolute w-32 h-32 border-2 border-white/30 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        <div className="relative bg-white/95 backdrop-blur rounded-2xl p-6 max-w-md w-full text-center shadow-2xl z-10">
          <div className="relative w-24 h-24 mx-auto mb-6">
            {capturedPhoto && (
              <img src={capturedPhoto} alt="Your photo" className="w-full h-full rounded-full object-cover border-4 border-purple-500 animate-pulse" />
            )}
            <div className={`absolute -bottom-1 -right-1 w-10 h-10 bg-gradient-to-r ${currentModeConfig.gradient} rounded-full flex items-center justify-center animate-bounce`}>
              <Wand2 className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">AI Analyzing Your Face</h3>
          <p className="text-gray-600 mb-1 text-sm">
            {currentGeneratingStyle < 6 
              ? `Creating style ${currentGeneratingStyle + 1} of 6...`
              : 'Finalizing your looks...'}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Generating front &amp; back views
          </p>
          
          {/* Animated progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div 
              className={`bg-gradient-to-r ${currentModeConfig.gradient} h-3 rounded-full transition-all duration-500 relative`}
              style={{ width: `${generationProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse" />
            </div>
          </div>
          
          {/* Mini preview grid */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const generated = generatedStyles.find(g => g.styleIndex === idx);
              return (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                  {generated?.frontImage ? (
                    <img src={generated.frontImage} alt={generated.styleName} className="w-full h-full object-cover" />
                  ) : idx === currentGeneratingStyle ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-teal-100">
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                    </div>
                  ) : idx < currentGeneratingStyle ? (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-500" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <p className="text-xs text-gray-400">✨ This takes about 2-3 minutes for best quality</p>
        </div>
      </div>
    );
  }

  // Reveal Countdown - Big 3, 2, 1
  if (currentView === 'reveal') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${analysisMode === 'bridal' ? 'from-pink-900 to-rose-800' : analysisMode === 'color' ? 'from-amber-900 to-orange-800' : 'from-purple-900 to-teal-900'} flex items-center justify-center`}>
        {/* Explosion particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-white rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>

        <div className="text-center z-10">
          <p className="text-white/80 text-xl mb-4 animate-pulse">Get Ready!</p>
          <div className="relative">
            <span 
              className="text-[200px] font-black text-white drop-shadow-2xl animate-bounce"
              style={{ 
                textShadow: '0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,255,255,0.3)',
                animationDuration: '0.5s'
              }}
            >
              {revealCountdown}
            </span>
          </div>
          <p className="text-white/60 text-lg mt-4">Your new looks are ready!</p>
        </div>
      </div>
    );
  }

  // Results View - Interactive Flip Cards
  const selectedStyleData = selectedStyle !== null ? generatedStyles.find(s => s.styleIndex === selectedStyle.index) : null;
  const ModeIcon = currentModeConfig.icon;
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <button onClick={back} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm">
            <ChevronDown className="w-4 h-4 rotate-90" /> Home
          </button>
          <div className="flex items-center gap-2">
            <ModeIcon className="w-4 h-4" />
            <h1 className={`text-base font-bold bg-gradient-to-r ${currentModeConfig.gradient} bg-clip-text text-transparent`}>
              Your AI Recommendations
            </h1>
          </div>
          <button onClick={retake} className={`text-sm text-${currentModeConfig.color}-600 font-medium`}>Retake</button>
        </div>
      </header>

      {/* Face Analysis Banner */}
      {faceAnalysis && (
        <div className={`bg-gradient-to-r ${currentModeConfig.gradient} text-white px-4 py-3`}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">Face Shape: {faceAnalysis.shape}</span>
            </div>
            {faceAnalysis.stylingGoals && (
              <p className="text-xs text-white/90">{faceAnalysis.stylingGoals}</p>
            )}
          </div>
        </div>
      )}

      {generationError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <p className="text-sm text-red-700 text-center">{generationError}</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-3">
        {/* Instruction */}
        <div className="text-center mb-3">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <RotateCcw className="w-3 h-3" /> Click any card to flip and see back view
          </p>
        </div>

        <div className="flex gap-3">
          {/* LEFT: Your Photo */}
          <div className="w-1/3 flex-shrink-0">
            <div className={`bg-white rounded-xl overflow-hidden shadow border-2 border-${currentModeConfig.color}-500`}>
              <div className="aspect-square relative">
                {capturedPhoto && <img src={capturedPhoto} alt="You" className="w-full h-full object-cover" />}
              </div>
              <div className={`bg-gradient-to-r ${currentModeConfig.gradient} text-white text-center py-1.5`}>
                <p className="text-sm font-bold">Original</p>
              </div>
            </div>
          </div>

          {/* RIGHT: 6 AI Generated - INTERACTIVE FLIP CARDS */}
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-2">
              {generatedStyles.map((style) => {
                const isFlipped = flippedCards.has(style.styleIndex);
                const isHovered = hoveredCard === style.styleIndex;
                const hasFront = style.frontImage;
                const hasBack = style.backImage;
                
                return (
                  <div 
                    key={style.styleIndex}
                    className="perspective-1000"
                    onMouseEnter={() => setHoveredCard(style.styleIndex)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div 
                      className={`relative aspect-square cursor-pointer transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''} ${isHovered && !isFlipped ? 'scale-105 shadow-xl' : 'shadow'}`}
                      onClick={() => hasFront && toggleFlip(style.styleIndex)}
                      style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                      {/* Front Face */}
                      <div 
                        className={`absolute inset-0 bg-white rounded-lg overflow-hidden backface-hidden ${selectedStyle?.index === style.styleIndex ? 'ring-2 ring-teal-500' : ''}`}
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        {hasFront ? (
                          <img src={style.frontImage!} alt={style.styleName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <X className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        
                        {hasFront && (
                          <>
                            <div className={`absolute top-1 left-1 px-1.5 py-0.5 bg-gradient-to-r ${currentModeConfig.gradient} text-white text-[8px] font-bold rounded flex items-center gap-0.5`}>
                              <Wand2 className="w-2.5 h-2.5" /> AI
                            </div>
                            {style.trendSource && (
                              <div className="absolute top-1 right-1 px-1 py-0.5 bg-black/60 text-white text-[8px] font-bold rounded">
                                {style.trendSource.split(' ')[0]}
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-1.5">
                              <p className="text-white text-[10px] font-semibold truncate">{style.styleName}</p>
                              <p className="text-white/70 text-[8px]">Click to see back</p>
                            </div>
                            
                            {/* Hover glow effect */}
                            {isHovered && (
                              <div className={`absolute inset-0 bg-gradient-to-t ${currentModeConfig.gradient} opacity-20 pointer-events-none`} />
                            )}
                          </>
                        )}
                      </div>

                      {/* Back Face */}
                      <div 
                        className="absolute inset-0 bg-white rounded-lg overflow-hidden backface-hidden rotate-y-180"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        {hasBack ? (
                          <img src={style.backImage!} alt={`${style.styleName} back`} className="w-full h-full object-cover" />
                        ) : hasFront ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <p className="text-gray-400 text-xs">Back view</p>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <X className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800 text-white text-[8px] font-bold rounded">
                          BACK VIEW
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-1.5">
                          <p className="text-white text-[10px] font-semibold truncate">{style.styleName}</p>
                          <p className="text-white/70 text-[8px]">Click to flip back</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Info button */}
                    {hasFront && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedStyle({ index: style.styleIndex }); }}
                        className={`mt-1 w-full py-1 bg-gradient-to-r ${currentModeConfig.gradient} text-white text-[10px] font-medium rounded hover:opacity-90`}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Style Details */}
        {selectedStyleData && (
          <div className="mt-3 bg-white rounded-xl shadow border p-3 animate-fadeIn">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedStyleData.styleName}</h3>
                {selectedStyleData.description && (
                  <p className="text-xs text-gray-600">{selectedStyleData.description}</p>
                )}
              </div>
              {selectedStyleData.trendSource && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 rounded">
                  <TrendingUp className="w-3 h-3 text-teal-600" />
                  <span className="text-xs font-bold text-teal-700">{selectedStyleData.trendSource}</span>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {selectedStyleData.geometricReasoning && (
                <div className="bg-purple-50 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900 text-xs">Why This Suits You</h4>
                  </div>
                  <p className="text-xs text-purple-800">{selectedStyleData.geometricReasoning}</p>
                </div>
              )}

              {selectedStyleData.celebrityReference && (
                <div className="bg-teal-50 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <h4 className="font-semibold text-teal-900 text-xs">Celebrity Reference</h4>
                  </div>
                  <p className="text-xs text-teal-800">{selectedStyleData.celebrityReference}</p>
                </div>
              )}
            </div>

            {selectedStyleData.stylistTip && (
              <div className="mt-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Quote className="w-3.5 h-3.5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900 text-xs">
                    💇 Tip from {selectedStyleData.stylistTip.stylist_name}
                  </h4>
                </div>
                <p className="text-xs text-amber-800 italic">&ldquo;{selectedStyleData.stylistTip.tip}&rdquo;</p>
              </div>
            )}

            <button 
              onClick={() => setSelectedStyle(null)}
              className="mt-2 w-full py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* CSS for 3D flip */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
