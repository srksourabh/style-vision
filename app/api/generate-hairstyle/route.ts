import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_KEY = process.env.REPLICATE_API_TOKEN;

// Gemini text model for analysis (works without special permissions)
const GEMINI_ANALYSIS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

// Step 1: Use Gemini to analyze face and generate optimized prompts
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
        "front_view": "Transform the person's hair to a [Style Name] hairstyle. Keep exact same face, skin, and features. Only change the hair to: [detailed hair description including length, texture, styling, and how it frames the face].",
        "back_view": "Description of how the back/neckline should look for this style."
      }
    }
  ]
}

### INPUT ###
Analyze this person's face and generate 6 personalized hairstyle recommendations.`;

  try {
    const response = await fetch(`${GEMINI_ANALYSIS_URL}?key=${GEMINI_API_KEY}`, {
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
    });

    if (!response.ok) {
      console.error('Gemini analysis error:', await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No text in Gemini response');
      return null;
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
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

// Step 2: Generate image with Replicate using the optimized prompt
async function generateWithReplicate(userPhotoBase64: string, prompt: string): Promise<string | null> {
  if (!REPLICATE_API_KEY) {
    console.error('REPLICATE_API_TOKEN not configured');
    return null;
  }

  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  const dataUrl = `data:image/jpeg;base64,${base64Data}`;
  
  try {
    // Use InstructPix2Pix for image editing (preserves face)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
        input: {
          image: dataUrl,
          prompt: prompt,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          image_guidance_scale: 1.5
        }
      })
    });

    if (!response.ok) {
      console.error('Replicate API error:', await response.text());
      return null;
    }

    const prediction = await response.json();
    console.log('Replicate prediction started:', prediction.id);
    
    // Poll for result
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` }
      });
      
      result = await statusResponse.json();
      attempts++;
    }
    
    if (result.status === 'succeeded' && result.output) {
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      return outputUrl;
    }
    
    console.error('Replicate generation failed:', result.error);
    return null;
    
  } catch (error) {
    console.error('Replicate error:', error);
    return null;
  }
}

// Fallback prompts if Gemini analysis fails
const FALLBACK_STYLES = [
  { name: "Classic Side Part", prompt: "change the hairstyle to a classic side part with hair neatly combed to one side with a clean defined part line" },
  { name: "Textured Crop", prompt: "change the hairstyle to a modern textured crop with short faded sides and textured messy top" },
  { name: "Slicked Back", prompt: "change the hairstyle to slicked back hair combed straight back with gel for a sophisticated look" },
  { name: "Undercut", prompt: "change the hairstyle to an undercut with very short buzzed sides and longer styled hair on top" },
  { name: "Crew Cut", prompt: "change the hairstyle to a crew cut military style with hair short all around" },
  { name: "Spiky Textured", prompt: "change the hairstyle to spiky textured hair styled upward in spikes" }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhoto, styleIndex } = body;

    if (!userPhoto) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }

    // Check for required API keys
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'GEMINI_API_KEY not configured' 
      }, { status: 500 });
    }

    if (!REPLICATE_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'REPLICATE_API_TOKEN not configured. Add it to Vercel environment variables.' 
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

    // Step 2: Generate images with Replicate
    console.log(`Step 2: Generating ${indicesToGenerate.length} hairstyles with Replicate...`);
    
    for (const idx of indicesToGenerate) {
      const style = stylesToGenerate[idx] || FALLBACK_STYLES[idx];
      console.log(`Generating style ${idx}: ${style.name}`);
      
      const imageUrl = await generateWithReplicate(userPhoto, style.prompt);
      
      results.push({
        styleIndex: idx,
        styleName: style.name,
        image: imageUrl,
        reasoning: analysis?.hairstyles?.[idx]?.geometry_match_reasoning || null,
        error: imageUrl ? null : 'Generation failed'
      });
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
