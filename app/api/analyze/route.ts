import { NextRequest, NextResponse } from 'next/server';

// Use Gemini 2.0 Flash for analysis
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
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
  return `You are an expert hairstylist analyzing a client's photo. Provide detailed, personalized haircut recommendations.

STEP 1 - DETAILED FACE ANALYSIS:
Examine the photo carefully and identify:
- Face shape (round, oval, square, oblong, heart, diamond)
- Jawline characteristics
- Forehead width and height
- Cheekbone prominence
- Current hair length, texture, density, and condition

STEP 2 - HAIR CUTTING CONSTRAINTS:
CRITICAL: Only recommend haircuts that can be achieved by CUTTING the current hair.
- If hair is short, only recommend short styles
- If hair is medium, recommend short to medium styles
- If hair is long, any shorter style is possible
- NEVER suggest styles requiring longer hair than they currently have

STEP 3 - PERSONALIZED RECOMMENDATIONS:
Provide exactly 6 haircut recommendations, each specifically tailored to THIS person's:
- Face geometry (how the cut will balance their features)
- Current hair properties (texture, density)
- Achievable results (realistic expectations)

Return ONLY valid JSON in this exact format:
{
  "faceShape": "detected shape",
  "faceAnalysis": {
    "jawline": "specific description",
    "forehead": "specific description",
    "cheekbones": "specific description",
    "overallBalance": "what needs balancing"
  },
  "currentHair": {
    "length": "short/medium/long with inches estimate",
    "texture": "straight/wavy/curly",
    "density": "thin/medium/thick",
    "condition": "assessment"
  },
  "recommendations": [
    {
      "name": "Specific Haircut Name",
      "matchScore": 95,
      "whyItWorks": "2-3 sentences explaining how this cut specifically complements THEIR face shape and features",
      "cuttingInstructions": "Brief description of the cut for a barber/stylist",
      "lengthChange": "How much to cut - e.g., 'Trim 1 inch on sides, keep top length'",
      "maintenanceLevel": "Low/Medium/High",
      "growOutGracefully": true,
      "stylingRequired": "Daily styling needs",
      "bestAngles": "Which angles this cut flatters most",
      "avoidIf": "Any conditions where this wouldn't work"
    }
  ],
  "generalAdvice": "Overall personalized advice for this person's hair"
}`;
}

function getColorAnalysisPrompt(): string {
  return `You are an expert hair colorist analyzing a client's photo for color recommendations.

ANALYZE:
1. Skin tone (fair, light, medium, olive, tan, deep)
2. Skin undertone (warm/golden, cool/pink, neutral)
3. Eye color
4. Natural hair color
5. Veins color (if visible - blue=cool, green=warm)

CONSTRAINTS:
- Consider how drastic a color change would be from their current color
- Factor in maintenance requirements
- Consider their skin undertone compatibility

Provide 6 hair color recommendations ranked by suitability.

Return ONLY valid JSON:
{
  "skinAnalysis": {
    "tone": "specific tone",
    "undertone": "warm/cool/neutral",
    "season": "Spring/Summer/Autumn/Winter"
  },
  "eyeColor": "color",
  "currentHairColor": "color",
  "recommendations": [
    {
      "colorName": "Specific Color Name",
      "hexCode": "#RRGGBB",
      "matchScore": 95,
      "technique": "Full color/Balayage/Highlights/Ombre/etc",
      "whyItWorks": "How this complements their coloring",
      "maintenanceLevel": "Low/Medium/High",
      "touchUpFrequency": "How often touch-ups needed",
      "damageLevel": "Minimal/Moderate/Significant",
      "homeCareTips": ["tip1", "tip2"]
    }
  ],
  "colorsToAvoid": ["color1", "color2"],
  "generalAdvice": "Personalized color advice"
}`;
}
