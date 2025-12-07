'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Sparkles, Loader2, ChevronDown, ChevronUp, Star, Clock, Scissors } from 'lucide-react';
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

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              StyleVision AI
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload your photo and discover personalized hairstyle and color recommendations powered by advanced AI analysis
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl bg-gray-100 p-1.5">
            <button
              onClick={() => setActiveMode('hairstyle')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeMode === 'hairstyle'
                  ? 'bg-white text-primary-700 shadow-md'
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
                  ? 'bg-white text-primary-700 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
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
              className="border-3 border-dashed border-primary-300 rounded-3xl p-12 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 transition-all group"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Your Photo</h3>
              <p className="text-gray-500 mb-4">Drag and drop or click to select</p>
              <p className="text-sm text-gray-400">Supports JPG, PNG up to 10MB</p>
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
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
                    <Star className="w-5 h-5 text-primary-600" />
                    Your Analysis Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Face Shape</p>
                      <p className="font-semibold text-primary-800">{analysisResult.faceShape}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Hair Type</p>
                      <p className="font-semibold text-primary-800">{analysisResult.hairType}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Hair Texture</p>
                      <p className="font-semibold text-primary-800">{analysisResult.hairTexture}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Confidence</p>
                      <p className="font-semibold text-primary-800">{Math.round(analysisResult.confidenceScore * 100)}%</p>
                    </div>
                  </div>
                  {analysisResult.expertTip && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
                      <p className="text-sm font-medium text-primary-800">💡 Expert Tip</p>
                      <p className="text-gray-700 mt-1">{analysisResult.expertTip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Color Analysis Summary */}
              {colorResult && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                    Your Color Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Skin Tone</p>
                      <p className="font-semibold text-primary-800">{colorResult.skinTone}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Undertone</p>
                      <p className="font-semibold text-primary-800 capitalize">{colorResult.undertone}</p>
                    </div>
                    <div className="bg-primary-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Season</p>
                      <p className="font-semibold text-primary-800">{colorResult.season}</p>
                    </div>
                  </div>
                  {colorResult.expertTip && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
                      <p className="text-sm font-medium text-primary-800">💡 Expert Tip</p>
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
                              <span className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center font-bold text-sm">
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
                                  <span className="text-primary-500 mt-1">•</span>
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
          <p>StyleVision AI • Powered by Gemini AI</p>
        </footer>
      </div>
    </main>
  );
}
