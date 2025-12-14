'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, RefreshCw, ChevronDown, X, Loader2, LayoutGrid, Scissors, Clock, Star, Wand2, User, TrendingUp, Quote } from 'lucide-react';

interface StylistTip {
  stylist_name: string;
  tip: string;
}

interface GeneratedStyle {
  styleIndex: number;
  styleName: string;
  image: string | null;
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

export default function StyleVision() {
  const [currentView, setCurrentView] = useState<'landing' | 'camera' | 'generating' | 'results'>('landing');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<SelectedStyle | null>(null);
  
  // AI Generation states
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingStyle, setCurrentGeneratingStyle] = useState(0);
  const [generatedStyles, setGeneratedStyles] = useState<GeneratedStyle[]>([]);
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);

  // Generate AI hairstyles - called automatically after photo capture
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
        setGenerationProgress(Math.round((i / 6) * 100));
        
        try {
          const response = await fetch('/api/generate-hairstyle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userPhoto: photo,
              styleIndex: i
            })
          });
          
          const data = await response.json();
          
          // Save face analysis from first successful response
          if (i === 0 && data.faceAnalysis) {
            setFaceAnalysis(data.faceAnalysis);
          }
          
          if (data.success && data.results && data.results[0]) {
            const result = data.results[0];
            results.push({
              styleIndex: result.styleIndex,
              styleName: result.styleName || `Style ${i + 1}`,
              image: result.image,
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
              image: null, 
              error: data.error || 'Failed to generate' 
            });
          }
        } catch (err) {
          results.push({ 
            styleIndex: i, 
            styleName: `Style ${i + 1}`,
            image: null, 
            error: 'Network error' 
          });
        }
        
        setGeneratedStyles([...results]);
      }
      
      setGenerationProgress(100);
      
      const successCount = results.filter(r => r.image).length;
      if (successCount === 0) {
        setGenerationError('Could not generate hairstyles. Please try again with a clearer photo.');
      }
      
      setCurrentView('results');
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationError('Generation failed. Please try again.');
      setCurrentView('results');
    }
  }, []);

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

  const startCamera = () => {
    setCurrentView('camera');
    setCapturedPhoto(null);
    setSelectedStyle(null);
    setGeneratedStyles([]);
    setFaceAnalysis(null);
    setGenerationError(null);
  };

  const back = () => {
    stopCamera();
    setCurrentView('landing');
    setCapturedPhoto(null);
    setSelectedStyle(null);
    setGeneratedStyles([]);
    setFaceAnalysis(null);
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
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-teal-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">StyleVision AI</h1>
            </div>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full mb-4">
            <Wand2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700">AI-Powered Face Analysis</span>
          </div>
          
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Discover Your Perfect Hairstyle
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            AI analyzes your face shape and recommends hairstyles from global fashion trends with tips from world-famous stylists
          </p>

          <button onClick={startCamera} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2 justify-center mx-auto">
            <Camera className="w-5 h-5" /> Analyze My Face
          </button>

          <div className="grid grid-cols-3 gap-4 mt-12 max-w-lg mx-auto">
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Take Photo</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <Wand2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="text-sm font-medium">AI Analyzes Face</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <LayoutGrid className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Get Recommendations</p>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-white/70 rounded-xl max-w-md mx-auto">
            <p className="text-xs text-gray-500">
              Featuring tips from <strong>Javed Habib</strong>, <strong>Aalim Hakim</strong>, <strong>Vidal Sassoon</strong>, <strong>Oribe</strong> and more legendary stylists
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Camera View
  if (currentView === 'camera') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <header className="bg-black/50 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={back} className="flex items-center gap-1 text-white/80 hover:text-white">
              <ChevronDown className="w-5 h-5 rotate-90" /> Back
            </button>
            <h1 className="text-white font-semibold">Take Your Photo</h1>
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
                          <span className="text-7xl font-bold text-white">{countdown}</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <Camera className="w-14 h-14 text-gray-500 mb-3" />
                  <button onClick={() => setIsCameraActive(true)} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full font-medium text-sm">
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
                <button onClick={capturePhoto} className="flex-[2] py-2.5 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
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

  // Generating View
  if (currentView === 'generating') {
    const currentStyle = generatedStyles[currentGeneratingStyle];
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
          <div className="relative w-24 h-24 mx-auto mb-6">
            {capturedPhoto && (
              <img src={capturedPhoto} alt="Your photo" className="w-full h-full rounded-full object-cover border-4 border-purple-500" />
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-purple-600 to-teal-500 rounded-full flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white animate-pulse" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">AI Analyzing Your Face</h3>
          <p className="text-gray-600 mb-4">
            {currentStyle?.styleName 
              ? `Generating: ${currentStyle.styleName}` 
              : 'Finding perfect hairstyles for your face shape...'}
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-600 to-teal-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500 mb-6">{generatedStyles.length} of 6 complete</p>
          
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const generated = generatedStyles.find(g => g.styleIndex === idx);
              return (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {generated?.image ? (
                    <img src={generated.image} alt={generated.styleName} className="w-full h-full object-cover" />
                  ) : idx === currentGeneratingStyle ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
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
          
          <p className="text-xs text-gray-400 mt-4">This takes about 1-2 minutes</p>
        </div>
      </div>
    );
  }

  // Results View - Using AI-generated data
  const selectedStyleData = selectedStyle !== null ? generatedStyles.find(s => s.styleIndex === selectedStyle.index) : null;
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <button onClick={back} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm">
            <ChevronDown className="w-4 h-4 rotate-90" /> Home
          </button>
          <h1 className="text-base font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Your AI Recommendations
          </h1>
          <button onClick={retake} className="text-sm text-purple-600 font-medium">Retake</button>
        </div>
      </header>

      {/* Face Analysis Banner */}
      {faceAnalysis && (
        <div className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-4 py-3">
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

      {/* Error Banner */}
      {generationError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <p className="text-sm text-red-700 text-center">{generationError}</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-3">
        {/* Side by Side: Your Photo LEFT | 6 Styles RIGHT */}
        <div className="flex gap-3">
          {/* LEFT: Your Photo */}
          <div className="w-1/3 flex-shrink-0">
            <div className="bg-white rounded-xl overflow-hidden shadow border-2 border-purple-500">
              <div className="aspect-square relative">
                {capturedPhoto && <img src={capturedPhoto} alt="You" className="w-full h-full object-cover" />}
              </div>
              <div className="bg-purple-600 text-white text-center py-1.5">
                <p className="text-sm font-bold">Original</p>
              </div>
            </div>
          </div>

          {/* RIGHT: 6 AI Generated Hairstyles */}
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-2">
              {generatedStyles.map((style) => {
                const hasImage = style.image;
                
                return (
                  <div 
                    key={style.styleIndex}
                    className={`bg-white rounded-lg overflow-hidden shadow cursor-pointer transition-all hover:shadow-md ${selectedStyle?.index === style.styleIndex ? 'ring-2 ring-teal-500' : ''} ${!hasImage ? 'opacity-60' : ''}`}
                    onClick={() => hasImage && setSelectedStyle({ index: style.styleIndex })}
                  >
                    <div className="aspect-square relative">
                      {hasImage ? (
                        <img 
                          src={style.image!} 
                          alt={style.styleName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <X className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      {/* AI badge */}
                      {hasImage && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-600 text-white text-[8px] font-bold rounded flex items-center gap-0.5">
                          <Wand2 className="w-2.5 h-2.5" /> AI
                        </div>
                      )}

                      {/* Trend source badge */}
                      {style.trendSource && (
                        <div className="absolute top-1 right-1 px-1 py-0.5 bg-teal-500 text-white text-[8px] font-bold rounded">
                          {style.trendSource.split(' ')[0]}
                        </div>
                      )}

                      {/* Name - AI Generated */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-1.5">
                        <p className="text-white text-[10px] font-semibold truncate">{style.styleName}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Style Details - AI Generated */}
        {selectedStyleData && (
          <div className="mt-3 bg-white rounded-xl shadow border p-3">
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
              {/* Why It Works - AI Reasoning */}
              {selectedStyleData.geometricReasoning && (
                <div className="bg-purple-50 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900 text-xs">Why This Suits You</h4>
                  </div>
                  <p className="text-xs text-purple-800">{selectedStyleData.geometricReasoning}</p>
                </div>
              )}

              {/* Celebrity Reference */}
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

            {/* Stylist Tip */}
            {selectedStyleData.stylistTip && (
              <div className="mt-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Quote className="w-3.5 h-3.5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900 text-xs">
                    Tip from {selectedStyleData.stylistTip.stylist_name}
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

        {!selectedStyle && generatedStyles.some(g => g.image) && (
          <p className="text-center text-gray-500 text-xs mt-3">
            Tap any hairstyle to see AI analysis and stylist tips
          </p>
        )}
      </div>
    </div>
  );
}
