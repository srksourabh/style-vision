import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const HAIRSTYLE_PROMPTS = [
  {
    name: "Classic Side Part",
    prompt: "classic side part hairstyle, hair neatly combed to one side with a clean defined part line, professional polished look"
  },
  {
    name: "Textured Crop", 
    prompt: "modern textured crop hairstyle, short faded sides with textured messy top, casual stylish contemporary look"
  },
  {
    name: "Slicked Back",
    prompt: "slicked back hairstyle, hair combed straight back with gel or pomade, sophisticated elegant businessman look"
  },
  {
    name: "Undercut",
    prompt: "undercut hairstyle, very short buzzed sides with longer styled hair on top, modern edgy trendy look"
  },
  {
    name: "Crew Cut",
    prompt: "classic crew cut hairstyle, short all around military style buzz cut, clean minimal low maintenance look"
  },
  {
    name: "Spiky Textured",
    prompt: "spiky textured hairstyle, hair styled upward in spikes with styling product, youthful energetic dynamic look"
  }
];

async function generateWithGemini(userPhotoBase64: string, styleIndex: number): Promise<string | null> {
  const style = HAIRSTYLE_PROMPTS[styleIndex];
  
  // Remove data URL prefix if present
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    // Using Gemini 2.0 Flash Experimental with image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              },
              {
                text: `Edit this photo to change ONLY the hairstyle. Keep the EXACT same person - same face, eyes, nose, mouth, skin tone, facial features, expression, clothing, and background. 

Change the hair to: ${style.prompt}

This is a photo editing task - the output must be the same person from the input photo, just with a different hairstyle. Do not generate a new person.`
              }
            ]
          }],
          generationConfig: {
            responseModalities: ["image", "text"]
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error for style ${styleIndex}:`, errorText);
      
      // Try alternate model
      return await tryAlternateModel(base64Data, styleIndex);
    }

    const data = await response.json();
    
    // Extract image from response
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.error(`No image in response for style ${styleIndex}`);
    return await tryAlternateModel(base64Data, styleIndex);
    
  } catch (error) {
    console.error(`Error generating style ${styleIndex}:`, error);
    return null;
  }
}

async function tryAlternateModel(base64Data: string, styleIndex: number): Promise<string | null> {
  const style = HAIRSTYLE_PROMPTS[styleIndex];
  
  try {
    // Try gemini-2.0-flash-exp
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              },
              {
                text: `Generate a new version of this exact same person with a ${style.prompt}. Keep everything identical except change their hairstyle. Output the edited image.`
              }
            ]
          }],
          generationConfig: {
            responseModalities: ["image", "text"]
          }
        })
      }
    );

    if (!response.ok) {
      console.error(`Alternate model error:`, await response.text());
      return null;
    }

    const data = await response.json();
    
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Alternate model error:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'GEMINI_API_KEY not configured' 
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
      console.log(`Generating style ${idx}: ${HAIRSTYLE_PROMPTS[idx].name}`);
      
      const imageUrl = await generateWithGemini(userPhoto, idx);
      
      results.push({
        styleIndex: idx,
        styleName: HAIRSTYLE_PROMPTS[idx].name,
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
