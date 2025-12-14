import { NextRequest, NextResponse } from 'next/server';

// Replicate API for HairFastGAN hairstyle transfer
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

export async function POST(request: NextRequest) {
  try {
    const { userPhoto, hairstyleRef } = await request.json();

    const replicateKey = process.env.REPLICATE_API_KEY;
    
    if (!replicateKey) {
      return NextResponse.json({ 
        error: 'Replicate API key not configured. Add REPLICATE_API_KEY to environment variables.',
        needsKey: true 
      }, { status: 500 });
    }

    // Use HairFastGAN model on Replicate
    // Model: AIRI-Institute/HairFastGAN (via various implementations)
    const response = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Using style-your-hair model which does hairstyle transfer
        version: "a]string", // Will be updated with actual version
        input: {
          face_image: userPhoto,
          hair_image: hairstyleRef,
        }
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Replicate error:', err);
      return NextResponse.json({ error: 'Hairstyle transfer failed' }, { status: 500 });
    }

    const prediction = await response.json();
    
    // Poll for result
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(result.urls.get, {
        headers: { 'Authorization': `Token ${replicateKey}` }
      });
      result = await pollRes.json();
    }

    if (result.status === 'failed') {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      image: result.output
    });

  } catch (error) {
    console.error('Hairstyle transfer error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
