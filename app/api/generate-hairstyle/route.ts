import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

// Hairstyle prompts matching the 6 styles in the app
const HAIRSTYLE_PROMPTS = [
  "change the hairstyle to a classic side part with neat combed hair",
  "change the hairstyle to a short textured crop with messy top",
  "change the hairstyle to slicked back hair with pomade shine",
  "change the hairstyle to an undercut with long hair on top",
  "change the hairstyle to a short crew cut military style",
  "change the hairstyle to spiky textured hair pointing upward"
];

export async function POST(request: NextRequest) {
  try {
    if (!REPLICATE_API_KEY) {
      return NextResponse.json({ error: 'Replicate API key not configured' }, { status: 500 });
    }

    const { userPhoto, styleIndex } = await request.json();

    if (!userPhoto) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // If styleIndex is provided, generate only that style
    // Otherwise generate all 6
    const indicesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    
    const results = await Promise.all(
      indicesToGenerate.map(async (idx) => {
        try {
          // Start the prediction
          const response = await fetch(REPLICATE_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Token ${REPLICATE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
              input: {
                image: userPhoto,
                prompt: HAIRSTYLE_PROMPTS[idx],
                num_inference_steps: 20,
                image_guidance_scale: 1.2,
                guidance_scale: 7.5,
              }
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Replicate API error:', error);
            return { styleIndex: idx, error: 'Failed to start generation', image: null };
          }

          const prediction = await response.json();
          
          // Poll for completion
          let result = prediction;
          let attempts = 0;
          const maxAttempts = 60; // 60 seconds max wait
          
          while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const pollResponse = await fetch(result.urls.get, {
              headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
              },
            });
            
            result = await pollResponse.json();
            attempts++;
          }

          if (result.status === 'succeeded' && result.output) {
            // Output is typically an array with one image URL
            const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
            return { styleIndex: idx, image: imageUrl, error: null };
          } else {
            return { styleIndex: idx, error: result.error || 'Generation failed', image: null };
          }
        } catch (err) {
          console.error(`Error generating style ${idx}:`, err);
          return { styleIndex: idx, error: 'Generation error', image: null };
        }
      })
    );

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Generate hairstyle error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
