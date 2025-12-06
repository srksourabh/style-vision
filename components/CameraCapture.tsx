"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, CheckCircle, AlertCircle, Upload, Image as ImageIcon } from "lucide-react";

interface CameraCaptureProps {
    onCapture: (imageData: string) => void;
    onClose?: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize Camera
    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Unable to access camera. Please allow permissions or use Demo Mode.");
        }
    }, []);

    // Shutdown Camera
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    // Capture Logic
    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Draw image (mirrored)
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = canvas.toDataURL("image/png");
                setImage(imageData);
                stopCamera();
            }
        }
    }, [stopCamera]);

    // Countdown Logic
    const initiateCapture = () => {
        setCountdown(3);
        let count = 3;
        const interval = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
            } else {
                clearInterval(interval);
                setCountdown(null);
                handleCapture();
            }
        }, 1000);
    };

    const handleRetake = () => {
        setImage(null);
        startCamera();
    };

    const handleConfirm = () => {
        if (image) {
            onCapture(image);
        }
    };

    // Demo / Upload Logic for environments without webcam
    const handleDemoImage = () => {
        // A placeholder portrait for testing
        const demoImage = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop";

        // Convert URL to base64 (simulated here by just passing the URL since our logic handles strings)
        // Note: In a real app we might want to fetch and convert to base64 to avoid CORS issues on canvas, 
        // but for the analysis engine which just takes a string, this is fine.
        setImage(demoImage);
        stopCamera();
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90 text-white overflow-hidden">

            {/* Hidden Canvas for Processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Feed / Captured Image */}
            <div className="relative w-full h-full max-w-4xl max-h-[80vh] aspect-[3/4] md:aspect-video rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gray-900">

                {error ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-6">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                        <div className="text-center space-y-2">
                            <p className="text-xl text-red-200">{error}</p>
                            <p className="text-gray-400">No camera? No problem.</p>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={startCamera}
                                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl transition"
                            >
                                Retry Camera
                            </button>
                            <button
                                onClick={handleDemoImage}
                                className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span>Use Demo Model</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {image ? (
                            // Captured Image Preview
                            <img
                                src={image}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            // Live Video Feed
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        )}

                        {/* Face Oval Guide (Only active when not captured) */}
                        {!image && !error && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[280px] h-[380px] border-2 border-dashed border-white/50 rounded-[50%] opacity-70 shadow-[0_0_100px_rgba(0,0,0,0.5)_inset]"></div>
                                <div className="absolute top-10 text-white/70 text-lg font-medium tracking-widest uppercase bg-black/40 px-4 py-1 rounded-full backdrop-blur-md">
                                    Align Face Here
                                </div>
                            </div>
                        )}

                        {/* Countdown Overlay */}
                        {countdown !== null && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                                <span className="text-9xl font-bold text-white animate-bounce">
                                    {countdown}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center space-x-8 z-30 px-6">

                {!image && !error && (
                    <div className="flex items-center space-x-8">
                        {/* Demo Button (Hidden but accessible for logic testing) */}
                        <button
                            onClick={handleDemoImage}
                            className="absolute left-8 bottom-0 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                            title="Use Demo Image"
                        >
                            <ImageIcon className="w-6 h-6" />
                        </button>

                        {/* Capture Button */}
                        <button
                            onClick={initiateCapture}
                            disabled={!!countdown}
                            className={`
                    group relative flex items-center justify-center w-24 h-24 rounded-full 
                    bg-white/10 border-4 border-white backdrop-blur-sm
                    transition-all duration-300
                    ${countdown ? 'opacity-50 cursor-not-allowed scale-90' : 'hover:scale-110 active:scale-95 hover:bg-white/20'}
                    `}
                            aria-label="Capture Photo"
                        >
                            <div className="w-16 h-16 bg-red-500 rounded-full group-hover:bg-red-400 transition-colors shadow-lg"></div>
                            <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                )}

                {image && (
                    // Post-Capture Actions
                    <div className="flex items-center space-x-6 w-full max-w-lg">
                        {/* Retake */}
                        <button
                            onClick={handleRetake}
                            className="flex-1 flex items-center justify-center space-x-3 h-[70px] bg-gray-700/80 hover:bg-gray-600 border border-white/10 rounded-2xl backdrop-blur-md transition-all active:scale-95"
                        >
                            <RefreshCw className="w-6 h-6 text-gray-300" />
                            <span className="text-lg font-semibold text-white">Retake</span>
                        </button>

                        {/* Confirm / Analyze */}
                        <button
                            onClick={handleConfirm}
                            className="flex-1 flex items-center justify-center space-x-3 h-[70px] bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 shadow-xl rounded-2xl transition-all hover:scale-105 active:scale-95"
                        >
                            <CheckCircle className="w-6 h-6 text-white" />
                            <span className="text-lg font-bold text-white">Analyze</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
