// StyleVision AI - Gemini Service
// Uses server-side API route for secure Gemini API calls

// Types
export interface HairstyleRecommendation {
  name: string;
  description: string;
  suitabilityScore: number;
  maintenanceLevel: 'Low' | 'Medium' | 'High';
  stylingTips: string[];
  bestFor: string[];
  imageUrl?: string;
}

export interface FaceFeatures {
  jawline: string;
  forehead: string;
  cheekbones: string;
  eyeShape: string;
}

export interface AnalysisResult {
  faceShape: string;
  faceFeatures: FaceFeatures;
  hairType: string;
  hairTexture: string;
  recommendations: HairstyleRecommendation[];
  confidenceScore: number;
  expertTip: string;
}

export interface ColorRecommendation {
  colorName: string;
  hexCode: string;
  description: string;
  suitabilityScore: number;
  maintenanceLevel: 'Low' | 'Medium' | 'High';
  bestFor: string[];
}

export interface ColorAnalysisResult {
  skinTone: string;
  undertone: string;
  season: string;
  recommendations: ColorRecommendation[];
  expertTip: string;
}

// Main face analysis function - uses server-side API route
export async function analyzeWithGemini(imageSrc: string): Promise<AnalysisResult> {
  try {
    console.log('Calling server-side analysis API...');
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageSrc,
        analysisType: 'hair'
      }),
    });

    const result = await response.json();
    
    if (!response.ok || result.useFallback) {
      console.warn('API returned error or fallback flag:', result.error);
      return getFallbackAnalysis();
    }

    if (result.success && result.data) {
      console.log('Successfully received AI analysis');
      return result.data as AnalysisResult;
    }

    return getFallbackAnalysis();

  } catch (error) {
    console.error('Error calling analysis API:', error);
    return getFallbackAnalysis();
  }
}

// Color analysis function - uses server-side API route
export async function analyzeColorWithGemini(imageSrc: string): Promise<ColorAnalysisResult> {
  try {
    console.log('Calling server-side color analysis API...');
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageSrc,
        analysisType: 'color'
      }),
    });

    const result = await response.json();
    
    if (!response.ok || result.useFallback) {
      console.warn('API returned error or fallback flag:', result.error);
      return getFallbackColorAnalysis();
    }

    if (result.success && result.data) {
      console.log('Successfully received AI color analysis');
      return result.data as ColorAnalysisResult;
    }

    return getFallbackColorAnalysis();

  } catch (error) {
    console.error('Error calling color analysis API:', error);
    return getFallbackColorAnalysis();
  }
}

// Fallback data when API is unavailable
function getFallbackAnalysis(): AnalysisResult {
  return {
    faceShape: 'Oval',
    faceFeatures: {
      jawline: 'Well-defined with gentle curves',
      forehead: 'Proportionate width',
      cheekbones: 'Balanced prominence',
      eyeShape: 'Almond-shaped',
    },
    hairType: 'Medium density',
    hairTexture: 'Wavy',
    confidenceScore: 0.85,
    recommendations: [
      {
        name: 'Layered Lob',
        description: 'A versatile shoulder-length cut with face-framing layers that adds movement and dimension. Perfect for enhancing natural texture.',
        suitabilityScore: 0.95,
        maintenanceLevel: 'Medium',
        stylingTips: ['Use a round brush while blow-drying', 'Apply texturizing spray for volume', 'Try loose beach waves'],
        bestFor: ['Professional settings', 'Casual outings', 'Date nights'],
      },
      {
        name: 'Textured Pixie',
        description: 'A bold, modern cut that highlights facial features and bone structure. Low maintenance yet high impact.',
        suitabilityScore: 0.88,
        maintenanceLevel: 'Low',
        stylingTips: ['Use pomade for definition', 'Finger-style for natural look', 'Regular trims every 4-6 weeks'],
        bestFor: ['Active lifestyle', 'Professional settings', 'Making a statement'],
      },
      {
        name: 'Curtain Bangs with Long Layers',
        description: 'Soft, face-framing bangs paired with flowing layers create a romantic, effortless look that flatters most face shapes.',
        suitabilityScore: 0.90,
        maintenanceLevel: 'Medium',
        stylingTips: ['Blow-dry bangs with a round brush', 'Use heat protectant', 'Style away from face'],
        bestFor: ['Romantic occasions', 'Photography', 'Everyday elegance'],
      },
      {
        name: 'Blunt Bob',
        description: 'A classic chin-length bob with clean lines that creates a polished, sophisticated appearance.',
        suitabilityScore: 0.85,
        maintenanceLevel: 'Medium',
        stylingTips: ['Flat iron for sleek finish', 'Add shine serum', 'Regular trims maintain shape'],
        bestFor: ['Corporate settings', 'Formal events', 'Timeless style'],
      },
      {
        name: 'Shaggy Layers',
        description: 'A relaxed, textured style with choppy layers throughout that adds volume and movement for an effortlessly cool vibe.',
        suitabilityScore: 0.82,
        maintenanceLevel: 'Low',
        stylingTips: ['Scrunch with mousse', 'Air dry for natural texture', 'Use sea salt spray'],
        bestFor: ['Casual settings', 'Creative environments', 'Weekend looks'],
      },
      {
        name: 'Side-Swept Long Layers',
        description: 'Elegant long layers with a dramatic side part that creates asymmetry and draws attention to your best features.',
        suitabilityScore: 0.80,
        maintenanceLevel: 'High',
        stylingTips: ['Deep condition weekly', 'Use volumizing products at roots', 'Protect ends from damage'],
        bestFor: ['Special occasions', 'Red carpet events', 'Glamorous looks'],
      },
    ],
    expertTip: 'Your natural hair texture is an asset! Consider styles that work with your waves rather than against them for easier daily styling.',
  };
}

function getFallbackColorAnalysis(): ColorAnalysisResult {
  return {
    skinTone: 'Medium',
    undertone: 'Warm',
    season: 'Autumn',
    recommendations: [
      {
        colorName: 'Warm Honey Blonde',
        hexCode: '#EB9605',
        description: 'Golden tones that complement warm undertones and add brightness to your complexion.',
        suitabilityScore: 0.95,
        maintenanceLevel: 'Medium',
        bestFor: ['Summer months', 'Brightening effect', 'Youthful appearance'],
      },
      {
        colorName: 'Rich Chestnut',
        hexCode: '#954535',
        description: 'A warm, dimensional brown that enhances your natural warmth and creates a sun-kissed glow.',
        suitabilityScore: 0.92,
        maintenanceLevel: 'Low',
        bestFor: ['Natural enhancement', 'Low maintenance', 'Year-round wear'],
      },
      {
        colorName: 'Copper Auburn',
        hexCode: '#B87333',
        description: 'A vibrant red-orange that makes warm skin tones glow and adds dimension.',
        suitabilityScore: 0.88,
        maintenanceLevel: 'High',
        bestFor: ['Making a statement', 'Fall season', 'Standing out'],
      },
      {
        colorName: 'Caramel Balayage',
        hexCode: '#FFD59A',
        description: 'Hand-painted caramel highlights that create natural-looking dimension and movement.',
        suitabilityScore: 0.90,
        maintenanceLevel: 'Low',
        bestFor: ['Low maintenance', 'Natural look', 'Gradual grow-out'],
      },
      {
        colorName: 'Espresso Brown',
        hexCode: '#3C2415',
        description: 'A deep, rich brown that adds depth and sophistication while remaining natural.',
        suitabilityScore: 0.85,
        maintenanceLevel: 'Low',
        bestFor: ['Professional settings', 'Classic look', 'Easy maintenance'],
      },
      {
        colorName: 'Golden Bronde',
        hexCode: '#A17249',
        description: 'The perfect blend of brown and blonde with golden undertones for a multidimensional effect.',
        suitabilityScore: 0.87,
        maintenanceLevel: 'Medium',
        bestFor: ['Versatile styling', 'Transitional seasons', 'Modern look'],
      },
    ],
    expertTip: 'Your warm undertones pair beautifully with golden and copper-based colors. Avoid ashy tones which may wash out your complexion.',
  };
}
