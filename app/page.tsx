'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, Palette, Heart, RefreshCw, ChevronDown, X, Loader2, Grid3X3 } from 'lucide-react';

// Hairstyle names from our API
const HAIRSTYLE_NAMES = [
  "Classic Side Part",
  "Textured Crop", 
  "Slicked Back",
  "Undercut with Volume",
  "Crew Cut",
  "Spiky Textured"
];

interface GeneratedStyle {
  name: string;
  image: string | null;
  loading: boolean;
  error: string | null;
}

export default function StyleVision() {
  const [currentView, setCurrentView] = useState<'landing' | 'camera'>('landing');
  const [analysisMode, setAnalysisMode] = useState<'hair' | 'color' | 'bridal' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStyles, setGeneratedStyles] = useState<GeneratedStyle[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);

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
    setCapturedPhoto(c.toDataURL('image/jpeg', 0.9));
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

  // Generate all hairstyles
  const generateHairstyles = async () => {
    if (!capturedPhoto) return;
    
    setIsGenerating(true);
    
    // Initialize all styles as loading
    const initialStyles: GeneratedStyle[] = HAIRSTYLE_NAMES.map(name => ({
      name,
      image: null,
      loading: true,
      error: null
    }));
    setGeneratedStyles(initialStyles);

    // Generate each hairstyle
    for (let i = 0; i < HAIRSTYLE_NAMES.length; i++) {
      try {
        const response = await fetch('/api/hairstyle-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPhoto: capturedPhoto,
            hairstyleIndex: i
          }),
        });

        const result = await response.json();

        setGeneratedStyles(prev => prev.map((style, idx) => 
          idx === i ? {
            ...style,
            loading: false,
            image: result.success ? result.image : null,
            error: result.success ? null : (result.error || 'Generation failed')
          } : style
        ));

      } catch (err) {
        setGeneratedStyles(prev => prev.map((style, idx) => 
          idx === i ? {
            ...style,
            loading: false,
            error: 'Failed to generate'
          } : style
        ));
      }
    }

    setIsGenerating(false);
  };

  const start = (mode: 'hair' | 'color' | 'bridal') => {
    setAnalysisMode(mode);
    setCurrentView('camera');
    setCapturedPhoto(null);
    setGeneratedStyles([]);
  };

  const back = () => {
    stopCamera();
    setCurrentView('landing');
    setAnalysisMode(null);
    setCapturedPhoto(null);
    setGeneratedStyles([]);
  };

  const retake = () => {
    setCapturedPhoto(null);
    setGeneratedStyles([]);
    setCountdown(null);
    setIsCameraActive(true);
    setIsCameraReady(false);
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Landing Page
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
            <Grid3X3 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">AI Virtual Hairstyle Try-On</span>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            See Yourself With Different Hairstyles
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Take a photo and AI will show YOU with 6 different hairstyles - just like a virtual barber shop!
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button onClick={() => start('hair')} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" /> Try Hairstyles
            </button>
            <button onClick={() => start('color')} className="px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
              <Palette className="w-5 h-5" /> Try Hair Colors
            </button>
            <button onClick={() => start('bridal')} className="px-8 py-4 bg-gradient-to-r from-purple-600 via-teal-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2">
              <Heart className="w-5 h-5" /> Bridal Studio
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 bg-purple-50 rounded-xl">
              <Camera className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">1. Take Photo</h3>
              <p className="text-gray-600">Snap a selfie with our smart camera</p>
            </div>
            <div className="p-6 bg-teal-50 rounded-xl">
              <Sparkles className="w-12 h-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">2. AI Generates</h3>
              <p className="text-gray-600">See YOUR face with 6 different hairstyles</p>
            </div>
            <div className="p-6 bg-purple-50 rounded-xl">
              <Grid3X3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">3. Compare & Choose</h3>
              <p className="text-gray-600">Pick your favorite and show your barber!</p>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-8 mt-20">
          <p className="text-center text-gray-400">© 2025 StyleVision AI - Virtual Hairstyle Try-On</p>
        </footer>
      </div>
    );
  }

  // Camera & Results View
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={back} className="flex items-center gap-2 text-gray-700">
            <ChevronDown className="w-5 h-5 rotate-90" /> Back
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Virtual Hairstyle Try-On
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Camera Section */}
        {!capturedPhoto && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border-2 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Position Your Face</h3>
                {isCameraReady && (
                  <button onClick={() => { setFacingMode(f => f === 'user' ? 'environment' : 'user'); setIsCameraReady(false); }} className="p-2 bg-gray-100 rounded-full">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-xl overflow-hidden">
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
                          <ellipse cx="50%" cy="40%" rx="30%" ry="25%" fill="none" stroke={faceDetected ? '#14b8a6' : '#a855f7'} strokeWidth="3" strokeDasharray="10,5" />
                        </svg>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full">
                          <p className="text-white text-sm font-semibold">{faceDetected ? '✓ Face Detected' : 'Position face in oval'}</p>
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
            </div>
          </div>
        )}

        {/* Results Section */}
        {capturedPhoto && (
          <div>
            {/* Action Buttons */}
            {generatedStyles.length === 0 && (
              <div className="max-w-lg mx-auto mb-8">
                <div className="bg-white rounded-2xl border-2 p-6">
                  <h3 className="font-bold text-lg mb-4">Your Photo</h3>
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-6">
                    <img src={capturedPhoto} alt="You" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={retake} className="flex-1 py-3 bg-gray-100 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5" /> Retake
                    </button>
                    <button onClick={generateHairstyles} disabled={isGenerating} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                      <Grid3X3 className="w-5 h-5" /> Generate Hairstyles
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Hairstyles Grid */}
            {generatedStyles.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Your Hairstyle Options</h2>
                  <button onClick={retake} className="px-4 py-2 bg-gray-100 rounded-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> New Photo
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Original Photo */}
                  <div className="bg-white rounded-xl overflow-hidden border-2 border-purple-500">
                    <div className="aspect-[3/4] relative">
                      <img src={capturedPhoto} alt="Original" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-purple-600 text-white text-center py-2 font-semibold">
                        Original
                      </div>
                    </div>
                  </div>

                  {/* Generated Styles */}
                  {generatedStyles.map((style, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white rounded-xl overflow-hidden border-2 border-gray-200 hover:border-teal-400 transition-all cursor-pointer"
                      onClick={() => style.image && setSelectedImage(style.image)}
                    >
                      <div className="aspect-[3/4] relative">
                        {style.loading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-2" />
                            <p className="text-sm text-gray-500">Generating...</p>
                          </div>
                        ) : style.image ? (
                          <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-4">
                            <p className="text-sm text-red-500 text-center">{style.error || 'Failed'}</p>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-center py-2 px-2">
                          <p className="font-semibold text-sm">{style.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {isGenerating && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-xl text-center">
                    <p className="text-purple-700 font-semibold">Generating hairstyles... This may take a minute.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-size Image Viewer */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={selectedImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
