'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Sparkles, Loader2, ChevronDown, ChevronUp, Star, Clock, Scissors, Palette, Zap, Shield, Video, SwitchCamera, X, ArrowRight, Brain, Wand2 } from 'lucide-react';
import { analyzeWithGemini, analyzeColorWithGemini, AnalysisResult, ColorAnalysisResult } from '@/utils/geminiService';
import Image from 'next/image';

type AnalysisMode = 'hairstyle' | 'color';
type CaptureMode = 'upload' | 'camera';

export default function Home() {
  const [image, setImage] = useState&lt;string | null&gt;(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState&lt;AnalysisResult | null&gt;(null);
  const [colorResult, setColorResult] = useState&lt;ColorAnalysisResult | null&gt;(null);
  const [activeMode, setActiveMode] = useState&lt;AnalysisMode&gt;('hairstyle');
  const [expandedCard, setExpandedCard] = useState&lt;number | null&gt;(null);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [showApp, setShowApp] = useState(false);
  
  const [captureMode, setCaptureMode] = useState&lt;CaptureMode&gt;('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState&lt;string | null&gt;(null);
  const [facingMode, setFacingMode] = useState&lt;'user' | 'environment'&gt;('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  const fileInputRef = useRef&lt;HTMLInputElement&gt;(null);
  const videoRef = useRef&lt;HTMLVideoElement&gt;(null);
  const streamRef = useRef&lt;MediaStream | null&gt;(null);
  const canvasRef = useRef&lt;HTMLCanvasElement&gt;(null);

  useEffect(() =&gt; {
    const checkCameras = async () =&gt; {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device =&gt; device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length &gt; 1);
      } catch (err) {
        console.log('Could not enumerate devices:', err);
      }
    };
    checkCameras();
  }, []);

  useEffect(() =&gt; {
    return () =&gt; { stopCamera(); };
  }, []);

  const startCamera = async () =&gt; {
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
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera. Please try again.');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () =&gt; {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track =&gt; track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setIsCameraActive(false);
  };

  const switchCamera = async () =&gt; {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() =&gt; { startCamera(); }, 100);
    }
  };

  const capturePhoto = () =&gt; {
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

  const handleImageUpload = useCallback((e: React.ChangeEvent&lt;HTMLInputElement&gt;) =&gt; {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size &gt; 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () =&gt; {
        setImage(reader.result as string);
        setAnalysisResult(null);
        setColorResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () =&gt; {
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

  const resetAnalysis = () =&gt; {
    setImage(null);
    setAnalysisResult(null);
    setColorResult(null);
    setError(null);
    setExpandedCard(null);
    stopCamera();
  };

  const getScoreColor = (score: number) =&gt; {
    if (score &gt;= 0.9) return 'text-teal-400 bg-teal-500/20 border-teal-500/30';
    if (score &gt;= 0.8) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (score &gt;= 0.7) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
  };

  const getMaintenanceColor = (level: string) =&gt; {
    switch (level) {
      case 'Low': return 'text-teal-400 bg-teal-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'High': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  // Landing Page
  if (!showApp) {
    return (
      &lt;main className="min-h-screen relative overflow-hidden"&gt;
        {/* Animated Background Orbs */}
        &lt;div className="orb orb-purple w-[600px] h-[600px] -top-48 -left-48" /&gt;
        &lt;div className="orb orb-teal w-[500px] h-[500px] top-1/2 -right-48" style={{ animationDelay: '-5s' }} /&gt;
        &lt;div className="orb orb-purple w-[400px] h-[400px] -bottom-32 left-1/3" style={{ animationDelay: '-10s' }} /&gt;
        
        {/* Content */}
        &lt;div className="relative z-10"&gt;
          {/* Hero Section */}
          &lt;div className="max-w-7xl mx-auto px-4 pt-12 pb-20"&gt;
            {/* Navigation */}
            &lt;nav className="flex items-center justify-between mb-16"&gt;
              &lt;div className="flex items-center gap-3"&gt;
                &lt;div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center"&gt;
                  &lt;Sparkles className="w-6 h-6 text-white" /&gt;
                &lt;/div&gt;
                &lt;span className="text-xl font-bold gradient-text"&gt;StyleVision&lt;/span&gt;
              &lt;/div&gt;
              &lt;button
                onClick={() =&gt; setShowApp(true)}
                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-purple-500/50 transition-all"
              &gt;
                Launch App
              &lt;/button&gt;
            &lt;/nav&gt;

            {/* Hero Content */}
            &lt;div className="text-center max-w-5xl mx-auto"&gt;
              {/* Logo */}
              &lt;div className="mb-8 flex justify-center"&gt;
                &lt;div className="relative"&gt;
                  &lt;div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/20 flex items-center justify-center glow-mixed overflow-hidden"&gt;
                    {/* Logo Image - Replace src with your actual logo */}
                    &lt;Image 
                      src="/logo.png" 
                      alt="StyleVision AI Logo"
                      width={240}
                      height={240}
                      className="w-full h-full object-contain p-4"
                      priority
                      onError={(e) =&gt; {
                        // Fallback if logo doesn't exist
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    /&gt;
                    {/* Fallback Icon */}
                    &lt;div className="hidden flex-col items-center gap-2"&gt;
                      &lt;Brain className="w-20 h-20 text-purple-400" /&gt;
                      &lt;Scissors className="w-12 h-12 text-teal-400" /&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;
                  &lt;div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center animate-pulse-glow"&gt;
                    &lt;Wand2 className="w-8 h-8 text-white" /&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              {/* Title */}
              &lt;h1 className="text-5xl md:text-7xl font-bold mb-6"&gt;
                &lt;span className="gradient-text"&gt;StyleVision&lt;/span&gt;
                &lt;span className="text-white"&gt; AI&lt;/span&gt;
              &lt;/h1&gt;
              
              &lt;p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"&gt;
                Discover your perfect hairstyle with &lt;span className="text-purple-400"&gt;AI-powered&lt;/span&gt; face analysis.
                Get personalized recommendations in &lt;span className="text-teal-400"&gt;seconds&lt;/span&gt;.
              &lt;/p&gt;

              {/* CTA Buttons */}
              &lt;div className="flex flex-col sm:flex-row gap-4 justify-center mb-20"&gt;
                &lt;button
                  onClick={() =&gt; setShowApp(true)}
                  className="group px-10 py-5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xl font-semibold rounded-2xl shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                &gt;
                  &lt;Camera className="w-6 h-6" /&gt;
                  Get Started Free
                  &lt;ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /&gt;
                &lt;/button&gt;
                &lt;button className="px-10 py-5 border-2 border-slate-700 text-slate-300 text-xl font-semibold rounded-2xl hover:border-teal-500/50 hover:text-teal-400 transition-all duration-300 flex items-center justify-center gap-3"&gt;
                  &lt;Video className="w-6 h-6" /&gt;
                  Watch Demo
                &lt;/button&gt;
              &lt;/div&gt;

              {/* Trust Badges */}
              &lt;div className="flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm"&gt;
                &lt;div className="flex items-center gap-2"&gt;
                  &lt;Shield className="w-5 h-5 text-teal-500" /&gt;
                  &lt;span&gt;Photos Never Stored&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex items-center gap-2"&gt;
                  &lt;Zap className="w-5 h-5 text-purple-500" /&gt;
                  &lt;span&gt;Results in Seconds&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex items-center gap-2"&gt;
                  &lt;Sparkles className="w-5 h-5 text-teal-500" /&gt;
                  &lt;span&gt;Powered by Gemini AI&lt;/span&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          {/* Features Section */}
          &lt;div className="max-w-7xl mx-auto px-4 py-20"&gt;
            &lt;h2 className="text-3xl md:text-4xl font-bold text-center mb-4"&gt;
              &lt;span className="text-white"&gt;Why Choose &lt;/span&gt;
              &lt;span className="gradient-text"&gt;StyleVision&lt;/span&gt;
            &lt;/h2&gt;
            &lt;p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto"&gt;
              Advanced AI technology meets personalized style recommendations
            &lt;/p&gt;

            &lt;div className="grid md:grid-cols-3 gap-6"&gt;
              {/* Feature 1 */}
              &lt;div className="card p-8 group"&gt;
                &lt;div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"&gt;
                  &lt;Video className="w-8 h-8 text-purple-400" /&gt;
                &lt;/div&gt;
                &lt;h3 className="text-xl font-bold text-white mb-3"&gt;Live Camera Capture&lt;/h3&gt;
                &lt;p className="text-slate-400"&gt;
                  Take a selfie directly with your phone or laptop camera. Works on all modern browsers.
                &lt;/p&gt;
              &lt;/div&gt;

              {/* Feature 2 */}
              &lt;div className="card card-teal p-8 group"&gt;
                &lt;div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 border border-teal-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"&gt;
                  &lt;Palette className="w-8 h-8 text-teal-400" /&gt;
                &lt;/div&gt;
                &lt;h3 className="text-xl font-bold text-white mb-3"&gt;Color Analysis&lt;/h3&gt;
                &lt;p className="text-slate-400"&gt;
                  Discover your color season and get hair color recommendations that complement your skin tone.
                &lt;/p&gt;
              &lt;/div&gt;

              {/* Feature 3 */}
              &lt;div className="card p-8 group"&gt;
                &lt;div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"&gt;
                  &lt;Brain className="w-8 h-8 text-purple-400" /&gt;
                &lt;/div&gt;
                &lt;h3 className="text-xl font-bold text-white mb-3"&gt;AI Face Analysis&lt;/h3&gt;
                &lt;p className="text-slate-400"&gt;
                  Our AI examines your face shape, features, and current hair to give personalized recommendations.
                &lt;/p&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          {/* How It Works */}
          &lt;div className="max-w-7xl mx-auto px-4 py-20"&gt;
            &lt;div className="glass rounded-3xl p-10 md:p-16"&gt;
              &lt;h2 className="text-3xl md:text-4xl font-bold text-center mb-16"&gt;
                &lt;span className="text-white"&gt;How It &lt;/span&gt;
                &lt;span className="gradient-text"&gt;Works&lt;/span&gt;
              &lt;/h2&gt;

              &lt;div className="grid md:grid-cols-3 gap-12"&gt;
                &lt;div className="text-center"&gt;
                  &lt;div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white text-3xl font-bold glow-purple"&gt;
                    1
                  &lt;/div&gt;
                  &lt;h3 className="text-xl font-semibold text-white mb-3"&gt;Take a Selfie&lt;/h3&gt;
                  &lt;p className="text-slate-400"&gt;Use your camera or upload an existing photo. Front-facing works best.&lt;/p&gt;
                &lt;/div&gt;

                &lt;div className="text-center"&gt;
                  &lt;div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold glow-teal"&gt;
                    2
                  &lt;/div&gt;
                  &lt;h3 className="text-xl font-semibold text-white mb-3"&gt;AI Analysis&lt;/h3&gt;
                  &lt;p className="text-slate-400"&gt;Our AI examines your face shape, features, skin tone, and current hair.&lt;/p&gt;
                &lt;/div&gt;

                &lt;div className="text-center"&gt;
                  &lt;div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center text-white text-3xl font-bold glow-mixed"&gt;
                    3
                  &lt;/div&gt;
                  &lt;h3 className="text-xl font-semibold text-white mb-3"&gt;Get Results&lt;/h3&gt;
                  &lt;p className="text-slate-400"&gt;Receive personalized hairstyle or color recommendations with styling tips.&lt;/p&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div className="text-center mt-12"&gt;
                &lt;button
                  onClick={() =&gt; setShowApp(true)}
                  className="px-10 py-4 bg-gradient-to-r from-purple-600 to-teal-600 text-white text-lg font-semibold rounded-xl hover:shadow-2xl hover:shadow-purple-500/30 hover:scale-105 transition-all"
                &gt;
                  Try It Now - Free
                &lt;/button&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          {/* Footer */}
          &lt;footer className="py-12 border-t border-slate-800"&gt;
            &lt;div className="max-w-7xl mx-auto px-4 text-center"&gt;
              &lt;div className="flex items-center justify-center gap-3 mb-4"&gt;
                &lt;div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center"&gt;
                  &lt;Sparkles className="w-4 h-4 text-white" /&gt;
                &lt;/div&gt;
                &lt;span className="text-lg font-bold gradient-text"&gt;StyleVision AI&lt;/span&gt;
              &lt;/div&gt;
              &lt;p className="text-slate-500 text-sm"&gt;Powered by Google Gemini 2.0 Flash&lt;/p&gt;
            &lt;/div&gt;
          &lt;/footer&gt;
        &lt;/div&gt;
      &lt;/main&gt;
    );
  }

  // Main App Interface
  return (
    &lt;main className="min-h-screen relative overflow-hidden"&gt;
      {/* Background Orbs */}
      &lt;div className="orb orb-purple w-[400px] h-[400px] -top-32 -right-32 opacity-30" /&gt;
      &lt;div className="orb orb-teal w-[300px] h-[300px] bottom-0 -left-32 opacity-30" /&gt;
      
      &lt;canvas ref={canvasRef} className="hidden" /&gt;
      
      &lt;div className="relative z-10 max-w-6xl mx-auto px-4 py-8"&gt;
        {/* Header */}
        &lt;div className="text-center mb-10"&gt;
          &lt;button 
            onClick={() =&gt; { setShowApp(false); stopCamera(); resetAnalysis(); }}
            className="flex items-center justify-center gap-3 mb-4 mx-auto hover:opacity-80 transition-opacity"
          &gt;
            &lt;div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center glow-mixed"&gt;
              &lt;Sparkles className="w-6 h-6 text-white" /&gt;
            &lt;/div&gt;
            &lt;h1 className="text-3xl md:text-4xl font-bold"&gt;
              &lt;span className="gradient-text"&gt;StyleVision&lt;/span&gt;
              &lt;span className="text-white"&gt; AI&lt;/span&gt;
            &lt;/h1&gt;
          &lt;/button&gt;
          &lt;p className="text-slate-400 text-lg"&gt;
            Take a selfie or upload your photo for AI-powered recommendations
          &lt;/p&gt;
        &lt;/div&gt;

        {/* Mode Toggle */}
        &lt;div className="flex justify-center mb-8"&gt;
          &lt;div className="inline-flex rounded-xl bg-slate-800/50 border border-slate-700 p-1.5"&gt;
            &lt;button
              onClick={() =&gt; setActiveMode('hairstyle')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeMode === 'hairstyle'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            &gt;
              &lt;Scissors className="w-4 h-4" /&gt;
              Hairstyle
            &lt;/button&gt;
            &lt;button
              onClick={() =&gt; setActiveMode('color')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeMode === 'color'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            &gt;
              &lt;Palette className="w-4 h-4" /&gt;
              Color
            &lt;/button&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        {/* Capture Section */}
        {!image ? (
          &lt;div className="max-w-xl mx-auto"&gt;
            {/* Camera/Upload Toggle */}
            &lt;div className="flex justify-center mb-6"&gt;
              &lt;div className="inline-flex rounded-xl bg-slate-800/30 border border-slate-700/50 p-1"&gt;
                &lt;button
                  onClick={() =&gt; { setCaptureMode('camera'); stopCamera(); }}
                  className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    captureMode === 'camera'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                &gt;
                  &lt;Video className="w-4 h-4" /&gt;
                  Camera
                &lt;/button&gt;
                &lt;button
                  onClick={() =&gt; { setCaptureMode('upload'); stopCamera(); }}
                  className={`px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    captureMode === 'upload'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                &gt;
                  &lt;Upload className="w-4 h-4" /&gt;
                  Upload
                &lt;/button&gt;
              &lt;/div&gt;
            &lt;/div&gt;

            {captureMode === 'camera' ? (
              &lt;div className="card overflow-hidden"&gt;
                {!isCameraActive ? (
                  &lt;div className="p-12 text-center"&gt;
                    &lt;div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-teal-500/20 border border-purple-500/20 flex items-center justify-center"&gt;
                      &lt;Camera className="w-12 h-12 text-purple-400" /&gt;
                    &lt;/div&gt;
                    &lt;h3 className="text-xl font-semibold text-white mb-2"&gt;Ready to Take a Selfie?&lt;/h3&gt;
                    &lt;p className="text-slate-400 mb-6"&gt;Position your face clearly in the frame&lt;/p&gt;
                    
                    {cameraError &amp;&amp; (
                      &lt;div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"&gt;
                        {cameraError}
                      &lt;/div&gt;
                    )}
                    
                    &lt;button
                      onClick={startCamera}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                    &gt;
                      &lt;Video className="w-6 h-6" /&gt;
                      Start Camera
                    &lt;/button&gt;
                  &lt;/div&gt;
                ) : (
                  &lt;div className="relative"&gt;
                    &lt;video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-auto max-h-[500px] object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    /&gt;
                    
                    &lt;div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent"&gt;
                      &lt;div className="flex items-center justify-center gap-4"&gt;
                        {hasMultipleCameras &amp;&amp; (
                          &lt;button onClick={switchCamera} className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-white/20 transition-all"&gt;
                            &lt;SwitchCamera className="w-6 h-6" /&gt;
                          &lt;/button&gt;
                        )}
                        &lt;button onClick={capturePhoto} className="p-5 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full shadow-xl hover:scale-110 transition-transform"&gt;
                          &lt;Camera className="w-8 h-8 text-white" /&gt;
                        &lt;/button&gt;
                        &lt;button onClick={stopCamera} className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-full hover:bg-red-500/50 transition-all"&gt;
                          &lt;X className="w-6 h-6" /&gt;
                        &lt;/button&gt;
                      &lt;/div&gt;
                    &lt;/div&gt;
                    
                    &lt;div className="absolute inset-0 pointer-events-none flex items-center justify-center"&gt;
                      &lt;div className="w-64 h-80 border-2 border-purple-500/30 rounded-full"&gt;&lt;/div&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;
                )}
              &lt;/div&gt;
            ) : (
              &lt;div
                onClick={() =&gt; fileInputRef.current?.click()}
                className="card p-12 text-center cursor-pointer hover:border-purple-500/50 transition-all group border-2 border-dashed border-slate-700"
              &gt;
                &lt;div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-teal-500/20 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"&gt;
                  &lt;Upload className="w-10 h-10 text-purple-400" /&gt;
                &lt;/div&gt;
                &lt;h3 className="text-xl font-semibold text-white mb-2"&gt;Upload Your Photo&lt;/h3&gt;
                &lt;p className="text-slate-400 mb-4"&gt;Click to select or drag and drop&lt;/p&gt;
                &lt;p className="text-sm text-slate-500"&gt;Supports JPG, PNG up to 10MB&lt;/p&gt;
                &lt;input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /&gt;
              &lt;/div&gt;
            )}
          &lt;/div&gt;
        ) : (
          &lt;div className="grid lg:grid-cols-2 gap-8"&gt;
            {/* Image Preview */}
            &lt;div className="space-y-4"&gt;
              &lt;div className="card p-2 overflow-hidden"&gt;
                &lt;div className="relative rounded-xl overflow-hidden"&gt;
                  &lt;img src={image} alt="Captured" className="w-full h-auto max-h-[500px] object-cover" /&gt;
                  {isAnalyzing &amp;&amp; (
                    &lt;div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"&gt;
                      &lt;div className="text-center"&gt;
                        &lt;Loader2 className="w-12 h-12 animate-spin mx-auto mb-3 text-purple-400" /&gt;
                        &lt;p className="font-medium text-white"&gt;Analyzing your features...&lt;/p&gt;
                      &lt;/div&gt;
                    &lt;/div&gt;
                  )}
                &lt;/div&gt;
              &lt;/div&gt;
              
              &lt;div className="flex gap-3"&gt;
                &lt;button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                &gt;
                  {isAnalyzing ? (
                    &lt;&gt;&lt;Loader2 className="w-5 h-5 animate-spin" /&gt;Analyzing...&lt;/&gt;
                  ) : (
                    &lt;&gt;&lt;Sparkles className="w-5 h-5" /&gt;Analyze {activeMode === 'hairstyle' ? 'Hairstyle' : 'Color'}&lt;/&gt;
                  )}
                &lt;/button&gt;
                &lt;button onClick={resetAnalysis} className="py-3 px-6 border border-slate-700 text-slate-300 rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center gap-2"&gt;
                  &lt;Camera className="w-5 h-5" /&gt;
                  Retake
                &lt;/button&gt;
              &lt;/div&gt;

              {error &amp;&amp; (
                &lt;div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"&gt;{error}&lt;/div&gt;
              )}

              {/* Analysis Summary */}
              {analysisResult &amp;&amp; (
                &lt;div className="card p-6"&gt;
                  &lt;h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2"&gt;
                    &lt;Star className="w-5 h-5 text-purple-400" /&gt;
                    Your Analysis
                  &lt;/h3&gt;
                  &lt;div className="grid grid-cols-2 gap-3"&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Face Shape&lt;/p&gt;
                      &lt;p className="font-semibold text-purple-300"&gt;{analysisResult.faceShape}&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Hair Type&lt;/p&gt;
                      &lt;p className="font-semibold text-purple-300"&gt;{analysisResult.hairType}&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Hair Texture&lt;/p&gt;
                      &lt;p className="font-semibold text-purple-300"&gt;{analysisResult.hairTexture}&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Confidence&lt;/p&gt;
                      &lt;p className="font-semibold text-teal-300"&gt;{Math.round(analysisResult.confidenceScore * 100)}%&lt;/p&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;
                  {analysisResult.expertTip &amp;&amp; (
                    &lt;div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-teal-500/10 rounded-xl border border-purple-500/20"&gt;
                      &lt;p className="text-sm font-medium text-purple-300"&gt;💡 Expert Tip&lt;/p&gt;
                      &lt;p className="text-slate-300 mt-1 text-sm"&gt;{analysisResult.expertTip}&lt;/p&gt;
                    &lt;/div&gt;
                  )}
                &lt;/div&gt;
              )}

              {colorResult &amp;&amp; (
                &lt;div className="card p-6"&gt;
                  &lt;h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2"&gt;
                    &lt;Sparkles className="w-5 h-5 text-teal-400" /&gt;
                    Your Color Profile
                  &lt;/h3&gt;
                  &lt;div className="grid grid-cols-3 gap-3"&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Skin Tone&lt;/p&gt;
                      &lt;p className="font-semibold text-teal-300"&gt;{colorResult.skinTone}&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Undertone&lt;/p&gt;
                      &lt;p className="font-semibold text-teal-300 capitalize"&gt;{colorResult.undertone}&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"&gt;
                      &lt;p className="text-sm text-slate-400 mb-1"&gt;Season&lt;/p&gt;
                      &lt;p className="font-semibold text-teal-300"&gt;{colorResult.season}&lt;/p&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;
                  {colorResult.expertTip &amp;&amp; (
                    &lt;div className="mt-4 p-4 bg-gradient-to-r from-teal-500/10 to-purple-500/10 rounded-xl border border-teal-500/20"&gt;
                      &lt;p className="text-sm font-medium text-teal-300"&gt;💡 Expert Tip&lt;/p&gt;
                      &lt;p className="text-slate-300 mt-1 text-sm"&gt;{colorResult.expertTip}&lt;/p&gt;
                    &lt;/div&gt;
                  )}
                &lt;/div&gt;
              )}
            &lt;/div&gt;

            {/* Results */}
            &lt;div className="space-y-4"&gt;
              {analysisResult &amp;&amp; (
                &lt;&gt;
                  &lt;h2 className="text-2xl font-bold text-white"&gt;Recommended Hairstyles&lt;/h2&gt;
                  {analysisResult.recommendations.map((rec, index) =&gt; (
                    &lt;div key={index} className="card overflow-hidden"&gt;
                      &lt;div onClick={() =&gt; setExpandedCard(expandedCard === index ? null : index)} className="p-5 cursor-pointer"&gt;
                        &lt;div className="flex items-start justify-between"&gt;
                          &lt;div className="flex-1"&gt;
                            &lt;div className="flex items-center gap-3 mb-2"&gt;
                              &lt;span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 text-white rounded-full flex items-center justify-center font-bold text-sm"&gt;{index + 1}&lt;/span&gt;
                              &lt;h3 className="text-lg font-semibold text-white"&gt;{rec.name}&lt;/h3&gt;
                            &lt;/div&gt;
                            &lt;p className="text-slate-400 text-sm line-clamp-2"&gt;{rec.description}&lt;/p&gt;
                          &lt;/div&gt;
                          &lt;div className="flex flex-col items-end gap-2 ml-4"&gt;
                            &lt;span className={`px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(rec.suitabilityScore)}`}&gt;
                              {Math.round(rec.suitabilityScore * 100)}% Match
                            &lt;/span&gt;
                            {expandedCard === index ? &lt;ChevronUp className="w-5 h-5 text-slate-400" /&gt; : &lt;ChevronDown className="w-5 h-5 text-slate-400" /&gt;}
                          &lt;/div&gt;
                        &lt;/div&gt;
                      &lt;/div&gt;
                      {expandedCard === index &amp;&amp; (
                        &lt;div className="px-5 pb-5 border-t border-slate-700/50 pt-4"&gt;
                          &lt;div className="flex items-center gap-4 mb-4"&gt;
                            &lt;span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getMaintenanceColor(rec.maintenanceLevel)}`}&gt;
                              &lt;Clock className="w-3 h-3" /&gt;{rec.maintenanceLevel} Maintenance
                            &lt;/span&gt;
                          &lt;/div&gt;
                          &lt;div className="mb-4"&gt;
                            &lt;h4 className="font-medium text-white mb-2"&gt;Styling Tips&lt;/h4&gt;
                            &lt;ul className="space-y-1"&gt;
                              {rec.stylingTips.map((tip, i) =&gt; (
                                &lt;li key={i} className="text-sm text-slate-400 flex items-start gap-2"&gt;
                                  &lt;span className="text-purple-400 mt-1"&gt;•&lt;/span&gt;{tip}
                                &lt;/li&gt;
                              ))}
                            &lt;/ul&gt;
                          &lt;/div&gt;
                          &lt;div&gt;
                            &lt;h4 className="font-medium text-white mb-2"&gt;Best For&lt;/h4&gt;
                            &lt;div className="flex flex-wrap gap-2"&gt;
                              {rec.bestFor.map((item, i) =&gt; (
                                &lt;span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs border border-slate-700"&gt;{item}&lt;/span&gt;
                              ))}
                            &lt;/div&gt;
                          &lt;/div&gt;
                        &lt;/div&gt;
                      )}
                    &lt;/div&gt;
                  ))}
                &lt;/&gt;
              )}

              {colorResult &amp;&amp; (
                &lt;&gt;
                  &lt;h2 className="text-2xl font-bold text-white"&gt;Recommended Hair Colors&lt;/h2&gt;
                  {colorResult.recommendations.map((rec, index) =&gt; (
                    &lt;div key={index} className="card overflow-hidden"&gt;
                      &lt;div onClick={() =&gt; setExpandedCard(expandedCard === index ? null : index)} className="p-5 cursor-pointer"&gt;
                        &lt;div className="flex items-start justify-between"&gt;
                          &lt;div className="flex items-center gap-4 flex-1"&gt;
                            &lt;div className="w-14 h-14 rounded-xl shadow-lg border-2 border-slate-600" style={{ backgroundColor: rec.hexCode }} /&gt;
                            &lt;div&gt;
                              &lt;h3 className="text-lg font-semibold text-white"&gt;{rec.colorName}&lt;/h3&gt;
                              &lt;p className="text-sm text-slate-400"&gt;{rec.hexCode}&lt;/p&gt;
                            &lt;/div&gt;
                          &lt;/div&gt;
                          &lt;div className="flex flex-col items-end gap-2 ml-4"&gt;
                            &lt;span className={`px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(rec.suitabilityScore)}`}&gt;
                              {Math.round(rec.suitabilityScore * 100)}% Match
                            &lt;/span&gt;
                            {expandedCard === index ? &lt;ChevronUp className="w-5 h-5 text-slate-400" /&gt; : &lt;ChevronDown className="w-5 h-5 text-slate-400" /&gt;}
                          &lt;/div&gt;
                        &lt;/div&gt;
                      &lt;/div&gt;
                      {expandedCard === index &amp;&amp; (
                        &lt;div className="px-5 pb-5 border-t border-slate-700/50 pt-4"&gt;
                          &lt;p className="text-slate-400 mb-4"&gt;{rec.description}&lt;/p&gt;
                          &lt;div className="flex items-center gap-4 mb-4"&gt;
                            &lt;span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getMaintenanceColor(rec.maintenanceLevel)}`}&gt;
                              &lt;Clock className="w-3 h-3" /&gt;{rec.maintenanceLevel} Maintenance
                            &lt;/span&gt;
                          &lt;/div&gt;
                          &lt;div&gt;
                            &lt;h4 className="font-medium text-white mb-2"&gt;Benefits&lt;/h4&gt;
                            &lt;div className="flex flex-wrap gap-2"&gt;
                              {rec.bestFor.map((item, i) =&gt; (
                                &lt;span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs border border-slate-700"&gt;{item}&lt;/span&gt;
                              ))}
                            &lt;/div&gt;
                          &lt;/div&gt;
                        &lt;/div&gt;
                      )}
                    &lt;/div&gt;
                  ))}
                &lt;/&gt;
              )}

              {!analysisResult &amp;&amp; !colorResult &amp;&amp; !isAnalyzing &amp;&amp; (
                &lt;div className="card p-8 text-center border-2 border-dashed border-slate-700"&gt;
                  &lt;Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" /&gt;
                  &lt;p className="text-slate-400"&gt;Click "Analyze" to get your personalized {activeMode === 'hairstyle' ? 'hairstyle' : 'color'} recommendations&lt;/p&gt;
                &lt;/div&gt;
              )}
            &lt;/div&gt;
          &lt;/div&gt;
        )}

        {/* Footer */}
        &lt;footer className="mt-16 text-center"&gt;
          &lt;p className="text-slate-500 text-sm"&gt;StyleVision AI • Powered by Google Gemini 2.0 Flash&lt;/p&gt;
        &lt;/footer&gt;
      &lt;/div&gt;
    &lt;/main&gt;
  );
}
