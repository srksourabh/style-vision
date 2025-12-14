import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const HAIRSTYLE_NAMES = [
  "Classic Side Part",
  "Textured Crop", 
  "Slicked Back",
  "Undercut",
  "Crew Cut",
  "Spiky Textured"
];

async function generateAllHairstyles(userPhotoBase64: string): Promise<string | null> {
  // Remove data URL prefix if present
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    // Use Gemini 3 Pro Image Preview (Nano Banana Pro) - same as Gemini mobile app
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
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
                text: `please create 6 images for my new hairstyle:

1. Classic Side Part - hair neatly combed to one side with a clean part line
2. Textured Crop - short faded sides with textured messy top
3. Slicked Back - hair combed straight back with gel, sophisticated look
4. Undercut - very short buzzed sides with longer styled hair on top
5. Crew Cut - short all around military style buzz cut
6. Spiky Textured - hair styled upward in spikes

Show me how I would look with each hairstyle. Create a grid showing all 6 styles.`
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
      console.error(`Gemini 3 Pro Image API error:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Gemini 3 Pro Image response:', JSON.stringify(data).substring(0, 500));
    
    // Extract image from response
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.error('No image in Gemini response');
    return null;
    
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

async function generateSingleHairstyle(userPhotoBase64: string, styleIndex: number): Promise<string | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  const styleName = HAIRSTYLE_NAMES[styleIndex];
  
  const styleDescriptions: Record<number, string> = {
    0: "classic side part hairstyle with hair neatly combed to one side and a clean defined part line",
    1: "modern textured crop with short faded sides and textured messy top",
    2: "slicked back hairstyle with hair combed straight back using gel for a sophisticated look",
    3: "undercut hairstyle with very short buzzed sides and longer styled hair on top",
    4: "crew cut military style with hair short all around",
    5: "spiky textured hairstyle with hair styled upward in spikes"
  };
  
  try {
    // Use Gemini 3 Pro Image Preview (Nano Banana Pro)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`,
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
                text: `Create 1 image showing me with a ${styleDescriptions[styleIndex]}. Show how I would look with ${styleName} hairstyle.`
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
      console.error(`Style ${styleIndex} error:`, await response.text());
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
    console.error(`Style ${styleIndex} error:`, error);
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
    const { userPhoto, styleIndex, mode } = body;

    if (!userPhoto) {
      return NextResponse.json({ 
        success: false, 
        error: 'No photo provided' 
      }, { status: 400 });
    }

    // Mode 'grid' = single image with all 6 styles (like Gemini app)
    // Mode 'individual' or default = generate each style separately
    if (mode === 'grid') {
      console.log('Generating grid of all 6 hairstyles with Gemini 3 Pro Image...');
      const gridImage = await generateAllHairstyles(userPhoto);
      
      return NextResponse.json({
        success: !!gridImage,
        gridImage,
        message: gridImage ? 'Generated hairstyle grid' : 'Generation failed'
      });
    }

    // Generate specific style or all styles individually
    const stylesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    for (const idx of stylesToGenerate) {
      console.log(`Generating style ${idx}: ${HAIRSTYLE_NAMES[idx]} with Gemini 3 Pro Image...`);
      
      const imageUrl = await generateSingleHairstyle(userPhoto, idx);
      
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
