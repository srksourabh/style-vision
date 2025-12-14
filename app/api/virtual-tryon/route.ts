import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { userPhoto, analysisType } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const matches = userPhoto.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const imageData = matches ? matches[2] : userPhoto;

    const prompt = analysisType === 'color' ? getColorPrompt() : getHairPrompt();

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageData } }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
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
      const err = await response.json().catch(() => ({}));
      console.error('Gemini error:', response.status, err);
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let parsed;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(text);
    } catch {
      console.error('Parse error:', text.substring(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Format response
    const analysis = {
      faceShape: parsed.faceShape || 'Oval',
      faceAnalysis: parsed.faceAnalysis || {},
      currentHair: parsed.currentHair || {},
      expertTip: parsed.expertTip || parsed.generalAdvice || ''
    };

    const recommendations = (parsed.recommendations || []).map((rec: Record<string, unknown>) => {
      const score = Number(rec.matchScore || rec.suitabilityScore || 80);
      return {
        name: rec.name || 'Classic Cut',
        description: rec.whyItWorks || rec.description || '',
        suitabilityScore: score / 100,
        maintenanceLevel: rec.maintenanceLevel || 'Medium',
        lengthChange: rec.lengthChange || '',
        cuttingTechnique: rec.cuttingInstructions || rec.cuttingTechnique || '',
        stylingTips: rec.stylingTips || [],
        bestFor: rec.bestFor || [],
        dailyStyling: rec.stylingRequired || ''
      };
    });

    return NextResponse.json({
      success: true,
      analysis,
      recommendations
    });

  } catch (error) {
    console.error('Virtual try-on error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

function getHairPrompt(): string {
  return `You are an expert hairstylist. Analyze this person's photo and provide personalized haircut recommendations.

ANALYZE CAREFULLY:
1. Face shape (round, oval, square, oblong, heart, diamond)
2. Jawline (sharp, soft, wide, narrow)
3. Forehead (high, low, wide, narrow)
4. Current hair (length in inches, texture, density)

IMPORTANT RULES:
- ONLY recommend cuts that REDUCE current hair length (these are HAIRCUTS, not extensions)
- If hair is short (< 3 inches), only recommend short styles
- Be realistic about what's achievable
- Consider their face geometry for what will be flattering

Provide exactly 6 haircut recommendations ranked by how well they suit THIS person.

Return ONLY valid JSON:
{
  "faceShape": "detected shape",
  "faceAnalysis": {
    "jawline": "description",
    "forehead": "description",
    "cheekbones": "description",
    "bestFeatures": "what to highlight",
    "areasToBalance": "what the haircut should balance"
  },
  "currentHair": {
    "estimatedLength": "X inches / short / medium / long",
    "texture": "straight / wavy / curly",
    "density": "thin / medium / thick",
    "condition": "healthy / dry / etc"
  },
  "recommendations": [
    {
      "name": "Specific Haircut Name",
      "matchScore": 95,
      "whyItWorks": "2-3 sentences explaining how this cut flatters THEIR specific face shape and features",
      "cuttingInstructions": "Instructions to show a barber - be specific about lengths, layers, fade levels, etc.",
      "lengthChange": "e.g., 'Take 1 inch off sides, keep top at 3 inches'",
      "maintenanceLevel": "Low/Medium/High",
      "stylingRequired": "How much daily effort needed",
      "stylingTips": ["tip1", "tip2", "tip3"],
      "bestFor": ["occasion1", "occasion2"]
    }
  ],
  "expertTip": "One key piece of advice for this person"
}`;
}

function getColorPrompt(): string {
  return `You are an expert hair colorist. Analyze this person's photo for hair color recommendations.

ANALYZE:
1. Skin tone and undertone
2. Eye color
3. Current hair color
4. Overall coloring (warm/cool/neutral)

Recommend 6 hair colors that would complement their natural coloring.

Return ONLY valid JSON:
{
  "faceShape": "detected shape",
  "faceAnalysis": {
    "skinTone": "fair/light/medium/tan/deep",
    "undertone": "warm/cool/neutral",
    "eyeColor": "color",
    "currentHairColor": "color"
  },
  "currentHair": {
    "estimatedLength": "length",
    "texture": "texture",
    "density": "density"
  },
  "recommendations": [
    {
      "name": "Color Name",
      "hexCode": "#RRGGBB",
      "matchScore": 95,
      "whyItWorks": "Why this color suits them",
      "technique": "Full color / Balayage / Highlights / etc",
      "maintenanceLevel": "Low/Medium/High",
      "stylingTips": ["tip1"],
      "bestFor": ["benefit1"]
    }
  ],
  "expertTip": "Color advice for this person"
}`;
}
