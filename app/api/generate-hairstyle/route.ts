import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini models
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

interface HairstyleAnalysis {
  face_shape: string;
  face_measurements: {
    forehead_width: string;
    forehead_height: string;
    cheekbone_width: string;
    jawline_width: string;
    jawline_shape: string;
    face_length: string;
    chin_shape: string;
    proportions: string;
  };
  styling_goals: string;
  hairstyles: Array<{
    id: number;
    name: string;
    trend_source: string;
    geometric_reasoning: string;
    celebrity_reference: string;
    description: string;
    prompts: {
      front: string;
      back: string;
    };
  }>;
}

// Utility: Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Clean JSON response - remove markdown code blocks
function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  return cleaned;
}

// Utility: Retry with exponential backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`API attempt ${attempt + 1}/${maxRetries}...`);
      const response = await fetch(url, options);
      
      if (response.status >= 500 && response.status < 600) {
        const errorText = await response.text();
        console.error(`Server error ${response.status}:`, errorText.substring(0, 200));
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime/1000}s before retry...`);
          await sleep(waitTime);
          continue;
        }
        throw new Error(`Server error ${response.status} after ${maxRetries} attempts`);
      }
      
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        console.error(`Client error ${response.status}:`, errorText.substring(0, 200));
        throw new Error(`Client error ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
      return response;
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`Network error on attempt ${attempt + 1}:`, error);
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await sleep(waitTime);
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

// Step 1: Pure AI-driven face analysis and hairstyle recommendation
async function analyzeAndGeneratePrompts(userPhotoBase64: string): Promise<HairstyleAnalysis | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  // PURE AI-DRIVEN PROMPT - No predefined hairstyles, AI decides everything
  const aiAnalysisPrompt = `### ROLE ###
You are a world-class **Face Morphologist** and **Celebrity Hair Stylist** with 25+ years of experience styling Hollywood celebrities, Bollywood stars, K-pop idols, and international models. You have deep expertise in:
- Golden Ratio facial analysis
- Global fashion trends (Milan, Paris, New York, Tokyo, Seoul, Mumbai)
- 2024-2025 runway and red carpet hairstyling
- Face geometry optimization techniques

### TASK ###
**Step 1: MEASURE the face in the uploaded photo**
Perform detailed facial geometry analysis:
- Measure forehead width and height
- Measure cheekbone width (widest point)
- Measure jawline width and shape (angular/soft/square/tapered)
- Calculate face length vs width ratio
- Identify chin shape (pointed/rounded/square)
- Assess overall facial proportions against Golden Ratio

**Step 2: DETERMINE the face shape**
Based on measurements, classify as: Oval, Round, Square, Rectangle, Diamond, Heart, Oblong, or Triangle

**Step 3: IDENTIFY styling goals**
What should the hairstyle achieve for THIS specific face?
- Which features to enhance?
- Which proportions to balance?
- Where to add/reduce visual volume?

**Step 4: RECOMMEND 6 hairstyles**
Based on YOUR expert analysis and current global fashion trends, recommend exactly 6 hairstyles that would BEST SUIT this person's unique facial geometry.

YOU choose the styles - select what will genuinely look best on THIS face based on:
- Current fashion week trends (2024-2025)
- Celebrity styling techniques
- Face-flattering geometry principles
- Cultural style influences (Western, Korean, European, etc.)

### OUTPUT FORMAT (STRICT JSON ONLY) ###
Output ONLY raw JSON. No markdown, no code blocks, no explanation text.

{
  "face_shape": "Detected shape",
  "face_measurements": {
    "forehead_width": "Narrow/Medium/Wide",
    "forehead_height": "Low/Medium/High",
    "cheekbone_width": "Narrow/Medium/Wide + prominence",
    "jawline_width": "Narrow/Medium/Wide",
    "jawline_shape": "Angular/Soft/Square/Rounded/Tapered",
    "face_length": "Short/Medium/Long relative to width",
    "chin_shape": "Pointed/Rounded/Square/V-shaped",
    "proportions": "Golden ratio assessment"
  },
  "styling_goals": "What the hairstyle should achieve for this face - enhance X, balance Y, add volume at Z",
  "hairstyles": [
    {
      "id": 1,
      "name": "Your recommended style name",
      "trend_source": "Where this trend originates (e.g., Korean Fashion, Italian Runway, NYC Street Style)",
      "geometric_reasoning": "Why this specific style works for their face measurements - be specific about how it balances/enhances their features",
      "celebrity_reference": "A celebrity with similar face shape who rocks this style",
      "description": "Detailed description of the hairstyle",
      "prompts": {
        "front": "Transform the hair in this photo to [detailed style description including length, texture, volume placement, parting, finishing]. Keep the face completely unchanged. Professional studio photography, photorealistic, fashion magazine quality.",
        "back": "Back view showing [neckline, taper, layers, texture details]"
      }
    }
  ]
}`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: aiAnalysisPrompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 8192,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      },
      3
    );

    const data = await response.json();
    
    if (data.promptFeedback?.blockReason) {
      console.error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
      return null;
    }
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response');
      return null;
    }
    
    if (data.candidates[0].finishReason === 'SAFETY') {
      console.error('Blocked by safety filter');
      return null;
    }
    
    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('No text in response');
      return null;
    }

    const cleanedText = cleanJsonResponse(text);
    console.log('AI Analysis (first 500 chars):', cleanedText.substring(0, 500));

    const analysis = JSON.parse(cleanedText) as HairstyleAnalysis;
    console.log('Face Shape:', analysis.face_shape);
    console.log('Styling Goals:', analysis.styling_goals);
    console.log('Recommended Styles:', analysis.hairstyles.map(h => h.name).join(', '));
    return analysis;

  } catch (error) {
    console.error('Gemini analysis error:', error);
    return null;
  }
}

// Step 2: Generate hairstyle image
async function generateHairstyleWithGemini(
  userPhotoBase64: string, 
  prompt: string,
  styleIndex: number
): Promise<string | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    console.log(`Generating style ${styleIndex}...`);
    
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 1.0
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      },
      3
    );

    const data = await response.json();
    
    if (data.promptFeedback?.blockReason) {
      console.error(`Style ${styleIndex} blocked: ${data.promptFeedback.blockReason}`);
      return null;
    }
    
    if (!data.candidates || data.candidates.length === 0 || data.candidates[0].finishReason === 'SAFETY') {
      console.error(`Style ${styleIndex} - No valid response`);
      return null;
    }
    
    if (data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          console.log(`Style ${styleIndex} - Success`);
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.error(`Style ${styleIndex} - No image in response`);
    return null;
    
  } catch (error) {
    console.error(`Style ${styleIndex} error:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhoto, styleIndex } = body;

    if (!userPhoto) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    // Step 1: AI measures face and recommends personalized hairstyles
    console.log('Step 1: AI measuring face geometry and selecting best hairstyles...');
    const analysis = await analyzeAndGeneratePrompts(userPhoto);
    
    if (!analysis || !analysis.hairstyles?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not analyze face. Please try a clearer photo with good lighting.' 
      }, { status: 400 });
    }

    const faceAnalysis = {
      shape: analysis.face_shape,
      measurements: analysis.face_measurements,
      stylingGoals: analysis.styling_goals
    };

    const stylesToGenerate = analysis.hairstyles.map(h => ({
      name: h.name,
      prompt: h.prompts.front,
      geometricReasoning: h.geometric_reasoning,
      trendSource: h.trend_source,
      celebrityReference: h.celebrity_reference,
      description: h.description
    }));

    // Filter to specific style if requested
    const indicesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    // Step 2: Generate AI-recommended hairstyles
    console.log(`Step 2: Generating ${indicesToGenerate.length} AI-recommended hairstyles...`);
    
    for (const idx of indicesToGenerate) {
      if (idx >= stylesToGenerate.length) continue;
      
      const style = stylesToGenerate[idx];
      console.log(`Generating: ${style.name}`);
      
      const imageUrl = await generateHairstyleWithGemini(userPhoto, style.prompt, idx);
      
      results.push({
        styleIndex: idx,
        styleName: style.name,
        image: imageUrl,
        geometricReasoning: style.geometricReasoning,
        trendSource: style.trendSource,
        celebrityReference: style.celebrityReference,
        description: style.description,
        error: imageUrl ? null : 'Generation failed'
      });
      
      if (indicesToGenerate.length > 1 && idx !== indicesToGenerate[indicesToGenerate.length - 1]) {
        await sleep(500);
      }
    }

    const successCount = results.filter(r => r.image).length;
    console.log(`Complete: ${successCount}/${results.length} generated`);
    
    return NextResponse.json({
      success: successCount > 0,
      faceAnalysis,
      results,
      message: successCount > 0 
        ? `Generated ${successCount} personalized hairstyles based on your face analysis`
        : 'Could not generate styles. Please try a different photo.'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to analyze. Please try a different photo.'
    }, { status: 500 });
  }
}
