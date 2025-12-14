import { NextRequest, NextResponse } from 'next/server';

// Gemini 2.0 Flash with image generation
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { imageSrc, analysisType } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured', useFallback: true },
        { status: 500 }
      );
    }

    // Extract base64 data from the image
    const matches = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const imageData = matches ? matches[2] : imageSrc;

    const prompt = analysisType === 'color' 
      ? getColorAnalysisPrompt()
      : getHairstyleAnalysisPrompt();

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
                data: imageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment and try again.', useFallback: true },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: `API error: ${response.status}`, useFallback: true },
        { status: response.status }
      );
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return NextResponse.json(
        { error: 'No response from Gemini', useFallback: true },
        { status: 500 }
      );
    }

    // Parse JSON response
    let parsed;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(text);
    } catch {
      console.error('Failed to parse response:', text);
      return NextResponse.json(
        { error: 'Failed to parse response', useFallback: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', useFallback: true },
      { status: 500 }
    );
  }
}

function getHairstyleAnalysisPrompt(): string {
  return `You are an expert hairstylist and facial geometry analyst. Analyze this person's photo carefully.

CRITICAL ANALYSIS REQUIRED:
1. FACE SHAPE: Identify precisely (oval, round, square, heart, oblong, diamond, rectangle)
2. FACIAL FEATURES: 
   - Jawline (sharp, soft, wide, narrow)
   - Forehead (high, low, wide, narrow)
   - Cheekbones (prominent, subtle)
   - Face length vs width ratio
3. CURRENT HAIR:
   - Approximate current length
   - Hair texture (straight, wavy, curly, coily)
   - Hair density (thin, medium, thick)
   - Natural growth pattern

IMPORTANT CONSTRAINTS:
- Only recommend haircuts that REDUCE or MAINTAIN current length (no extensions/additions)
- Consider what's realistically achievable with their current hair
- Focus on cuts that complement their specific facial geometry

Recommend exactly 6 hairstyles ranked by suitability. For each, provide:
- Specific cutting technique
- Why it flatters their face shape
- How it works with their hair texture

Return ONLY valid JSON:
{
  "faceShape": "specific shape",
  "faceAnalysis": {
    "jawline": "description",
    "forehead": "description", 
    "cheekbones": "description",
    "faceRatio": "description"
  },
  "currentHair": {
    "estimatedLength": "short/medium/long",
    "texture": "straight/wavy/curly/coily",
    "density": "thin/medium/thick"
  },
  "recommendations": [
    {
      "name": "Specific Hairstyle Name",
      "cuttingTechnique": "Detailed cutting approach",
      "description": "Why this suits their face - be specific about geometry",
      "suitabilityScore": 0.95,
      "lengthChange": "trim 2 inches / major cut / reshape only",
      "maintenanceLevel": "Low/Medium/High",
      "stylingTips": ["tip1", "tip2", "tip3"],
      "bestFor": ["occasion1", "occasion2"],
      "visualDescription": "Detailed description of how this would look on them - describe the final result with specific details about length, layers, framing, parting, etc."
    }
  ],
  "expertTip": "Personalized advice based on their unique features"
}`;
}

function getColorAnalysisPrompt(): string {
  return `You are an expert hair colorist specializing in color theory and skin tone analysis.

Analyze this person's photo for:
1. Skin tone (fair, light, medium, olive, tan, deep)
2. Undertone (warm/golden, cool/pink, neutral)
3. Eye color
4. Natural hair color
5. Color season (Spring, Summer, Autumn, Winter)

Recommend 6 hair colors that would complement their natural coloring.
Only recommend colors achievable from their current hair (consider if bleaching would be needed).

Return ONLY valid JSON:
{
  "skinTone": "specific tone",
  "undertone": "warm/cool/neutral",
  "eyeColor": "color",
  "naturalHairColor": "color",
  "season": "Spring/Summer/Autumn/Winter",
  "recommendations": [
    {
      "colorName": "Specific Color Name",
      "hexCode": "#RRGGBB",
      "technique": "balayage/highlights/full color/ombre",
      "description": "Why this complements their coloring",
      "suitabilityScore": 0.95,
      "maintenanceLevel": "Low/Medium/High",
      "processingNeeded": "description of salon process",
      "bestFor": ["benefit1", "benefit2"]
    }
  ],
  "expertTip": "Personalized color advice"
}`;
}
