import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini models
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp'; // Image generation model

interface HairstyleAnalysis {
  face_analysis: {
    shape: string;
    key_features: string;
  };
  hairstyles: Array<{
    id: number;
    style_name: string;
    geometry_match_reasoning: string;
    image_generation_prompts: {
      front_view: string;
      back_view: string;
    };
  }>;
}

// Utility: Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        console.error(`Server error ${response.status}:`, errorText);
        
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
        console.error(`Client error ${response.status} (not retrying):`, errorText);
        throw new Error(`Client error ${response.status}: ${errorText}`);
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

// Step 1: Analyze face and generate personalized prompts using Gemini text model
async function analyzeAndGeneratePrompts(userPhotoBase64: string): Promise<HairstyleAnalysis | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  const metaPrompt = `### CONTEXT ###
You are the world's leading **Face Morphologist and Expert Hair Stylist**. You possess a deep understanding of facial geometry, the Golden Ratio, and hair physics. You are assisting a software application that creates virtual makeovers.

### OBJECTIVE ###
Your task is to analyze the user's uploaded photo and generate a structured styling plan consisting of **six (6) distinct, modern hairstyles** that perfectly complement their specific face shape.

### PRE-COMPUTATION REASONING ###
1. **Analyze Face Shape:** Identify if the face is Oval, Round, Square, Diamond, Heart, or Oblong based on jawline, forehead width, and cheekbone prominence.
2. **Determine Constraints:** Focus strictly on aesthetic and geometric analysis. Do not comment on unrelated physical traits.
3. **Select Styles:** Choose 6 diverse styles (e.g., Short Textured, Medium Layered, Long Flowing, Buzz Cut, etc.) that balance the identified face shape.
4. **Draft Explanations:** Formulate a logic for *why* the style works (e.g., "Adds volume on top to elongate a round face").
5. **Visualize Views:** Create detailed visual prompts for generating the hairstyle on this specific person.

### STYLE & TONE ###
- **Style:** Analytical, Fashion-Forward, Descriptive.
- **Tone:** Professional, Encouraging, Objective.
- **Safety Constraint:** Maintain a strictly clinical and aesthetic tone. Focus on hair styling only.

### OUTPUT FORMAT ###
Provide the response **ONLY** as a valid **JSON object**. Do not add markdown formatting (like \`\`\`json) or conversational text outside the JSON.

**JSON Structure:**
{
  "face_analysis": {
    "shape": "Identified Shape",
    "key_features": "Brief description of jawline/forehead geometry"
  },
  "hairstyles": [
    {
      "id": 1,
      "style_name": "Name of Hairstyle",
      "geometry_match_reasoning": "2-3 sentences explaining why this style suits the face shape based on geometry.",
      "image_generation_prompts": {
        "front_view": "Transform this person's hair to a [Style Name] hairstyle. Keep exact same face, skin tone, and facial features unchanged. Only modify the hair to: [detailed hair description including length, texture, styling, and how it frames the face]. Photorealistic, professional studio lighting.",
        "back_view": "Description of how the back/neckline should look for this style."
      }
    }
  ]
}

### INPUT ###
Analyze this person's face and generate 6 personalized hairstyle recommendations.`;

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: metaPrompt },
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
          }
        })
      },
      3 // max retries
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No text in Gemini response');
      return null;
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text.substring(0, 500));
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]) as HairstyleAnalysis;
    console.log('Face analysis complete:', analysis.face_analysis);
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
          }
        })
      },
      3 // max retries
    );

    const data = await response.json();
    console.log(`Style ${styleIndex} response received`);
    
    // Extract image from response
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          console.log(`Style ${styleIndex} - Image generated successfully`);
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    // Check for error in response
    if (data.error) {
      console.error(`Style ${styleIndex} API error:`, data.error);
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
  { name: "Classic Side Part", prompt: "Transform this person's hair to a classic side part hairstyle. Keep the exact same face unchanged. Hair should be neatly combed to one side with a clean defined part line. Professional, photorealistic." },
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
    console.log('Step 1: Analyzing face with Gemini...');
    const analysis = await analyzeAndGeneratePrompts(userPhoto);
    
    let stylesToGenerate: Array<{ name: string; prompt: string }>;
    let faceAnalysis = null;

    if (analysis && analysis.hairstyles?.length >= 6) {
      console.log('Using Gemini-generated personalized prompts');
      faceAnalysis = analysis.face_analysis;
      stylesToGenerate = analysis.hairstyles.map(h => ({
        name: h.style_name,
        prompt: h.image_generation_prompts.front_view
      }));
    } else {
      console.log('Using fallback prompts');
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
        reasoning: analysis?.hairstyles?.[idx]?.geometry_match_reasoning || null,
        error: imageUrl ? null : 'Generation failed'
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
      message: `Generated ${successCount}/${results.length} hairstyles`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}
