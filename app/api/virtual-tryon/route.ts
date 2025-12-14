import { NextRequest, NextResponse } from 'next/server';

// Gemini 2.0 Flash Experimental with native image generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { userPhoto, analysisType } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Extract base64 from user photo
    const matches = userPhoto.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const imageData = matches ? matches[2] : userPhoto;

    // Step 1: Analyze the face and get hairstyle recommendations
    const analysisPrompt = getAnalysisPrompt(analysisType);
    
    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: analysisPrompt },
              { inline_data: { mime_type: mimeType, data: imageData } }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json().catch(() => ({}));
      console.error('Analysis error:', analysisResponse.status, errorData);
      return NextResponse.json({ error: 'Analysis failed', details: errorData }, { status: analysisResponse.status });
    }

    const analysisResult = await analysisResponse.json();
    const analysisText = analysisResult.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!analysisText) {
      return NextResponse.json({ error: 'No analysis response' }, { status: 500 });
    }

    // Parse the analysis JSON
    let analysis;
    try {
      const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(analysisText);
    } catch {
      console.error('Failed to parse analysis:', analysisText);
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    // Step 2: Generate visualizations for each hairstyle
    const recommendations = analysis.recommendations || [];
    const visualizations = [];

    for (const rec of recommendations.slice(0, 6)) {
      try {
        const visualization = await generateHairstyleVisualization(
          imageData,
          mimeType,
          rec,
          analysis.faceShape,
          analysis.currentHair
        );
        visualizations.push({
          ...rec,
          generatedImage: visualization.image,
          generationSuccess: visualization.success
        });
      } catch (err) {
        console.error('Failed to generate visualization for:', rec.name, err);
        visualizations.push({
          ...rec,
          generatedImage: null,
          generationSuccess: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        faceShape: analysis.faceShape,
        faceAnalysis: analysis.faceAnalysis,
        currentHair: analysis.currentHair,
        expertTip: analysis.expertTip
      },
      recommendations: visualizations
    });

  } catch (error) {
    console.error('Virtual try-on error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateHairstyleVisualization(
  imageData: string,
  mimeType: string,
  recommendation: {
    name: string;
    description: string;
    cuttingTechnique?: string;
    visualDescription?: string;
  },
  faceShape: string,
  currentHair: { estimatedLength?: string; texture?: string }
): Promise<{ success: boolean; image: string | null }> {
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  const prompt = `You are a professional hair stylist photo editor. 

TASK: Transform this person's hair to show them with a "${recommendation.name}" hairstyle.

FACE SHAPE: ${faceShape}
CURRENT HAIR: ${currentHair?.estimatedLength || 'medium'} length, ${currentHair?.texture || 'straight'} texture

HAIRSTYLE TO APPLY:
Name: ${recommendation.name}
Description: ${recommendation.description}
${recommendation.cuttingTechnique ? `Cutting Technique: ${recommendation.cuttingTechnique}` : ''}
${recommendation.visualDescription ? `Visual Details: ${recommendation.visualDescription}` : ''}

CRITICAL RULES:
1. Keep the EXACT same face, skin, eyes, expression, background
2. ONLY modify the hair - apply the described haircut
3. This is a HAIRCUT - you can only REMOVE or RESHAPE hair, never add length
4. Make it photorealistic - like an actual salon result photo
5. Match the lighting and photo quality of the original
6. The person should look like themselves, just with a new haircut

Generate ONE photorealistic image showing this exact person with the ${recommendation.name} haircut applied.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
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
            temperature: 0.8,
            maxOutputTokens: 8192,
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!response.ok) {
      // Try fallback model
      return await generateWithFallbackModel(imageData, mimeType, recommendation, faceShape, currentHair);
    }

    const result = await response.json();
    const parts = result.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inline_data?.mime_type?.startsWith('image/')) {
        return {
          success: true,
          image: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`
        };
      }
    }

    // No image in response, try fallback
    return await generateWithFallbackModel(imageData, mimeType, recommendation, faceShape, currentHair);
    
  } catch (error) {
    console.error('Image generation error:', error);
    return await generateWithFallbackModel(imageData, mimeType, recommendation, faceShape, currentHair);
  }
}

async function generateWithFallbackModel(
  imageData: string,
  mimeType: string,
  recommendation: { name: string; description: string },
  faceShape: string,
  currentHair: { estimatedLength?: string; texture?: string }
): Promise<{ success: boolean; image: string | null }> {
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // Try with Imagen 3 via Gemini
  const prompt = `Edit this person's photo to show them with a "${recommendation.name}" haircut. 
Keep their face exactly the same. Only change the hair to: ${recommendation.description}. 
Face shape is ${faceShape}. Current hair is ${currentHair?.estimatedLength || 'medium'} ${currentHair?.texture || 'straight'}.
Make it look like a real salon result photo.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
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
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!response.ok) {
      return { success: false, image: null };
    }

    const result = await response.json();
    const parts = result.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inline_data?.mime_type?.startsWith('image/')) {
        return {
          success: true,
          image: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`
        };
      }
    }

    return { success: false, image: null };
    
  } catch {
    return { success: false, image: null };
  }
}

function getAnalysisPrompt(analysisType: string): string {
  if (analysisType === 'color') {
    return `You are an expert hair colorist. Analyze this person's photo.

Determine:
1. Skin tone (fair/light/medium/olive/tan/deep)
2. Undertone (warm/cool/neutral)
3. Eye color
4. Current hair color
5. Color season (Spring/Summer/Autumn/Winter)

Recommend 6 hair colors that would complement their natural coloring.
Only recommend colors achievable from their current hair.

Return ONLY valid JSON:
{
  "skinTone": "string",
  "undertone": "warm/cool/neutral",
  "eyeColor": "string",
  "season": "Spring/Summer/Autumn/Winter",
  "currentHair": {
    "color": "string",
    "estimatedLength": "short/medium/long",
    "texture": "straight/wavy/curly"
  },
  "recommendations": [
    {
      "name": "Color Name",
      "hexCode": "#RRGGBB",
      "technique": "balayage/highlights/full color/ombre",
      "description": "Why this complements their coloring",
      "suitabilityScore": 0.95,
      "maintenanceLevel": "Low/Medium/High",
      "visualDescription": "Detailed description of how this color would look on them"
    }
  ],
  "expertTip": "Personalized advice"
}`;
  }

  return `You are an expert hairstylist analyzing this person for haircut recommendations.

ANALYZE CAREFULLY:
1. FACE SHAPE: Identify precisely (oval/round/square/heart/oblong/diamond/rectangle)
2. FACIAL GEOMETRY:
   - Jawline shape and width
   - Forehead height and width
   - Cheekbone prominence
   - Face length-to-width ratio
3. CURRENT HAIR:
   - Current length (short/medium/long)
   - Texture (straight/wavy/curly/coily)
   - Density (thin/medium/thick)
   - Current style

CRITICAL CONSTRAINT: You can ONLY recommend haircuts that REDUCE or maintain current length.
- If they have short hair, recommend short styles only
- If they have medium hair, recommend short or medium styles
- If they have long hair, recommend any length (but still cutting, not extensions)

Recommend exactly 6 hairstyles that would flatter their face shape and work with their hair type.

Return ONLY valid JSON:
{
  "faceShape": "specific shape",
  "faceAnalysis": {
    "jawline": "description",
    "forehead": "description",
    "cheekbones": "description",
    "faceRatio": "description",
    "bestFeatures": "what to highlight",
    "areasToBalance": "what the haircut should balance"
  },
  "currentHair": {
    "estimatedLength": "short/medium/long",
    "texture": "straight/wavy/curly/coily",
    "density": "thin/medium/thick",
    "currentStyle": "description"
  },
  "recommendations": [
    {
      "name": "Specific Hairstyle Name",
      "description": "Why this flatters their specific face shape and features",
      "cuttingTechnique": "How a stylist would cut this",
      "suitabilityScore": 0.95,
      "lengthChange": "description of length change from current",
      "maintenanceLevel": "Low/Medium/High",
      "stylingTips": ["tip1", "tip2", "tip3"],
      "bestFor": ["occasion1", "occasion2"],
      "visualDescription": "Detailed description: length, layers, framing, parting, how it falls around face"
    }
  ],
  "expertTip": "Personalized advice based on their unique features"
}`;
}
