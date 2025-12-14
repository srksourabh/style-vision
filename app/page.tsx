'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Sparkles, RefreshCw, ChevronDown, X, Loader2, LayoutGrid, Scissors, Clock, Star, Wand2 } from 'lucide-react';

// Hairstyle data
const HAIRSTYLES = [
  {
    name: "Classic Side Part",
    description: "Timeless and professional look with hair parted to one side",
    matchScore: 92,
    instructions: "Ask your barber for a #2 guard on sides, 3-4 inches on top. Part on your natural side. Use pomade for hold.",
    maintenance: "Low",
    bestFor: "Professional settings, interviews, formal events"
  },
  {
    name: "Textured Crop",
    description: "Modern and trendy with natural texture on top",
    matchScore: 88,
    instructions: "Short fade on sides (#1-2), 2-3 inches on top with texturizing. Point cut the top for movement.",
    maintenance: "Low",
    bestFor: "Casual style, easy daily maintenance"
  },
  {
    name: "Slicked Back",
    description: "Polished and sophisticated with hair combed backward",
    matchScore: 85,
    instructions: "Keep 4-5 inches on top, taper sides. Apply strong-hold pomade on damp hair, comb straight back.",
    maintenance: "Medium",
    bestFor: "Business meetings, elegant events, date nights"
  },
  {
    name: "Undercut",
    description: "Bold contrast with buzzed sides and longer top",
    matchScore: 82,
    instructions: "Buzz sides with #0-1 guard, disconnect from top. Keep 4-6 inches on top for styling options.",
    maintenance: "Medium-High",
    bestFor: "Modern style, creative fields, making a statement"
  },
  {
    name: "Crew Cut",
    description: "Clean and classic military-inspired short cut",
    matchScore: 90,
    instructions: "#1-2 on sides fading up, 1-2 inches on top. Blend well at the temples. Minimal product needed.",
    maintenance: "Very Low",
    bestFor: "Active lifestyle, minimal styling time, hot weather"
  },
  {
    name: "Spiky Textured",
    description: "Edgy and youthful with upward spiky texture",
    matchScore: 78,
    instructions: "Fade sides (#2), 2-3 inches on top. Use matte clay or wax, work through dry hair pointing upward.",
    maintenance: "Medium",
    bestFor: "Casual outings, younger look, creative expression"
  }
];

interface SelectedStyle {
  index: number;
}

interface GeneratedImage {
  styleIndex: number;
  image: string | null;
  error: string | null;
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
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);

  // Generate AI hairstyles - called automatically after photo capture
  const generateHairstyles = useCallback(async (photo: string) => {
    setCurrentView('generating');
    setGenerationProgress(0);
    setGeneratedImages([]);
    setGenerationError(null);
    
    try {
      const results: GeneratedImage[] = [];
      
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
          
          if (data.success && data.results && data.results[0]) {
            results.push(data.results[0]);
          } else {
            results.push({ styleIndex: i, image: null, error: data.error || 'Failed to generate' });
          }
        } catch (err) {
          results.push({ styleIndex: i, image: null, error: 'Network error' });
        }
        
        setGeneratedImages([...results]);
      }
      
      setGenerationProgress(100);
      
      // Check if we have at least one successful generation
      const successCount = results.filter(r => r.image).length;
      if (successCount === 0) {
        setGenerationError('Could not generate hairstyles. Please check your API key and try again.');
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
    
    // Automatically start AI generation
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
    setGeneratedImages([]);
    setGenerationError(null);
  };

  const back = () => {
    stopCamera();
    setCurrentView('landing');
    setCapturedPhoto(null);
    setSelectedStyle(null);
    setGeneratedImages([]);
  };

  const retake = () => {
    setCapturedPhoto(null);
    setCountdown(null);
    setSelectedStyle(null);
    setCurrentView('camera');
    setIsCameraActive(true);
    setIsCameraReady(false);
    setGeneratedImages([]);
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
            <span className="text-xs font-semibold text-purple-700">AI Virtual Try-On</span>
          </div>
          
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            See Yourself With New Hairstyles
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Take a photo and AI will show you exactly how you would look with 6 different hairstyles
          </p>

          <button onClick={startCamera} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2 justify-center mx-auto">
            <Camera className="w-5 h-5" /> Try Now - It&apos;s Free
          </button>

          <div className="grid grid-cols-3 gap-4 mt-12 max-w-lg mx-auto">
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Take Photo</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <Wand2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
              <p className="text-sm font-medium">AI Generates</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <LayoutGrid className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">See 6 Styles</p>
            </div>
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

  // Generating View - Full screen loading
  if (currentView === 'generating') {
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
          
          <h3 className="text-xl font-bold mb-2">Creating Your Looks</h3>
          <p className="text-gray-600 mb-4">
            AI is generating <strong>{HAIRSTYLES[currentGeneratingStyle]?.name || 'hairstyle'}</strong>...
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-600 to-teal-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500 mb-6">{generatedImages.length} of 6 complete</p>
          
          {/* Preview of generated images */}
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const generated = generatedImages.find(g => g.styleIndex === idx);
              return (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {generated?.image ? (
                    <img src={generated.image} alt={`Style ${idx + 1}`} className="w-full h-full object-cover" />
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

  // Results View
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <button onClick={back} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm">
            <ChevronDown className="w-4 h-4 rotate-90" /> Home
          </button>
          <h1 className="text-base font-bold bg-gradient-to-r from-purple-600 to-teal-500 bg-clip-text text-transparent">
            Your New Looks
          </h1>
          <button onClick={retake} className="text-sm text-purple-600 font-medium">Retake</button>
        </div>
      </header>

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
              {HAIRSTYLES.map((style, idx) => {
                const generated = generatedImages.find(g => g.styleIndex === idx);
                const hasImage = generated?.image;
                
                return (
                  <div 
                    key={idx}
                    className={`bg-white rounded-lg overflow-hidden shadow cursor-pointer transition-all hover:shadow-md ${selectedStyle?.index === idx ? 'ring-2 ring-teal-500' : ''} ${!hasImage ? 'opacity-60' : ''}`}
                    onClick={() => hasImage && setSelectedStyle({ index: idx })}
                  >
                    <div className="aspect-square relative">
                      {hasImage ? (
                        <img 
                          src={generated.image!} 
                          alt={style.name} 
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

                      {/* Match score */}
                      <div className="absolute top-1 right-1 px-1 py-0.5 bg-teal-500 text-white text-[9px] font-bold rounded">
                        {style.matchScore}%
                      </div>

                      {/* Name */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-1 px-1.5">
                        <p className="text-white text-[10px] font-semibold truncate">{style.name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Style Details */}
        {selectedStyle !== null && (
          <div className="mt-3 bg-white rounded-xl shadow border p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">{HAIRSTYLES[selectedStyle.index].name}</h3>
                <p className="text-xs text-gray-600">{HAIRSTYLES[selectedStyle.index].description}</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 rounded">
                <Star className="w-3 h-3 text-teal-600" />
                <span className="text-xs font-bold text-teal-700">{HAIRSTYLES[selectedStyle.index].matchScore}%</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Scissors className="w-3.5 h-3.5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900 text-xs">Barber Instructions</h4>
                </div>
                <p className="text-xs text-purple-800">{HAIRSTYLES[selectedStyle.index].instructions}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs"><strong>Maintenance:</strong> {HAIRSTYLES[selectedStyle.index].maintenance}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Star className="w-3.5 h-3.5 text-gray-500 mt-0.5" />
                  <span className="text-xs"><strong>Best For:</strong> {HAIRSTYLES[selectedStyle.index].bestFor}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedStyle(null)}
              className="mt-2 w-full py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}

        {!selectedStyle && generatedImages.some(g => g.image) && (
          <p className="text-center text-gray-500 text-xs mt-3">
            Tap any hairstyle to see barber instructions
          </p>
        )}
      </div>
    </div>
  );
}
