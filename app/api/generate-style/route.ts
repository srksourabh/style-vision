import { NextRequest, NextResponse } from 'next/server';

// Use Gemini 2.0 Flash Experimental for image generation
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { userPhoto, hairstyleName, hairstyleDescription, visualDescription } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Extract base64 from user photo
    const matches = userPhoto.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const imageData = matches ? matches[2] : userPhoto;

    // Prompt for generating hairstyle visualization
    const prompt = `You are a professional hairstyle visualization expert. 

Look at this person's photo carefully. Generate a NEW photorealistic image showing this EXACT SAME PERSON with a "${hairstyleName}" hairstyle applied.

HAIRSTYLE DETAILS:
${hairstyleDescription}

VISUAL SPECIFICATIONS:
${visualDescription}

CRITICAL REQUIREMENTS:
1. Keep the SAME face, skin tone, facial features, and expression
2. Only modify the hair - apply the described hairstyle
3. Make it look like a real photograph, not AI-generated
4. Maintain the same lighting and background style
5. The result should look like what they would see after visiting a salon
6. This is a HAIRCUT visualization - only remove/reshape hair, don't add length

Generate a single photorealistic image of this person with the new hairstyle.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseModalities: ["TEXT", "IMAGE"],
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Image generation error:', response.status, errorData);
      return NextResponse.json(
        { error: `Generation failed: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Look for image in the response
    const parts = result.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inline_data?.mime_type?.startsWith('image/')) {
        // Found generated image
        const generatedImage = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
        return NextResponse.json({ 
          success: true, 
          image: generatedImage,
          hairstyle: hairstyleName 
        });
      }
    }

    // No image generated - return text description instead
    const textResponse = parts.find((p: { text?: string }) => p.text)?.text || '';
    return NextResponse.json({ 
      success: false, 
      message: 'Image generation not available for this request',
      textDescription: textResponse,
      hairstyle: hairstyleName
    });

  } catch (error) {
    console.error('Generate visualization error:', error);
    return NextResponse.json(
      { error: 'Failed to generate visualization' },
      { status: 500 }
    );
  }
}
