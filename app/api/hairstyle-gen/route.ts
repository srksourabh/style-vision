import { NextRequest, NextResponse } from 'next/server';

// Gemini 2.0 Flash with image generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Different hairstyles to try - optimized for men's cuts
const HAIRSTYLES = [
  {
    name: "Classic Side Part",
    prompt: "Edit this photo to give the person a classic side part hairstyle - hair parted on the left side, neatly combed, with a clean fade on the sides. Keep the EXACT same face, skin, features, and background. Only change the hair."
  },
  {
    name: "Textured Crop",
    prompt: "Edit this photo to give the person a textured crop hairstyle - short on sides with textured, slightly messy top. Keep the EXACT same face, skin, features, and background. Only change the hair."
  },
  {
    name: "Slicked Back",
    prompt: "Edit this photo to give the person a slicked back hairstyle - hair combed backward with a polished wet look, clean sides. Keep the EXACT same face, skin, features, and background. Only change the hair."
  },
  {
    name: "Undercut with Volume",
    prompt: "Edit this photo to give the person an undercut hairstyle - very short/shaved sides with longer voluminous top swept to one side. Keep the EXACT same face, skin, features, and background. Only change the hair."
  },
  {
    name: "Crew Cut",
    prompt: "Edit this photo to give the person a crew cut hairstyle - short all around, slightly longer on top, military-inspired clean cut. Keep the EXACT same face, skin, features, and background. Only change the hair."
  },
  {
    name: "Spiky Textured",
    prompt: "Edit this photo to give the person a spiky textured hairstyle - short sides with spiky, textured top pointing upward. Keep the EXACT same face, skin, features, and background. Only change the hair."
  }
];

export async function POST(request: NextRequest) {
  try {
    const { userPhoto, hairstyleIndex } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Get the hairstyle to apply
    const hairstyle = HAIRSTYLES[hairstyleIndex] || HAIRSTYLES[0];

    // Extract base64 data
    const matches = userPhoto.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const imageData = matches ? matches[2] : userPhoto;

    // Use Gemini 2.0 Flash with image generation
    // Try the preview image generation model first
    const models = [
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.0-flash-exp'
    ];

    let result = null;
    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: hairstyle.prompt
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageData
                    }
                  }
                ]
              }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                temperature: 0.4,
              },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ],
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.error(`Model ${model} error:`, response.status, err);
          lastError = err;
          continue;
        }

        const data = await response.json();
        
        // Check for image in response
        const parts = data.candidates?.[0]?.content?.parts || [];
        
        for (const part of parts) {
          if (part.inlineData) {
            result = {
              success: true,
              hairstyleName: hairstyle.name,
              image: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            };
            break;
          }
        }

        if (result) break;

        // If no image but got text response
        const textPart = parts.find((p: { text?: string }) => p.text);
        if (textPart) {
          console.log('Got text response:', textPart.text?.substring(0, 200));
        }

      } catch (err) {
        console.error(`Model ${model} exception:`, err);
        lastError = err;
      }
    }

    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ 
      error: 'Image generation not available. The model may not support image output for this request.',
      details: lastError
    }, { status: 500 });

  } catch (error) {
    console.error('Hairstyle generation error:', error);
    return NextResponse.json({ error: 'Failed to generate hairstyle' }, { status: 500 });
  }
}

// Get all available hairstyles
export async function GET() {
  return NextResponse.json({
    hairstyles: HAIRSTYLES.map((h, i) => ({ index: i, name: h.name }))
  });
}
