import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini models
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

interface HairstyleAnalysis {
  face_shape: string;
  reasoning: string;
  hairstyles: Array<{
    id: number;
    name: string;
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

// Step 1: Analyze face with bulletproof prompt
async function analyzeAndGeneratePrompts(userPhotoBase64: string): Promise<HairstyleAnalysis | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  // BULLETPROOF PROMPT - strict JSON output, no markdown
  const bulletproofPrompt = `### CONTEXT ###
You are the world's leading **Face Morphologist and Virtual Stylist**. You are a backend processor for a software application. Your output is read directly by code, so strict formatting is required.

### OBJECTIVE ###
Analyze the attached user photo and generate a JSON object containing **six (6) distinct hairstyle recommendations** optimized for their facial geometry.

### CRITICAL INSTRUCTIONS ###
1. **Analyze** the face shape (Oval, Round, Square, Diamond, Heart, Oblong) based on landmarks.
2. **Select** 6 modern, distinct hairstyles that complement the face shape.
3. **Generate** image generation prompts for "Front View" for each style.
4. **Avoid** sensitive terms. Keep descriptions clinical and geometric (e.g., "features a high fade") rather than biological or anatomical to ensure safety compliance.

### OUTPUT FORMAT (STRICT) ###
- Output **ONLY** raw JSON.
- **DO NOT** use Markdown code blocks (no \`\`\`json or \`\`\`).
- **DO NOT** include any conversational text before or after the JSON.

**JSON Schema:**
{
  "face_shape": "String",
  "reasoning": "String explaining why these styles suit this face shape",
  "hairstyles": [
    {
      "id": 1,
      "name": "Hairstyle Name",
      "description": "Brief description of the style",
      "prompts": {
        "front": "Transform the hair to [style]. Maintain exact facial features unchanged. Professional studio lighting, photorealistic.",
        "back": "Back view description of the hairstyle"
      }
    }
  ]
}

### INPUT ###
Analyze this photo and provide 6 hairstyle recommendations.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: bulletproofPrompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
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
    console.log('Cleaned JSON (first 200 chars):', cleanedText.substring(0, 200));

    // Parse safely
    const analysis = JSON.parse(cleanedText) as HairstyleAnalysis;
    console.log('Face analysis complete:', analysis.face_shape);
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

// Fallback prompts if Gemini analysis fails
const FALLBACK_STYLES = [
  { name: "Classic Side Part", prompt: "Transform this person's hair to a classic side part hairstyle. Keep the exact same face unchanged. Hair neatly combed to one side with a clean defined part line. Professional, photorealistic." },
  { name: "Textured Crop", prompt: "Transform this person's hair to a modern textured crop hairstyle. Keep the exact same face unchanged. Short faded sides with textured messy top. Professional, photorealistic." },
  { name: "Slicked Back", prompt: "Transform this person's hair to a slicked back hairstyle. Keep the exact same face unchanged. Hair combed straight back with gel for a sophisticated look. Professional, photorealistic." },
  { name: "Undercut", prompt: "Transform this person's hair to an undercut hairstyle. Keep the exact same face unchanged. Very short buzzed sides with longer styled hair on top. Professional, photorealistic." },
  { name: "Crew Cut", prompt: "Transform this person's hair to a crew cut hairstyle. Keep the exact same face unchanged. Short military style with hair short all around. Professional, photorealistic." },
  { name: "Spiky Textured", prompt: "Transform this person's hair to a spiky textured hairstyle. Keep the exact same face unchanged. Hair styled upward in spikes with texture. Professional, photorealistic." }
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

    // Step 1: Analyze face and get personalized prompts from Gemini
    console.log('Step 1: Analyzing face with Gemini (bulletproof prompt)...');
    const analysis = await analyzeAndGeneratePrompts(userPhoto);
    
    let stylesToGenerate: Array<{ name: string; prompt: string }>;
    let faceAnalysis = null;

    if (analysis && analysis.hairstyles?.length >= 6) {
      console.log('Using Gemini-generated personalized prompts');
      faceAnalysis = {
        shape: analysis.face_shape,
        reasoning: analysis.reasoning
      };
      stylesToGenerate = analysis.hairstyles.map(h => ({
        name: h.name,
        prompt: h.prompts.front
      }));
    } else {
      console.log('Using fallback prompts (analysis failed or incomplete)');
      stylesToGenerate = FALLBACK_STYLES;
    }

    // Filter to specific style if requested
    const indicesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    // Step 2: Generate images with Gemini
    console.log(`Step 2: Generating ${indicesToGenerate.length} hairstyles with Gemini...`);
    
    for (const idx of indicesToGenerate) {
      const style = stylesToGenerate[idx] || FALLBACK_STYLES[idx];
      console.log(`Generating style ${idx}: ${style.name}`);
      
      const imageUrl = await generateHairstyleWithGemini(userPhoto, style.prompt, idx);
      
      results.push({
        styleIndex: idx,
        styleName: style.name,
        image: imageUrl,
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
        ? `Generated ${successCount}/${results.length} hairstyles`
        : 'Failed to generate styles. Please try a different photo.'
    });

  } catch (error) {
    console.error('API error:', error);
    // Return graceful error, not a crash
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate styles. Please try a different photo.'
    }, { status: 500 });
  }
}
