import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_KEY = process.env.REPLICATE_API_TOKEN;

const HAIRSTYLE_NAMES = [
  "Classic Side Part",
  "Textured Crop", 
  "Slicked Back",
  "Undercut",
  "Crew Cut",
  "Spiky Textured"
];

const HAIRSTYLE_PROMPTS: Record<number, string> = {
  0: "change the hairstyle to a classic side part with hair neatly combed to one side with a clean defined part line",
  1: "change the hairstyle to a modern textured crop with short faded sides and textured messy top",
  2: "change the hairstyle to slicked back hair combed straight back with gel for a sophisticated look",
  3: "change the hairstyle to an undercut with very short buzzed sides and longer styled hair on top",
  4: "change the hairstyle to a crew cut military style with hair short all around",
  5: "change the hairstyle to spiky textured hair styled upward in spikes"
};

async function generateWithReplicate(userPhotoBase64: string, styleIndex: number): Promise<string | null> {
  if (!REPLICATE_API_KEY) {
    console.error('REPLICATE_API_TOKEN not configured');
    return null;
  }

  // Remove data URL prefix if present
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  const dataUrl = `data:image/jpeg;base64,${base64Data}`;
  
  const prompt = HAIRSTYLE_PROMPTS[styleIndex];
  
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
      const errorText = await response.text();
      console.error(`Replicate API error:`, errorText);
      return null;
    }

    const prediction = await response.json();
    console.log('Replicate prediction started:', prediction.id);
    
    // Poll for result
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
        }
      });
      
      result = await statusResponse.json();
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`Style ${styleIndex} - Attempt ${attempts}, status: ${result.status}`);
      }
    }
    
    if (result.status === 'succeeded' && result.output) {
      // InstructPix2Pix returns array of images
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      console.log(`Style ${styleIndex} succeeded:`, outputUrl);
      return outputUrl;
    }
    
    console.error(`Style ${styleIndex} failed:`, result.error || 'Unknown error');
    return null;
    
  } catch (error) {
    console.error(`Style ${styleIndex} error:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!REPLICATE_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'REPLICATE_API_TOKEN not configured. Add it to Vercel environment variables.' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { userPhoto, styleIndex } = body;

    if (!userPhoto) {
      return NextResponse.json({ 
        success: false, 
        error: 'No photo provided' 
      }, { status: 400 });
    }

    // Generate specific style or all styles
    const stylesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    for (const idx of stylesToGenerate) {
      console.log(`Generating style ${idx}: ${HAIRSTYLE_NAMES[idx]} with Replicate...`);
      
      const imageUrl = await generateWithReplicate(userPhoto, idx);
      
      results.push({
        styleIndex: idx,
        styleName: HAIRSTYLE_NAMES[idx],
        image: imageUrl,
        error: imageUrl ? null : 'Generation failed'
      });
    }

    const successCount = results.filter(r => r.image).length;
    
    return NextResponse.json({
      success: successCount > 0,
      results,
      message: `Generated ${successCount}/${results.length} hairstyles`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
}
