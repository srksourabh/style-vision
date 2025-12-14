import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini models
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

interface HairstyleAnalysis {
  face_shape: string;
  face_analysis: {
    forehead: string;
    jawline: string;
    cheekbones: string;
    face_length: string;
    symmetry: string;
  };
  styling_strategy: string;
  hairstyles: Array<{
    id: number;
    name: string;
    trend_origin: string;
    why_it_works: string;
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
  // Remove ```json and ``` markdown fences
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Try to extract JSON object if there's surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

// Utility: Retry with exponential backoff for server errors (500, 502, 503)
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`API attempt ${attempt + 1}/${maxRetries}...`);
      const response = await fetch(url, options);
      
      // Server-side errors (500, 502, 503) - retry with backoff
      if (response.status >= 500 && response.status < 600) {
        const errorText = await response.text();
        console.error(`Server error ${response.status}:`, errorText.substring(0, 200));
        
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
          console.log(`Waiting ${waitTime/1000}s before retry...`);
          await sleep(waitTime);
          continue;
        }
        throw new Error(`Server error ${response.status} after ${maxRetries} attempts`);
      }
      
      // Client-side errors (400, 401, 403) - don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        console.error(`Client error ${response.status} (not retrying):`, errorText.substring(0, 200));
        throw new Error(`Client error ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
      return response;
      
    } catch (error) {
      // Network errors - retry
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`Network error on attempt ${attempt + 1}:`, error);
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime/1000}s before retry...`);
          await sleep(waitTime);
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

// Step 1: Analyze face with AI-driven hairstyle recommendation
async function analyzeAndGeneratePrompts(userPhotoBase64: string): Promise<HairstyleAnalysis | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  // AI-DRIVEN PROMPT - Let Gemini analyze and recommend based on fashion trends
  const aiDrivenPrompt = `### CONTEXT ###
You are a world-renowned **Celebrity Hair Stylist and Face Morphologist** with expertise in global fashion trends from Milan, Paris, New York, Tokyo, and Seoul. You have styled A-list celebrities and understand how to match hairstyles to facial geometry using the Golden Ratio principles.

### YOUR TASK ###
1. **ANALYZE** the uploaded photo's facial structure in detail:
   - Measure the face shape (Oval, Round, Square, Diamond, Heart, Oblong, Rectangle)
   - Assess forehead width and height
   - Evaluate jawline definition (sharp, soft, angular, rounded)
   - Note cheekbone prominence
   - Determine face length-to-width ratio
   - Check facial symmetry

2. **RECOMMEND** exactly 6 hairstyles that would BEST SUIT this specific face based on:
   - **Golden Ratio principles** for facial balance
   - **Current global fashion trends** (2024-2025 runway looks)
   - **Celebrity stylist techniques** for enhancing features
   - **Face-flattering geometry** (what to elongate, soften, or add volume to)
   
   YOU decide which hairstyles to recommend - choose styles that will genuinely transform and flatter THIS person's unique facial structure.

3. **EXPLAIN** for each style WHY it works for this face (geometric reasoning).

### CRITICAL INSTRUCTIONS ###
- Do NOT use generic recommendations. Each suggestion must be specifically tailored to THIS face.
- Consider what features to enhance vs. balance (e.g., strong jaw needs softer top, round face needs height)
- Include a mix of classic and trendy options
- Keep descriptions clinical and geometric for safety compliance

### OUTPUT FORMAT (STRICT) ###
- Output **ONLY** raw JSON.
- **DO NOT** use Markdown code blocks (no \`\`\`json or \`\`\`).
- **DO NOT** include any conversational text before or after the JSON.

**JSON Schema:**
{
  "face_shape": "Detected face shape",
  "face_analysis": {
    "forehead": "Width and height assessment",
    "jawline": "Shape and definition",
    "cheekbones": "Prominence level",
    "face_length": "Long/Medium/Short relative to width",
    "symmetry": "Symmetry notes"
  },
  "styling_strategy": "Overall strategy for this face - what to enhance, balance, or soften",
  "hairstyles": [
    {
      "id": 1,
      "name": "Specific Hairstyle Name",
      "trend_origin": "Where this trend comes from (e.g., Korean Wave, Italian Classic, NYC Street)",
      "why_it_works": "2-3 sentences explaining geometrically WHY this suits their face shape",
      "description": "Brief style description",
      "prompts": {
        "front": "Transform the hair to [exact style description]. Maintain all facial features exactly unchanged. The hairstyle should [specific details about length, texture, volume placement]. Professional studio lighting, photorealistic, high fashion photography.",
        "back": "Back view showing [neckline, taper, texture details]"
      }
    }
  ]
}

### INPUT ###
Analyze this person's face and recommend 6 hairstyles that would best suit their unique facial geometry based on current fashion trends and professional styling principles.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: aiDrivenPrompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.8,
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
    
    // CHECK 1: Safety filter block
    if (data.promptFeedback?.blockReason) {
      console.error(`Gemini blocked request: ${data.promptFeedback.blockReason}`);
      return null;
    }
    
    // CHECK 2: No candidates returned
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in Gemini response');
      return null;
    }
    
    // CHECK 3: Candidate was blocked
    if (data.candidates[0].finishReason === 'SAFETY') {
      console.error('Response blocked by safety filter');
      return null;
    }
    
    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No text in Gemini response');
      return null;
    }

    // CLEAN THE JSON: Remove markdown code blocks
    const cleanedText = cleanJsonResponse(text);
    console.log('Cleaned JSON (first 300 chars):', cleanedText.substring(0, 300));

    // Parse safely
    const analysis = JSON.parse(cleanedText) as HairstyleAnalysis;
    console.log('Face analysis complete:', analysis.face_shape);
    console.log('Styling strategy:', analysis.styling_strategy);
    return analysis;

  } catch (error) {
    console.error('Gemini analysis error:', error);
    return null;
  }
}

// Step 2: Generate hairstyle image using Gemini image generation
async function generateHairstyleWithGemini(
  userPhotoBase64: string, 
  prompt: string,
  styleIndex: number
): Promise<string | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    console.log(`Generating style ${styleIndex} with Gemini image model...`);
    
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
              {
                text: prompt
              }
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
    
    // CHECK: Safety filter block
    if (data.promptFeedback?.blockReason) {
      console.error(`Style ${styleIndex} blocked: ${data.promptFeedback.blockReason}`);
      return null;
    }
    
    // CHECK: No candidates or safety blocked
    if (!data.candidates || data.candidates.length === 0) {
      console.error(`Style ${styleIndex} - No candidates returned`);
      return null;
    }
    
    if (data.candidates[0].finishReason === 'SAFETY') {
      console.error(`Style ${styleIndex} - Blocked by safety filter`);
      return null;
    }
    
    // Extract image from response
    if (data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          console.log(`Style ${styleIndex} - Image generated successfully`);
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.error(`Style ${styleIndex} - No image in response`);
    return null;
    
  } catch (error) {
    console.error(`Style ${styleIndex} generation error:`, error);
    return null;
  }
}

// Fallback prompts only used if AI analysis completely fails
const FALLBACK_STYLES = [
  { name: "Modern Textured Style", prompt: "Transform this person's hair to a modern textured hairstyle that complements their face shape. Keep facial features unchanged. Professional, photorealistic." },
  { name: "Classic Refined Look", prompt: "Transform this person's hair to a classic refined hairstyle suited to their face geometry. Keep facial features unchanged. Professional, photorealistic." },
  { name: "Trending Fashion Cut", prompt: "Transform this person's hair to a current trending fashion hairstyle that flatters their face. Keep facial features unchanged. Professional, photorealistic." },
  { name: "Volume Enhanced Style", prompt: "Transform this person's hair to add volume where needed for facial balance. Keep facial features unchanged. Professional, photorealistic." },
  { name: "Sleek Contemporary", prompt: "Transform this person's hair to a sleek contemporary style suited to their features. Keep facial features unchanged. Professional, photorealistic." },
  { name: "Natural Textured Look", prompt: "Transform this person's hair to a natural textured look that enhances their face shape. Keep facial features unchanged. Professional, photorealistic." }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhoto, styleIndex } = body;

    if (!userPhoto) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'GEMINI_API_KEY not configured' 
      }, { status: 500 });
    }

    // Step 1: AI analyzes face and recommends personalized hairstyles
    console.log('Step 1: AI analyzing face pattern and recommending trend-based hairstyles...');
    const analysis = await analyzeAndGeneratePrompts(userPhoto);
    
    let stylesToGenerate: Array<{ name: string; prompt: string; whyItWorks?: string; trendOrigin?: string }>;
    let faceAnalysis = null;

    if (analysis && analysis.hairstyles?.length >= 6) {
      console.log('AI recommendations received successfully');
      faceAnalysis = {
        shape: analysis.face_shape,
        details: analysis.face_analysis,
        strategy: analysis.styling_strategy
      };
      stylesToGenerate = analysis.hairstyles.map(h => ({
        name: h.name,
        prompt: h.prompts.front,
        whyItWorks: h.why_it_works,
        trendOrigin: h.trend_origin
      }));
    } else {
      console.log('Using fallback - AI analysis incomplete');
      stylesToGenerate = FALLBACK_STYLES;
    }

    // Filter to specific style if requested
    const indicesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    // Step 2: Generate images with Gemini
    console.log(`Step 2: Generating ${indicesToGenerate.length} AI-recommended hairstyles...`);
    
    for (const idx of indicesToGenerate) {
      const style = stylesToGenerate[idx] || FALLBACK_STYLES[idx];
      console.log(`Generating style ${idx}: ${style.name}`);
      
      const imageUrl = await generateHairstyleWithGemini(userPhoto, style.prompt, idx);
      
      results.push({
        styleIndex: idx,
        styleName: style.name,
        image: imageUrl,
        whyItWorks: style.whyItWorks || null,
        trendOrigin: style.trendOrigin || null,
        description: analysis?.hairstyles?.[idx]?.description || null,
        error: imageUrl ? null : 'Generation failed - try a different photo'
      });
      
      // Small delay between requests to avoid rate limiting
      if (indicesToGenerate.length > 1 && idx !== indicesToGenerate[indicesToGenerate.length - 1]) {
        await sleep(500);
      }
    }

    const successCount = results.filter(r => r.image).length;
    console.log(`Generation complete: ${successCount}/${results.length} successful`);
    
    return NextResponse.json({
      success: successCount > 0,
      faceAnalysis,
      results,
      message: successCount > 0 
        ? `Generated ${successCount}/${results.length} personalized hairstyles`
        : 'Failed to generate styles. Please try a different photo.'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate styles. Please try a different photo.'
    }, { status: 500 });
  }
}
