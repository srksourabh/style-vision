import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini models
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

interface StylistTip {
  stylist_name: string;
  tip: string;
}

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
    stylist_tip: StylistTip;
    description: string;
    prompts: {
      front: string;
      back: string;
    };
  }>;
}

// Utility functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  return cleaned;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`API attempt ${attempt + 1}/${maxRetries}...`);
      const response = await fetch(url, options);
      
      if (response.status >= 500 && response.status < 600) {
        const errorText = await response.text();
        console.error(`Server error ${response.status}:`, errorText.substring(0, 200));
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
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

// Mode-specific prompts
function getAnalysisPrompt(mode: 'hair' | 'bridal' | 'color'): string {
  const baseRole = `### ROLE ###
You are a world-class **Face Morphologist** and **Celebrity Hair Stylist** with 25+ years of experience. You have trained under and collaborated with the world's most renowned hair stylists including:

**LEGENDARY STYLISTS YOU CHANNEL:**
- **Javed Habib** (India) - Known for "No Shortcuts to Success", precision cuts, and making styling accessible
- **Aalim Hakim** (India) - Bollywood's favorite, known for transformative celebrity makeovers
- **Vidal Sassoon** (UK) - Revolutionary geometric cuts, "If you don't look good, we don't look good"
- **Oribe Canales** (USA) - Hollywood red carpet master, texture and movement expert
- **Rossano Ferretti** (Italy) - "The Method" invisible haircut technique, natural elegance
- **Sam McKnight** (UK) - Princess Diana's stylist, British fashion icon maker
- **Guido Palau** (UK) - Fashion week mastermind, avant-garde trendsetter
- **Jen Atkin** (USA) - Kardashian stylist, social media hair icon
- **Yuko Yamashita** (Japan) - Japanese straightening pioneer, Asian hair specialist
- **Kim Sun-young** (Korea) - K-beauty hair trends, glass hair technique`;

  const faceMeasurement = `
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
Determine specific objectives to enhance this face:
- **Add Height**: Does the face need vertical elongation?
- **Create Angles**: Does the face need more angular definition?
- **Slim the Face**: Does the face need narrowing effects?
- **Define Jawline**: Does the jawline need more definition?
- **Balance Proportions**: What needs balancing (forehead/chin ratio, etc.)?
- **Soften Features**: Do any features need softening?`;

  let modeSpecific = '';
  
  if (mode === 'hair') {
    modeSpecific = `
**Step 4: RECOMMEND 6 HAIRSTYLES**
Based on YOUR expert analysis, current global fashion trends (2024-2025), and wisdom from legendary stylists, recommend exactly 6 hairstyles that will:
- ADD HEIGHT where needed through volume placement
- CREATE ANGLES to define facial structure
- SLIM THE FACE through strategic layering and framing
- DEFINE THE JAWLINE through length and texture choices
- CREATE BALANCED APPEARANCE overall

For EACH hairstyle, generate prompts for BOTH front view AND back view.
The styles should be diverse: include classic, modern, trendy, and bold options.`;
  } else if (mode === 'bridal') {
    modeSpecific = `
**Step 4: RECOMMEND 6 BRIDAL HAIRSTYLES**
Based on YOUR expert analysis and bridal fashion trends, recommend exactly 6 BRIDAL/WEDDING hairstyles that will:
- CREATE ELEGANCE suitable for wedding ceremonies
- COMPLEMENT traditional and modern bridal wear (lehenga, saree, gown)
- ADD HEIGHT AND VOLUME for a regal appearance
- FRAME THE FACE beautifully for wedding photography
- ACCOMMODATE bridal accessories (maang tikka, flowers, veil, tiara)

Consider styles like: Elegant updos, romantic curls, braided styles, half-up half-down, traditional buns, modern bridal waves.
For EACH hairstyle, generate prompts for BOTH front view AND back view.`;
  } else if (mode === 'color') {
    modeSpecific = `
**Step 4: RECOMMEND 6 HAIR COLORS**
Based on YOUR expert analysis of their skin tone, face shape, and current color trends, recommend exactly 6 HAIR COLORS that will:
- COMPLEMENT their skin undertone (warm/cool/neutral)
- ENHANCE their facial features through strategic color placement
- ADD DIMENSION through highlights, lowlights, or balayage
- CREATE FACE-FRAMING effects with color
- SUIT their lifestyle (low maintenance vs high fashion)

Consider colors like: Natural shades, balayage, highlights, ombre, fashion colors, dimensional coloring.
For EACH color recommendation, generate prompts for BOTH front view AND back view showing the color from different angles.`;
  }

  const outputFormat = `
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
  "styling_goals": "Specific goals: add height at crown, create angles at temples, slim face with face-framing layers, define jawline with length below chin, balance wide forehead with volume at sides, etc.",
  "hairstyles": [
    {
      "id": 1,
      "name": "AI recommended style/color name",
      "trend_source": "Origin (Korean Bridal, Hollywood Glam, Italian Runway, Bollywood Wedding, etc.)",
      "geometric_reasoning": "How this specifically adds height/creates angles/slims face/defines jawline/balances features",
      "celebrity_reference": "A celebrity with similar face shape who wears this style/color",
      "stylist_tip": {
        "stylist_name": "Name of famous stylist",
        "tip": "Relevant styling tip from this expert"
      },
      "description": "Detailed description",
      "prompts": {
        "front": "Transform the hair to [detailed description]. Maintain all facial features unchanged. [Specific styling goals achieved]. Professional photography, photorealistic, fashion magazine quality.",
        "back": "Back view of the same hairstyle showing [neckline, texture, layers, color placement from behind]. Same person, same style, viewed from behind. Professional photography."
      }
    }
  ]
}`;

  return baseRole + faceMeasurement + modeSpecific + outputFormat;
}

// Step 1: AI Analysis
async function analyzeAndGeneratePrompts(userPhotoBase64: string, mode: 'hair' | 'bridal' | 'color'): Promise<HairstyleAnalysis | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  const aiAnalysisPrompt = getAnalysisPrompt(mode);

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
              { inline_data: { mime_type: "image/jpeg", data: base64Data } }
            ]
          }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
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
    
    if (!data.candidates || data.candidates.length === 0 || data.candidates[0].finishReason === 'SAFETY') {
      console.error('No valid response from Gemini');
      return null;
    }
    
    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const cleanedText = cleanJsonResponse(text);
    console.log('AI Analysis complete for mode:', mode);

    const analysis = JSON.parse(cleanedText) as HairstyleAnalysis;
    console.log('Face Shape:', analysis.face_shape);
    console.log('Styling Goals:', analysis.styling_goals);
    return analysis;

  } catch (error) {
    console.error('Gemini analysis error:', error);
    return null;
  }
}

// Step 2: Generate image (front or back)
async function generateImage(userPhotoBase64: string, prompt: string, styleIndex: number, view: 'front' | 'back'): Promise<string | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    console.log(`Generating style ${styleIndex} ${view} view...`);
    
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: base64Data } },
              { text: prompt }
            ]
          }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 1.0 },
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
    
    if (data.promptFeedback?.blockReason || !data.candidates || data.candidates.length === 0) {
      return null;
    }
    
    if (data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          console.log(`Style ${styleIndex} ${view} - Success`);
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Style ${styleIndex} ${view} error:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhoto, styleIndex, mode = 'hair' } = body;

    if (!userPhoto) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    // Validate mode
    const validMode = ['hair', 'bridal', 'color'].includes(mode) ? mode : 'hair';

    // Step 1: AI Analysis
    console.log(`Step 1: AI analyzing face for ${validMode} mode...`);
    const analysis = await analyzeAndGeneratePrompts(userPhoto, validMode as 'hair' | 'bridal' | 'color');
    
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

    // Prepare styles with prompts
    const stylesToGenerate = analysis.hairstyles.map(h => ({
      name: h.name,
      frontPrompt: h.prompts.front,
      backPrompt: h.prompts.back,
      geometricReasoning: h.geometric_reasoning,
      trendSource: h.trend_source,
      celebrityReference: h.celebrity_reference,
      stylistTip: h.stylist_tip,
      description: h.description
    }));

    const indicesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    // Step 2: Generate BOTH front and back images
    console.log(`Step 2: Generating ${indicesToGenerate.length} styles with front & back views...`);
    
    for (const idx of indicesToGenerate) {
      if (idx >= stylesToGenerate.length) continue;
      
      const style = stylesToGenerate[idx];
      console.log(`Generating: ${style.name}`);
      
      // Generate front view
      const frontImage = await generateImage(userPhoto, style.frontPrompt, idx, 'front');
      
      // Generate back view
      const backImage = await generateImage(userPhoto, style.backPrompt, idx, 'back');
      
      results.push({
        styleIndex: idx,
        styleName: style.name,
        frontImage,
        backImage,
        geometricReasoning: style.geometricReasoning,
        trendSource: style.trendSource,
        celebrityReference: style.celebrityReference,
        stylistTip: style.stylistTip,
        description: style.description,
        error: frontImage ? null : 'Generation failed'
      });
      
      if (indicesToGenerate.length > 1 && idx !== indicesToGenerate[indicesToGenerate.length - 1]) {
        await sleep(300);
      }
    }

    const successCount = results.filter(r => r.frontImage).length;
    console.log(`Complete: ${successCount}/${results.length} generated`);
    
    return NextResponse.json({
      success: successCount > 0,
      mode: validMode,
      faceAnalysis,
      results,
      message: successCount > 0 
        ? `Generated ${successCount} personalized styles with front & back views`
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
