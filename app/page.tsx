'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Sparkles, Loader2, ChevronDown, ChevronUp, Star, Clock, Scissors, Palette, Zap, Shield } from 'lucide-react';
import { analyzeWithGemini, analyzeColorWithGemini, AnalysisResult, ColorAnalysisResult } from '@/utils/geminiService';

type AnalysisMode = 'hairstyle' | 'color';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [colorResult, setColorResult] = useState<ColorAnalysisResult | null>(null);
  const [activeMode, setActiveMode] = useState<AnalysisMode>('hairstyle');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApp, setShowApp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-100';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getMaintenanceColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-700 bg-green-100';
      case 'Medium': return 'text-yellow-700 bg-yellow-100';
      case 'High': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  // Landing Page / Hero Section
  if (!showApp) {
    return (
      <main className="min-h-screen">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-50 to-white"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200 rounded-full filter blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative max-w-6xl mx-auto px-4 py-20">
            {/* Logo & Title */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/25">
                  <Scissors className="w-12 h-12 text-white" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                  StyleVision AI
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Discover your perfect hairstyle with AI-powered face analysis.
                Upload a photo and get personalized recommendations in seconds.
              </p>
            </div>

            {/* CTA Button */}
            <div className="text-center mb-16">
              <button
                onClick={() => setShowApp(true)}
                className="group px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-semibold rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
              >
                <Camera className="w-6 h-6" />
                Get Started - It's Free
                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              </button>
              <p className="mt-4 text-gray-500 text-sm">No signup required • Instant results</p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-5">
                  <Scissors className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Hairstyle Analysis</h3>
                <p className="text-gray-600">
                  AI analyzes your face shape, features, and current hair to recommend 6 perfect hairstyles tailored just for you.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mb-5">
                  <Palette className="w-7 h-7 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Color Matching</h3>
                <p className="text-gray-600">
                  Discover your color season and get personalized hair color recommendations that complement your skin tone.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-5">
                  <Zap className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Instant Results</h3>
                <p className="text-gray-600">
                  Powered by Gemini 2.0 Flash AI for lightning-fast analysis. Get detailed recommendations in under 10 seconds.
                </p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-10 shadow-lg">
              <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                    1
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">Upload Photo</h3>
                  <p className="text-gray-600">Take a selfie or upload an existing photo. Clear, front-facing works best.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                    2
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">AI Analysis</h3>
                  <p className="text-gray-600">Our AI examines your face shape, features, skin tone, and current hair.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                    3
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">Get Recommendations</h3>
                  <p className="text-gray-600">Receive 6 personalized hairstyle or color recommendations with styling tips.</p>
                </div>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-6 mt-12 text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Photos never stored</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm">Powered by Google Gemini AI</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Main App Interface
  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <button 
            onClick={() => setShowApp(false)}
            className="flex items-center justify-center gap-3 mb-4 mx-auto hover:opacity-80 transition-opacity"
          >
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              StyleVision AI
            </h1>
          </button>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload your photo and discover personalized hairstyle and color recommendations
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl bg-gray-100 p-1.5">
            <button
              onClick={() => setActiveMode('hairstyle')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeMode === 'hairstyle'
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                Hairstyle Analysis
              </span>
            </button>
            <button
              onClick={() => setActiveMode('color')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeMode === 'color'
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color Analysis
              </span>
            </button>
          </div>
        </div>

        {/* Upload Section */}
        {!image ? (
          <div className="max-w-xl mx-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-300 rounded-3xl p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all group"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Your Photo</h3>
              <p className="text-gray-500 mb-4">Click to select or drag and drop</p>
              <p className="text-sm text-gray-400">Supports JPG, PNG up to 10MB</p>
              <p className="text-xs text-purple-500 mt-4">💡 Tip: Use a clear, front-facing photo for best results</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white p-2">
                <img
                  src={image}
                  alt="Uploaded"
                  className="w-full h-auto rounded-xl object-cover max-h-[500px]"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <div className="text-center text-white">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                      <p className="font-medium">Analyzing your features...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze {activeMode === 'hairstyle' ? 'Hairstyle' : 'Color'}
                    </>
                  )}
                </button>
                <button
                  onClick={resetAnalysis}
                  className="py-3 px-6 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  New Photo
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  {error}
                </div>
              )}

              {/* Face Analysis Summary */}
              {analysisResult && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-purple-600" />
                    Your Analysis Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Face Shape</p>
                      <p className="font-semibold text-purple-800">{analysisResult.faceShape}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Hair Type</p>
                      <p className="font-semibold text-purple-800">{analysisResult.hairType}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Hair Texture</p>
                      <p className="font-semibold text-purple-800">{analysisResult.hairTexture}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Confidence</p>
                      <p className="font-semibold text-purple-800">{Math.round(analysisResult.confidenceScore * 100)}%</p>
                    </div>
                  </div>
                  {analysisResult.expertTip && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                      <p className="text-sm font-medium text-purple-800">💡 Expert Tip</p>
                      <p className="text-gray-700 mt-1">{analysisResult.expertTip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Color Analysis Summary */}
              {colorResult && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Your Color Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Skin Tone</p>
                      <p className="font-semibold text-purple-800">{colorResult.skinTone}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Undertone</p>
                      <p className="font-semibold text-purple-800 capitalize">{colorResult.undertone}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Season</p>
                      <p className="font-semibold text-purple-800">{colorResult.season}</p>
                    </div>
                  </div>
                  {colorResult.expertTip && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                      <p className="text-sm font-medium text-purple-800">💡 Expert Tip</p>
                      <p className="text-gray-700 mt-1">{colorResult.expertTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="space-y-4">
              {analysisResult && (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Recommended Hairstyles
                  </h2>
                  {analysisResult.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
                    >
                      <div
                        onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                        className="p-5 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {index + 1}
                              </span>
                              <h3 className="text-lg font-semibold text-gray-800">{rec.name}</h3>
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2">{rec.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(rec.suitabilityScore)}`}>
                              {Math.round(rec.suitabilityScore * 100)}% Match
                            </span>
                            {expandedCard === index ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedCard === index && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                          <div className="flex items-center gap-4 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getMaintenanceColor(rec.maintenanceLevel)}`}>
                              <Clock className="w-3 h-3" />
                              {rec.maintenanceLevel} Maintenance
                            </span>
                          </div>

                          <div className="mb-4">
                            <h4 className="font-medium text-gray-800 mb-2">Styling Tips</h4>
                            <ul className="space-y-1">
                              {rec.stylingTips.map((tip, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-purple-500 mt-1">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Best For</h4>
                            <div className="flex flex-wrap gap-2">
                              {rec.bestFor.map((item, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                >
                                  {item}
                                </span>
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
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Recommended Hair Colors
                  </h2>
                  {colorResult.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
                    >
                      <div
                        onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                        className="p-5 cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className="w-14 h-14 rounded-xl shadow-inner border-2 border-white"
                              style={{ backgroundColor: rec.hexCode }}
                            />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">{rec.colorName}</h3>
                              <p className="text-sm text-gray-500">{rec.hexCode}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(rec.suitabilityScore)}`}>
                              {Math.round(rec.suitabilityScore * 100)}% Match
                            </span>
                            {expandedCard === index ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedCard === index && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                          <p className="text-gray-600 mb-4">{rec.description}</p>
                          
                          <div className="flex items-center gap-4 mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getMaintenanceColor(rec.maintenanceLevel)}`}>
                              <Clock className="w-3 h-3" />
                              {rec.maintenanceLevel} Maintenance
                            </span>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Benefits</h4>
                            <div className="flex flex-wrap gap-2">
                              {rec.bestFor.map((item, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                                >
                                  {item}
                                </span>
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
                <div className="bg-white/50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Click "Analyze" to get your personalized {activeMode === 'hairstyle' ? 'hairstyle' : 'color'} recommendations
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-400 text-sm">
          <p>StyleVision AI • Powered by Gemini 2.0 Flash AI</p>
        </footer>
      </div>
    </main>
  );
}
