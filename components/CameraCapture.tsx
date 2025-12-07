"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Smartphone, Image as ImageIcon, Sparkles, ScanFace, Check, AlertCircle, User } from "lucide-react";

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
    mode?: 'hair' | 'color' | 'bridal';
}

interface FaceDetectionState {
    detected: boolean;
    isInOval: boolean;
    message: string;
    confidence: number;
    consecutiveDetections: number;
}

export default function CameraCapture({ onCapture, mode = 'hair' }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [faceState, setFaceState] = useState<FaceDetectionState>({
        detected: false,
        isInOval: false,
        message: 'Position your face in the oval',
        confidence: 0,
        consecutiveDetections: 0
    });
    const [autoCapturing, setAutoCapturing] = useState(false);

    const AUTO_CAPTURE_THRESHOLD = 20; // Increased for stability

    // Simple face detection using skin tone analysis
    const detectFace = useCallback((video: HTMLVideoElement) => {
        const canvas = detectionCanvasRef.current;
        if (!canvas || !video.videoWidth) return null;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        const width = video.videoWidth;
        const height = video.videoHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw mirrored video frame
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // Find skin-tone pixels using YCbCr color space
            const skinPixels: { x: number; y: number }[] = [];
            
            // Sample every 8th pixel for performance
            for (let y = 0; y < height; y += 8) {
                for (let x = 0; x < width; x += 8) {
                    const idx = (y * width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Convert RGB to YCbCr
                    const y_val = 0.299 * r + 0.587 * g + 0.114 * b;
                    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                    
                    // Skin tone detection - broader range for various skin tones
                    if (y_val > 50 && cb > 70 && cb < 140 && cr > 125 && cr < 185) {
                        skinPixels.push({ x, y });
                    }
                }
            }
            
            // Need minimum skin pixels for face detection
            if (skinPixels.length > 50) {
                // Find bounding box of skin pixels
                let minX = width, maxX = 0, minY = height, maxY = 0;
                
                for (const pixel of skinPixels) {
                    minX = Math.min(minX, pixel.x);
                    maxX = Math.max(maxX, pixel.x);
                    minY = Math.min(minY, pixel.y);
                    maxY = Math.max(maxY, pixel.y);
                }
                
                const faceWidth = maxX - minX;
                const faceHeight = maxY - minY;
                const faceCenterX = minX + faceWidth / 2;
                const faceCenterY = minY + faceHeight / 2;
                
                // Oval dimensions (relative to video size)
                const ovalWidth = width * 0.5;
                const ovalHeight = height * 0.7;
                const ovalCenterX = width / 2;
                const ovalCenterY = height / 2;
                
                // Check if face is in oval using ellipse equation
                const dx = (faceCenterX - ovalCenterX) / (ovalWidth / 2);
                const dy = (faceCenterY - ovalCenterY) / (ovalHeight / 2);
                const isInOvalBounds = (dx * dx + dy * dy) <= 1.3;
                
                // Check face size is appropriate - more lenient
                const minFaceWidth = ovalWidth * 0.3;
                const maxFaceWidth = ovalWidth * 1.5;
                const isSizeOk = faceWidth >= minFaceWidth && faceWidth <= maxFaceWidth;
                
                const isInOval = isInOvalBounds && isSizeOk;
                
                // Generate guidance message
                let message = '';
                if (isInOval) {
                    message = 'Perfect! Hold still...';
                } else if (faceCenterX < ovalCenterX - 50) {
                    message = 'Move right →';
                } else if (faceCenterX > ovalCenterX + 50) {
                    message = '← Move left';
                } else if (faceCenterY < ovalCenterY - 50) {
                    message = 'Move down ↓';
                } else if (faceCenterY > ovalCenterY + 50) {
                    message = '↑ Move up';
                } else if (faceWidth < minFaceWidth) {
                    message = 'Move closer';
                } else if (faceWidth > maxFaceWidth) {
                    message = 'Move back';
                } else {
                    message = 'Almost there...';
                }
                
                return {
                    detected: true,
                    isInOval,
                    message,
                    confidence: Math.min(1, skinPixels.length / 150)
                };
            }
            
            return {
                detected: false,
                isInOval: false,
                message: 'Position your face in the oval',
                confidence: 0
            };
            
        } catch {
            return null;
        }
    }, []);

    // Face detection loop
    useEffect(() => {
        if (!isStreaming || countdown !== null || autoCapturing) return;

        const runDetection = () => {
            if (!videoRef.current || !isStreaming) return;
            
            const result = detectFace(videoRef.current);
            
            if (result) {
                setFaceState(prev => {
                    const newConsecutive = result.isInOval 
                        ? prev.consecutiveDetections + 1 
                        : 0;
                    
                    // Trigger auto-capture after consistent detection
                    if (newConsecutive >= AUTO_CAPTURE_THRESHOLD && !autoCapturing) {
                        setAutoCapturing(true);
                        setTimeout(() => capturePhoto(), 300);
                    }
                    
                    return {
                        ...result,
                        consecutiveDetections: newConsecutive
                    };
                });
            }
            
            animationFrameRef.current = requestAnimationFrame(runDetection);
        };
        
        animationFrameRef.current = requestAnimationFrame(runDetection);
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isStreaming, countdown, autoCapturing, detectFace]);

    const startCamera = async () => {
        try {
            // Stop existing stream first
            if (videoRef.current && videoRef.current.srcObject) {
                const existingStream = videoRef.current.srcObject as MediaStream;
                existingStream.getTracks().forEach(track => track.stop());
            }

            // Simple constraints - let browser choose best settings
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsStreaming(true);
                setError(null);
                setAutoCapturing(false);
                setFaceState({
                    detected: false,
                    isInOval: false,
                    message: 'Position your face in the oval',
                    confidence: 0,
                    consecutiveDetections: 0
                });
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setError("Camera access denied. Please allow camera access and try again.");
            setIsStreaming(false);
        }
    };

    useEffect(() => {
        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            const context = canvas.getContext("2d");
            if (context) {
                // Mirror the image
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = canvas.toDataURL("image/jpeg", 0.9);
                
                // Stop camera stream
                if (video.srcObject) {
                    const stream = video.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                }
                
                onCapture(imageData);
            }
        }
    }, [onCapture]);

    const handleManualCapture = useCallback(() => {
        if (!isStreaming) {
            startCamera();
            return;
        }
        // Direct capture without countdown
        capturePhoto();
    }, [isStreaming, capturePhoto]);

    useEffect(() => {
        if (countdown === null) return;

        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }

        if (countdown === 0) {
            capturePhoto();
            setCountdown(null);
        }
    }, [countdown, capturePhoto]);

    const handleDemoImage = () => {
        const demoImage = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop";
        onCapture(demoImage);
    };

    // Calculate progress for auto-capture
    const captureProgress = Math.min(100, (faceState.consecutiveDetections / AUTO_CAPTURE_THRESHOLD) * 100);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
            
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Hidden Canvases */}
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={detectionCanvasRef} className="hidden" />

            {/* Header */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur rounded-full border border-white/10">
                    <ScanFace className="w-5 h-5 text-teal-400" />
                    <span className="text-sm text-white/80">Face Detection</span>
                    {faceState.detected && (
                        <span className={`w-2 h-2 rounded-full ${faceState.isInOval ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                    )}
                </div>
            </div>

            {/* Video Container - Fixed sizing without zoom */}
            <div className="relative z-10 w-full max-w-lg mx-4">
                
                {/* Video Frame */}
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-black border-2 border-white/20">
                    
                    {/* Loading State */}
                    {!isStreaming && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                            <Camera className="w-16 h-16 text-white/30 mb-4" />
                            <p className="text-white/50">Starting Camera...</p>
                            <div className="mt-4 flex gap-1">
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
                            <Smartphone className="w-12 h-12 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
                            <p className="text-white/60 mb-6 text-sm">{error}</p>
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                <button 
                                    onClick={startCamera}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all"
                                >
                                    <RefreshCw className="w-4 h-4 inline mr-2" />
                                    Retry
                                </button>
                                <button 
                                    onClick={handleDemoImage}
                                    className="px-6 py-3 bg-teal-500 hover:bg-teal-400 rounded-xl text-white font-semibold transition-all"
                                >
                                    <Sparkles className="w-4 h-4 inline mr-2" />
                                    Use Demo Image
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Video - NO object-cover to prevent zoom */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full"
                        style={{ 
                            transform: 'scaleX(-1)',
                            objectFit: 'cover'
                        }}
                    />

                    {/* Face Guide Overlay */}
                    {isStreaming && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Dark overlay with oval cutout */}
                            <svg className="absolute inset-0 w-full h-full">
                                <defs>
                                    <mask id="ovalMask">
                                        <rect width="100%" height="100%" fill="white" />
                                        <ellipse cx="50%" cy="50%" rx="25%" ry="35%" fill="black" />
                                    </mask>
                                </defs>
                                <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#ovalMask)" />
                            </svg>

                            {/* Oval Border */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div 
                                    className={`border-4 rounded-[50%] transition-all duration-300 ${
                                        faceState.isInOval 
                                            ? 'border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.5)]' 
                                            : faceState.detected 
                                                ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                                                : 'border-white/50'
                                    }`}
                                    style={{ width: '50%', height: '70%' }}
                                >
                                    {/* Progress ring */}
                                    {faceState.isInOval && (
                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                            <ellipse 
                                                cx="50%" cy="50%" rx="49%" ry="49%"
                                                fill="none"
                                                stroke="rgba(74,222,128,0.5)"
                                                strokeWidth="4"
                                                strokeDasharray={`${captureProgress * 3.14} 314`}
                                            />
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {/* Face placeholder */}
                            {!faceState.detected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <User className="w-24 h-24 text-white/20" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Message */}
                    {isStreaming && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur ${
                                faceState.isInOval 
                                    ? 'bg-green-500/30 text-green-300' 
                                    : faceState.detected 
                                        ? 'bg-yellow-500/30 text-yellow-300'
                                        : 'bg-black/50 text-white/70'
                            }`}>
                                {faceState.isInOval ? <Check className="w-4 h-4" /> : 
                                 faceState.detected ? <AlertCircle className="w-4 h-4" /> : 
                                 <ScanFace className="w-4 h-4" />}
                                <span className="text-sm font-medium">{faceState.message}</span>
                            </div>
                        </div>
                    )}

                    {/* Countdown */}
                    {countdown !== null && countdown > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
                            <span className="text-8xl font-bold text-white">{countdown}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* BIG CAPTURE BUTTON - Always visible */}
            <div className="relative z-20 mt-8 flex items-center justify-center gap-4">
                
                {/* Demo Button */}
                <button
                    onClick={handleDemoImage}
                    className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/20 transition-all"
                >
                    <ImageIcon className="w-5 h-5" />
                    <span>Demo</span>
                </button>

                {/* MAIN CAPTURE BUTTON */}
                {isStreaming && (
                    <button
                        onClick={handleManualCapture}
                        disabled={autoCapturing}
                        className="relative group"
                    >
                        {/* Glow */}
                        <div className={`absolute inset-0 rounded-full blur-lg opacity-60 ${
                            faceState.isInOval ? 'bg-green-400' : 'bg-teal-400'
                        }`}></div>
                        
                        {/* Button */}
                        <div className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-gradient-to-br from-teal-400 to-purple-500 hover:from-teal-300 hover:to-purple-400 active:scale-95 transition-all">
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                                <Camera className="w-7 h-7 text-slate-800" />
                            </div>
                        </div>
                    </button>
                )}

                {/* Reset Button */}
                {isStreaming && (
                    <button
                        onClick={startCamera}
                        className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/20 transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                        <span>Reset</span>
                    </button>
                )}
            </div>

            {/* Instructions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
                <p className="text-white/50 text-sm max-w-sm">
                    {faceState.isInOval 
                        ? 'Hold still - auto capturing...' 
                        : 'Position face in oval or tap button to capture'}
                </p>
            </div>
        </div>
    );
}
