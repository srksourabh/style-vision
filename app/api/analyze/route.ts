import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Get API key from server-side environment variable (more secure)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Simple retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

export async function POST(request: NextRequest) {
  try {
    const { imageSrc, analysisType } = await request.json();

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API key not configured', useFallback: true },
        { status: 500 }
      );
    }

    // Extract base64 data
    const matches = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const data = matches ? matches[2] : imageSrc;

    const prompt = analysisType === 'color' 
      ? getColorPrompt()
      : getHairPrompt();

    const response = await fetchWithRetry(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      
      // Specific handling for rate limit
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. The AI service is temporarily busy. Please wait a minute and try again.',
            errorCode: 'RATE_LIMITED',
            useFallback: true 
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: `API error: ${response.status}`, details: errorData, useFallback: true },
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

    // Parse JSON from potentially markdown-wrapped response
    let parsed;
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        parsed = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json(
        { error: 'Failed to parse response', useFallback: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });

  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', useFallback: true },
      { status: 500 }
    );
  }
}

function getHairPrompt(): string {
  return `You are an elite virtual hair stylist with advanced computer vision capabilities. Analyze this person's photo and provide personalized hairstyle recommendations.

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
}

function getColorPrompt(): string {
  return `You are an expert colorist specializing in hair color recommendations using seasonal color analysis.

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
}
