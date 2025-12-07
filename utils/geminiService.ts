// StyleVision AI - Gemini Service
// Uses Gemini 2.0 Flash for face analysis and hairstyle recommendations

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

// Helper function to extract base64 data from data URL
function extractBase64(dataUrl: string): { mimeType: string; data: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], data: matches[2] };
  }
  // Assume it's already base64 without prefix
  return { mimeType: 'image/jpeg', data: dataUrl };
}

// Parse JSON from potentially markdown-wrapped response
function parseJsonResponse(text: string): any {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  // Try direct parse
  return JSON.parse(text);
}

// Main face analysis function
export async function analyzeWithGemini(imageSrc: string): Promise<AnalysisResult> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, using fallback data');
    return getFallbackAnalysis();
  }

  const { mimeType, data } = extractBase64(imageSrc);

  const prompt = `You are an elite virtual hair stylist with advanced computer vision capabilities. Analyze this person's photo and provide personalized hairstyle recommendations.

ANALYZE:
1. Face shape (oval, round, square, heart, oblong, diamond)
2. Facial features (jawline, forehead width, cheekbone prominence, eye shape)
3. Current hair type and texture
4. Overall aesthetic and style preferences visible

PROVIDE 6 hairstyle recommendations ranked by suitability.

Return ONLY valid JSON in this exact format:
{
  "faceShape": "string",
  "faceFeatures": {
    "jawline": "string description",
    "forehead": "string description",
    "cheekbones": "string description",
    "eyeShape": "string description"
  },
  "hairType": "string",
  "hairTexture": "string",
  "confidenceScore": 0.0-1.0,
  "recommendations": [
    {
      "name": "Hairstyle Name",
      "description": "Why this suits you - be specific about face shape and features",
      "suitabilityScore": 0.0-1.0,
      "maintenanceLevel": "Low|Medium|High",
      "stylingTips": ["tip1", "tip2", "tip3"],
      "bestFor": ["occasion1", "occasion2"]
    }
  ],
  "expertTip": "One personalized styling tip based on their unique features"
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response text from Gemini');
    }

    const parsed = parseJsonResponse(text);
    return parsed as AnalysisResult;

  } catch (error) {
    console.error('Error analyzing image:', error);
    return getFallbackAnalysis();
  }
}

// Color analysis function
export async function analyzeColorWithGemini(imageSrc: string): Promise<ColorAnalysisResult> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, using fallback data');
    return getFallbackColorAnalysis();
  }

  const { mimeType, data } = extractBase64(imageSrc);

  const prompt = `You are an expert colorist specializing in hair color recommendations using seasonal color analysis.

Analyze this person's photo and determine:
1. Skin tone (fair, light, medium, tan, deep)
2. Undertone (warm, cool, neutral)
3. Color season (Spring, Summer, Autumn, Winter)

Based on this analysis, recommend 6 hair colors that would complement their natural coloring.

Return ONLY valid JSON in this exact format:
{
  "skinTone": "string",
  "undertone": "warm|cool|neutral",
  "season": "Spring|Summer|Autumn|Winter",
  "recommendations": [
    {
      "colorName": "Color Name",
      "hexCode": "#RRGGBB",
      "description": "Why this color complements their coloring",
      "suitabilityScore": 0.0-1.0,
      "maintenanceLevel": "Low|Medium|High",
      "bestFor": ["benefit1", "benefit2"]
    }
  ],
  "expertTip": "Personalized color advice"
}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No response text from Gemini');
    }

    return parseJsonResponse(text) as ColorAnalysisResult;

  } catch (error) {
    console.error('Error analyzing color:', error);
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
        colorName: 'Rich Chestnut',
        hexCode: '#954535',
        description: 'A warm, dimensional brown that enhances your natural warmth and creates a sun-kissed glow.',
        suitabilityScore: 0.95,
        maintenanceLevel: 'Low',
        bestFor: ['Natural enhancement', 'Low maintenance', 'Year-round wear'],
      },
      {
        colorName: 'Honey Blonde',
        hexCode: '#EB9605',
        description: 'Golden tones that complement warm undertones and add brightness to your complexion.',
        suitabilityScore: 0.90,
        maintenanceLevel: 'Medium',
        bestFor: ['Summer months', 'Brightening effect', 'Youthful appearance'],
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
        suitabilityScore: 0.92,
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
