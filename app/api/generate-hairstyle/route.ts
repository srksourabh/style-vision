import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp';

interface StylistTip {
  stylist_name: string;
  tip: string;
}

interface StyleAnalysis {
  face_shape: string;
  face_measurements: {
    forehead_width: string;
    forehead_height: string;
    cheekbone_width: string;
    jawline_width: string;
    jawline_shape: string;
    face_length: string;
    chin_shape: string;
    proportions: string;
  };
  skin_tone?: string;
  styling_goals: string;
  styles: Array<{
    id: number;
    name: string;
    trend_source: string;
    geometric_reasoning: string;
    celebrity_reference: string;
    stylist_tip: StylistTip;
    description: string;
    prompts: {
      front: string;
      back: string;
    };
  }>;
}

// Bridal categories
const BRIDAL_CATEGORIES = {
  // Indian Regional
  bengali: { name: 'Bengali', region: 'Indian', description: 'Traditional Bengali bride with alta, white-red saree, shakha-pola bangles, large red bindi, gold jewelry' },
  assamese: { name: 'Assamese', region: 'Indian', description: 'Assamese bride with mekhela chador, traditional gamkharu jewelry, kopou phool, subtle makeup' },
  gujarati: { name: 'Gujarati', region: 'Indian', description: 'Gujarati bride with bandhani saree, maang tikka, nath, heavy kundan jewelry, colorful makeup' },
  kashmiri: { name: 'Kashmiri', region: 'Indian', description: 'Kashmiri bride with pheran, dejhoor headgear, athoor earrings, subtle pink-red makeup' },
  punjabi: { name: 'Punjabi', region: 'Indian', description: 'Punjabi bride with red lehenga, heavy gold jewelry, choora bangles, kaleere, bold makeup' },
  south_indian: { name: 'South Indian', region: 'Indian', description: 'South Indian bride with silk saree, temple jewelry, jasmine gajra, traditional gold' },
  marathi: { name: 'Marathi', region: 'Indian', description: 'Marathi bride with nauvari saree, mundavalya, nath, green bangles, traditional makeup' },
  rajasthani: { name: 'Rajasthani', region: 'Indian', description: 'Rajasthani bride with heavy lehenga, borla maang tikka, aad necklace, bold red-orange makeup' },
  odia: { name: 'Odia', region: 'Indian', description: 'Odia bride with sambalpuri saree, traditional gold jewelry, red-white theme' },
  bihari: { name: 'Bihari', region: 'Indian', description: 'Bihari bride with red saree, maang tikka, shringar, traditional gold ornaments' },
  
  // Religious
  hindu: { name: 'Hindu Traditional', region: 'Religious', description: 'Traditional Hindu bride with sindoor, mangalsutra, red attire, gold jewelry, traditional makeup' },
  muslim: { name: 'Muslim Nikah', region: 'Religious', description: 'Muslim bride with sharara/gharara, hijab styling option, subtle elegant makeup, pearl jewelry' },
  christian: { name: 'Christian', region: 'Religious', description: 'Christian bride with white gown, veil, tiara, elegant Western makeup, subtle jewelry' },
  sikh: { name: 'Sikh Anand Karaj', region: 'Religious', description: 'Sikh bride with red/pink lehenga, kalgi, choora, kundan jewelry, radiant makeup' },
  parsi: { name: 'Parsi', region: 'Religious', description: 'Parsi bride with white saree, mathubanu headpiece, subtle elegant makeup' },
  
  // International
  western: { name: 'Western', region: 'International', description: 'Western bride with white gown, veil, tiara, natural glam makeup, diamond jewelry' },
  korean: { name: 'Korean', region: 'International', description: 'Korean bride with hanbok or modern dress, glass skin makeup, subtle colors, elegant hair' },
  japanese: { name: 'Japanese', region: 'International', description: 'Japanese bride with shiromuku or modern dress, porcelain skin makeup, red lips option' },
  chinese: { name: 'Chinese', region: 'International', description: 'Chinese bride with qipao/red dress, phoenix crown option, red-gold theme makeup' },
  spanish: { name: 'Spanish', region: 'International', description: 'Spanish bride with mantilla veil, flamenco-inspired, bold red lips, dramatic eyes' },
  italian: { name: 'Italian', region: 'International', description: 'Italian bride with elegant gown, romantic soft glam makeup, classic beauty' },
  greek: { name: 'Greek', region: 'International', description: 'Greek bride with goddess-style draping, olive branch accents, natural Mediterranean glow' },
  arabic: { name: 'Arabic', region: 'International', description: 'Arabic bride with dramatic eyes, gold accents, luxurious kaftan, heavy jewelry' },
  african: { name: 'African', region: 'International', description: 'African bride with vibrant colors, headwrap/gele, bold patterns, radiant skin' },
  thai: { name: 'Thai', region: 'International', description: 'Thai bride with traditional Thai dress, gold jewelry, elegant Thai makeup' },
  vietnamese: { name: 'Vietnamese', region: 'International', description: 'Vietnamese bride with ao dai, khan dong headpiece, natural elegant makeup' },
  indonesian: { name: 'Indonesian', region: 'International', description: 'Indonesian bride with kebaya, traditional gold accessories, soft glam makeup' },
  filipino: { name: 'Filipino', region: 'International', description: 'Filipino bride with terno/filipiniana, subtle elegant makeup, pearls' },
  mexican: { name: 'Mexican', region: 'International', description: 'Mexican bride with colorful embroidery, flowers in hair, vibrant makeup' },
  russian: { name: 'Russian', region: 'International', description: 'Russian bride with kokoshnik option, elegant gown, classic red lip makeup' }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return cleaned;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && response.status < 600) {
        if (attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw new Error(`Server error ${response.status}`);
      }
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`Client error ${response.status}: ${errorText.substring(0, 100)}`);
      }
      return response;
    } catch (error) {
      if (error instanceof TypeError && attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

function getAnalysisPrompt(mode: string, bridalCategory?: string): string {
  const baseRole = `### ROLE ###
You are a world-class **Face Morphologist** and **Celebrity Stylist** with 25+ years of experience. You have expertise in:

**LEGENDARY STYLISTS YOU CHANNEL:**
- **Javed Habib** (India) - Precision cuts, transformative styling
- **Aalim Hakim** (India) - Bollywood celebrity makeovers
- **Vidal Sassoon** (UK) - Revolutionary geometric cuts
- **Oribe Canales** (USA) - Hollywood red carpet master
- **Bobbi Brown** (USA) - Natural beauty makeup pioneer
- **Charlotte Tilbury** (UK) - Hollywood glamour makeup
- **Pat McGrath** (UK) - Fashion makeup legend
- **Mickey Contractor** (India) - Bollywood makeup master
- **Namrata Soni** (India) - Celebrity bridal makeup artist
- **Ambika Pillai** (India) - Bridal and celebrity stylist`;

  const faceMeasurement = `
### TASK ###
**Step 1: ANALYZE the face**
- Face shape (Oval, Round, Square, Diamond, Heart, Oblong)
- Skin tone and undertone (warm/cool/neutral)
- Eye shape and features
- Lip shape
- Facial proportions

**Step 2: IDENTIFY styling goals**
- Add height where needed
- Create angles and definition
- Slim/contour the face
- Define jawline
- Balance proportions
- Highlight best features`;

  let modeSpecific = '';
  
  if (mode === 'hair') {
    modeSpecific = `
**Step 3: RECOMMEND 6 HAIRSTYLES**
Based on face analysis and global fashion trends (2024-2025), recommend 6 hairstyles that:
- ADD HEIGHT through volume placement
- CREATE ANGLES to define facial structure
- SLIM THE FACE through strategic layering
- DEFINE THE JAWLINE through length and texture
- CREATE BALANCED APPEARANCE

Generate prompts for BOTH front and back views.`;
  } else if (mode === 'bridal' && bridalCategory) {
    const category = BRIDAL_CATEGORIES[bridalCategory as keyof typeof BRIDAL_CATEGORIES];
    const categoryInfo = category || { name: 'Traditional', description: 'Traditional bridal look' };
    
    modeSpecific = `
**Step 3: RECOMMEND 6 ${categoryInfo.name.toUpperCase()} BRIDAL LOOKS**

You are creating **${categoryInfo.name}** bridal makeovers. 
Traditional elements: ${categoryInfo.description}

For each look, you must TRANSFORM THE FACE with:
1. **FULL BRIDAL MAKEUP** - Foundation, contouring, highlighting, blush, eye makeup (eyeshadow, eyeliner, kajal, mascara, false lashes if appropriate), lip color, bindi/decoration as per tradition
2. **BRIDAL HAIRSTYLE** - Traditional or modern hairstyle appropriate for ${categoryInfo.name} bride
3. **JEWELRY & ACCESSORIES** - Maang tikka, nath, earrings, necklace, hair accessories as per ${categoryInfo.name} tradition
4. **COLOR THEME** - Traditional colors for ${categoryInfo.name} bridal look

Each of the 6 looks should be a VARIATION:
- Look 1: Traditional classic ${categoryInfo.name} bridal
- Look 2: Modern fusion ${categoryInfo.name} bridal
- Look 3: Glamorous/bold ${categoryInfo.name} bridal
- Look 4: Subtle/elegant ${categoryInfo.name} bridal
- Look 5: Reception/party ${categoryInfo.name} look
- Look 6: Contemporary ${categoryInfo.name} bridal

Generate prompts that APPLY MAKEUP TO THE FACE - transform the person into a ${categoryInfo.name} bride.`;
  } else if (mode === 'color') {
    modeSpecific = `
**Step 3: RECOMMEND 6 HAIR COLORS**
Based on skin tone analysis and color theory, recommend 6 hair colors that:
- COMPLEMENT their skin undertone
- ENHANCE facial features through color placement
- ADD DIMENSION with highlights/lowlights
- CREATE FACE-FRAMING effects

Generate prompts for BOTH front and back views showing the color.`;
  }

  const outputFormat = `
### OUTPUT FORMAT (STRICT JSON ONLY) ###
Output ONLY raw JSON. No markdown, no code blocks.

{
  "face_shape": "Detected shape",
  "face_measurements": {
    "forehead_width": "Narrow/Medium/Wide",
    "forehead_height": "Low/Medium/High",
    "cheekbone_width": "Narrow/Medium/Wide",
    "jawline_width": "Narrow/Medium/Wide",
    "jawline_shape": "Angular/Soft/Square/Rounded",
    "face_length": "Short/Medium/Long",
    "chin_shape": "Pointed/Rounded/Square",
    "proportions": "Golden ratio assessment"
  },
  "skin_tone": "Fair/Medium/Olive/Dusky/Dark with warm/cool/neutral undertone",
  "styling_goals": "Specific goals for this face",
  "styles": [
    {
      "id": 1,
      "name": "Style/Look name",
      "trend_source": "Origin/Tradition",
      "geometric_reasoning": "Why this suits their face",
      "celebrity_reference": "Celebrity reference",
      "stylist_tip": {
        "stylist_name": "Famous stylist name",
        "tip": "Professional tip"
      },
      "description": "Detailed description",
      "prompts": {
        "front": "Transform this person into [detailed description]. Apply [specific makeup: foundation, contour, highlight, blush, eye makeup with colors, lip color]. Style hair as [hairstyle]. Add [jewelry/accessories]. Keep facial structure but apply complete makeover. Professional bridal photography, photorealistic.",
        "back": "Back view of the same bridal look showing [hairstyle details, hair accessories, jewelry from behind]. Professional photography."
      }
    }
  ]
}`;

  return baseRole + faceMeasurement + modeSpecific + outputFormat;
}

async function analyzeAndGeneratePrompts(userPhotoBase64: string, mode: string, bridalCategory?: string): Promise<StyleAnalysis | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  const prompt = getAnalysisPrompt(mode, bridalCategory);

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      },
      3
    );

    const data = await response.json();
    
    if (data.promptFeedback?.blockReason || !data.candidates?.length || data.candidates[0].finishReason === 'SAFETY') {
      return null;
    }
    
    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const cleanedText = cleanJsonResponse(text);
    const analysis = JSON.parse(cleanedText) as StyleAnalysis;
    console.log('Analysis complete:', analysis.face_shape, 'Mode:', mode, 'Category:', bridalCategory);
    return analysis;

  } catch (error) {
    console.error('Analysis error:', error);
    return null;
  }
}

async function generateImage(userPhotoBase64: string, prompt: string, styleIndex: number, view: string): Promise<string | null> {
  const base64Data = userPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ inline_data: { mime_type: "image/jpeg", data: base64Data } }, { text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"], temperature: 1.0 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      },
      3
    );

    const data = await response.json();
    
    if (data.promptFeedback?.blockReason || !data.candidates?.length) return null;
    
    for (const part of data.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error(`Generation error:`, error);
    return null;
  }
}

export async function GET() {
  // Return bridal categories for dropdown
  const categories = Object.entries(BRIDAL_CATEGORIES).map(([key, value]) => ({
    id: key,
    name: value.name,
    region: value.region,
    description: value.description
  }));
  
  const grouped = {
    indian: categories.filter(c => c.region === 'Indian'),
    religious: categories.filter(c => c.region === 'Religious'),
    international: categories.filter(c => c.region === 'International')
  };
  
  return NextResponse.json({ success: true, categories: grouped });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPhoto, styleIndex, mode = 'hair', bridalCategory } = body;

    if (!userPhoto) {
      return NextResponse.json({ success: false, error: 'No photo provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    const validMode = ['hair', 'bridal', 'color'].includes(mode) ? mode : 'hair';

    // Analysis
    console.log(`Analyzing for ${validMode} mode${bridalCategory ? ` - ${bridalCategory}` : ''}...`);
    const analysis = await analyzeAndGeneratePrompts(userPhoto, validMode, bridalCategory);
    
    if (!analysis || !analysis.styles?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not analyze face. Please try a clearer photo.' 
      }, { status: 400 });
    }

    const faceAnalysis = {
      shape: analysis.face_shape,
      measurements: analysis.face_measurements,
      skinTone: analysis.skin_tone,
      stylingGoals: analysis.styling_goals
    };

    const stylesToGenerate = analysis.styles.map(s => ({
      name: s.name,
      frontPrompt: s.prompts.front,
      backPrompt: s.prompts.back,
      geometricReasoning: s.geometric_reasoning,
      trendSource: s.trend_source,
      celebrityReference: s.celebrity_reference,
      stylistTip: s.stylist_tip,
      description: s.description
    }));

    const indicesToGenerate = styleIndex !== undefined ? [styleIndex] : [0, 1, 2, 3, 4, 5];
    const results = [];

    for (const idx of indicesToGenerate) {
      if (idx >= stylesToGenerate.length) continue;
      
      const style = stylesToGenerate[idx];
      const frontImage = await generateImage(userPhoto, style.frontPrompt, idx, 'front');
      const backImage = await generateImage(userPhoto, style.backPrompt, idx, 'back');
      
      results.push({
        styleIndex: idx,
        styleName: style.name,
        frontImage,
        backImage,
        geometricReasoning: style.geometricReasoning,
        trendSource: style.trendSource,
        celebrityReference: style.celebrityReference,
        stylistTip: style.stylistTip,
        description: style.description,
        error: frontImage ? null : 'Generation failed'
      });
      
      if (indicesToGenerate.length > 1 && idx !== indicesToGenerate[indicesToGenerate.length - 1]) {
        await sleep(300);
      }
    }

    const successCount = results.filter(r => r.frontImage).length;
    
    return NextResponse.json({
      success: successCount > 0,
      mode: validMode,
      bridalCategory,
      faceAnalysis,
      results,
      message: successCount > 0 
        ? `Generated ${successCount} looks`
        : 'Could not generate. Please try a different photo.'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ success: false, error: 'Failed. Please try again.' }, { status: 500 });
  }
}
