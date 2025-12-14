import { NextRequest, NextResponse } from 'next/server';

// Gemini API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Different hairstyles to try - optimized for men's cuts
const HAIRSTYLES = [
  {
    name: "Classic Side Part",
    prompt: "Edit this person's hair to have a classic side part hairstyle - hair neatly parted on the left side, combed smoothly with a clean fade on the sides. Preserve their exact face, skin tone, facial features, expression, and background. ONLY modify the hair."
  },
  {
    name: "Textured Crop",
    prompt: "Edit this person's hair to have a textured crop hairstyle - short textured top with natural movement, short faded sides. Preserve their exact face, skin tone, facial features, expression, and background. ONLY modify the hair."
  },
  {
    name: "Slicked Back",
    prompt: "Edit this person's hair to have a slicked back hairstyle - hair combed backward with a polished wet look, clean tapered sides. Preserve their exact face, skin tone, facial features, expression, and background. ONLY modify the hair."
  },
  {
    name: "Undercut with Volume",
    prompt: "Edit this person's hair to have an undercut hairstyle - very short/buzzed sides with longer voluminous top swept to one side. Preserve their exact face, skin tone, facial features, expression, and background. ONLY modify the hair."
  },
  {
    name: "Crew Cut",
    prompt: "Edit this person's hair to have a crew cut hairstyle - short all around, slightly longer on top, clean military-inspired cut. Preserve their exact face, skin tone, facial features, expression, and background. ONLY modify the hair."
  },
  {
    name: "Spiky Textured",
    prompt: "Edit this person's hair to have a spiky textured hairstyle - short faded sides with spiky, textured top pointing upward with product. Preserve their exact face, skin tone, facial features, expression, and background. ONLY modify the hair."
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

    // Models to try in order of preference:
    // 1. Gemini 3 Pro Image (latest, best for character consistency)
    // 2. Gemini 2.0 Flash Preview Image Generation
    // 3. Gemini 2.0 Flash Exp
    const models = [
      'gemini-3-pro-image-preview',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.0-flash-exp'
    ];

    let result = null;
    let lastError = null;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageData
                    }
                  },
                  {
                    text: hairstyle.prompt
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
          console.error(`Model ${model} error:`, response.status, JSON.stringify(err));
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
              model: model,
              image: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
            };
            console.log(`Success with model: ${model}`);
            break;
          }
        }

        if (result) break;

        // If no image but got text response, log it
        const textPart = parts.find((p: { text?: string }) => p.text);
        if (textPart) {
          console.log(`Model ${model} returned text only:`, textPart.text?.substring(0, 300));
          lastError = { message: textPart.text };
        }

      } catch (err) {
        console.error(`Model ${model} exception:`, err);
        lastError = err;
      }
    }

    if (result) {
      return NextResponse.json(result);
    }

    // If we get here, none of the models worked
    const errorMessage = lastError?.error?.message || lastError?.message || 'Image generation not available';
    
    return NextResponse.json({ 
      error: errorMessage,
      details: 'The AI model could not generate an image for this request. This may be due to content policy restrictions on editing photos of people.',
      suggestion: 'Try with a different photo or hairstyle.'
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
