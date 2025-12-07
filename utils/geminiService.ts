/**
 * StyleVision Hybrid AI Service
 * 
 * Uses Google's latest Gemini 3 Pro models:
 * - gemini-3-pro-preview: For advanced face/hair analysis
 * - gemini-3-pro-image-preview: For AI-generated hairstyle visualizations
 * 
 * @see https://ai.google.dev/gemini-api/docs
 */

// API Configuration
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_3_PRO_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';
const GEMINI_3_IMAGE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

// ============================================================================
// Type Definitions
// ============================================================================

export interface HairstyleRecommendation {
    id: string;
    name: string;
    imageSearchQuery: string;
    theLook: string;
    whyItWorks: string;
    whatToAskFor: string;
    expertTip: string;
    instructions: string[];
    matchScore: number;
    // AI-generated images
    frontViewImage?: string;  // Base64 data URL
    backViewImage?: string;   // Base64 data URL
    isGeneratingImages?: boolean;
}

export interface AnalysisResult {
    faceShape: string;
    faceShapeDescription: string;
    stylingRule: string;
    gender: 'Male' | 'Female';
    skinTone: 'Warm' | 'Cool' | 'Neutral';
    hairType: string;
    currentHairDescription: string;
    recommendations: HairstyleRecommendation[];
    keyTips: string[];
    // Additional metadata from Gemini 3
    faceFeatures?: {
        jawline: string;
        forehead: string;
        cheekbones: string;
        eyeShape?: string;
    };
    confidenceScore?: number;
}

export interface ColorAnalysisResult {
    skinTone: 'Warm' | 'Cool' | 'Neutral';
    undertone: string;
    season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
    seasonDescription: string;
    recommendedColors: {
        name: string;
        hexCode: string;
        description: string;
        expertTip: string;
        previewImage?: string;
    }[];
    colorsToAvoid: {
        name: string;
        reason: string;
    }[];
    keyTips: string[];
}

export interface HybridAnalysisResult extends AnalysisResult {
    generatedImages: {
        styleId: string;
        frontView: string;
        backView?: string;
        status: 'pending' | 'generating' | 'complete' | 'failed';
    }[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert image source to base64 format
 */
async function getBase64Image(imageSrc: string): Promise<string> {
    if (imageSrc.startsWith('data:image')) {
        return imageSrc.split(',')[1];
    }
    
    try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        throw new Error('Failed to process image');
    }
}

/**
 * Get MIME type from image source
 */
function getMimeType(imageSrc: string): string {
    if (imageSrc.includes('image/png')) return 'image/png';
    if (imageSrc.includes('image/gif')) return 'image/gif';
    if (imageSrc.includes('image/webp')) return 'image/webp';
    return 'image/jpeg';
}

/**
 * Parse JSON from model response (handles markdown code blocks)
 */
function parseJsonResponse(text: string): unknown {
    let jsonStr = text;
    if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    return JSON.parse(jsonStr.trim());
}

// ============================================================================
// Gemini 3 Pro Analysis (Text + Vision)
// ============================================================================

/**
 * Advanced face and hairstyle analysis using Gemini 3 Pro
 * Implements CO-STAR prompt framework for optimal results
 */
export async function analyzeWithGemini3(imageSrc: string): Promise<AnalysisResult> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured, using fallback analysis');
        return getFallbackAnalysis();
    }

    try {
        const base64Image = await getBase64Image(imageSrc);
        const mimeType = getMimeType(imageSrc);

        // CO-STAR Framework Prompt for Gemini 3 Pro
        const prompt = `# CONTEXT
You are StyleVision AI, an elite virtual hair stylist powered by advanced computer vision. You analyze facial features with precision to recommend transformative hairstyles.

# OBJECTIVE
Analyze this person's photo to:
1. Identify their face shape with detailed feature analysis
2. Assess their current hair type and condition
3. Recommend 6-8 personalized hairstyles ranked by compatibility
4. Provide actionable salon instructions for each style

# STYLE
Respond as a luxury salon consultant - professional yet approachable. Use precise terminology that clients can share with their stylist.

# TONE
Confident, empowering, and supportive. Make the person feel excited about their transformation possibilities.

# AUDIENCE
Adults seeking professional hairstyle recommendations to enhance their appearance.

# RESPONSE FORMAT
Respond ONLY with valid JSON (no markdown, no code blocks):

{
    "faceShape": "Oval|Round|Square|Heart|Diamond|Oblong|Triangle",
    "faceShapeDescription": "Detailed analysis of facial proportions and features",
    "stylingRule": "The golden rule for styling this face shape",
    "gender": "Male|Female",
    "skinTone": "Warm|Cool|Neutral",
    "hairType": "Current hair texture description (straight/wavy/curly/coily, fine/medium/thick)",
    "currentHairDescription": "Analysis of current hairstyle, length, and condition",
    "faceFeatures": {
        "jawline": "Description of jawline shape",
        "forehead": "Description of forehead proportions",
        "cheekbones": "Description of cheekbone prominence",
        "eyeShape": "Description of eye shape if visible"
    },
    "confidenceScore": 0.95,
    "recommendations": [
        {
            "id": "style-1",
            "name": "Creative Hairstyle Name",
            "imageSearchQuery": "precise search query for this style",
            "theLook": "Vivid description of the finished style",
            "whyItWorks": "How this complements their specific features",
            "whatToAskFor": "Exact salon terminology to request this cut",
            "expertTip": "Pro styling secret for this look",
            "instructions": ["Step 1 styling", "Step 2 styling", "Step 3 finishing"],
            "matchScore": 95
        }
    ],
    "keyTips": [
        "Personalized tip based on their specific features",
        "Product recommendation for their hair type",
        "Maintenance advice"
    ]
}

Provide 6-8 recommendations sorted by matchScore (95-70 range).
Be specific to THEIR unique features - avoid generic advice.`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const response = await fetch(`${GEMINI_3_PRO_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini 3 Pro API error:', errorData);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('No response from Gemini 3 Pro');
        }

        const result = parseJsonResponse(textResponse) as AnalysisResult;
        return result;

    } catch (error) {
        console.error('Gemini 3 Pro analysis failed:', error);
        return getFallbackAnalysis();
    }
}

// ============================================================================
// Gemini 3 Pro Image Generation
// ============================================================================

/**
 * Generate AI hairstyle visualization using Gemini 3 Pro Image
 * Creates photorealistic preview of the recommended style
 */
export async function generateHairstyleImage(
    originalImageBase64: string,
    analysisResult: AnalysisResult,
    recommendation: HairstyleRecommendation,
    view: 'front' | 'back' = 'front'
): Promise<string | null> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured');
        return null;
    }

    try {
        const viewDescription = view === 'front' 
            ? 'front-facing portrait view showing the face and hairstyle' 
            : 'back view showing the hairstyle from behind';

        // Detailed image generation prompt
        const prompt = `Generate a photorealistic ${viewDescription} of a person with this hairstyle:

HAIRSTYLE: ${recommendation.name}
DESCRIPTION: ${recommendation.theLook}
FACE SHAPE: ${analysisResult.faceShape}
GENDER: ${analysisResult.gender}
SKIN TONE: ${analysisResult.skinTone}
HAIR TYPE: ${analysisResult.hairType}

REQUIREMENTS:
- Photorealistic quality, professional salon photography style
- ${view === 'front' ? 'Clear view of face and how the hairstyle frames it' : 'Show the back structure, layers, and styling'}
- Soft, flattering lighting like a fashion editorial
- Clean, neutral background (soft gradient)
- Hair should look healthy, styled, and professionally done
- Match the person's apparent ethnicity and features

OUTPUT: High-quality ${view} portrait photograph showcasing this hairstyle transformation.`;

        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
            }
        };

        const response = await fetch(`${GEMINI_3_IMAGE_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error('Image generation failed:', response.status);
            return null;
        }

        const data = await response.json();
        
        // Check for generated image in response
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inline_data?.mime_type?.startsWith('image/')) {
                return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
            }
        }

        return null;
    } catch (error) {
        console.error('Hairstyle image generation failed:', error);
        return null;
    }
}

// ============================================================================
// Hybrid Analysis Pipeline
// ============================================================================

/**
 * Complete hybrid analysis: Gemini 3 Pro analysis + Gemini 3 Image generation
 * This is the main entry point for the StyleVision app
 */
export async function hybridAnalysis(
    imageSrc: string,
    options: {
        generateImages?: boolean;
        maxImagesToGenerate?: number;
        includeBackView?: boolean;
    } = {}
): Promise<HybridAnalysisResult> {
    const {
        generateImages = true,
        maxImagesToGenerate = 3,
        includeBackView = false
    } = options;

    // Step 1: Analyze with Gemini 3 Pro
    console.log('🔍 Starting Gemini 3 Pro analysis...');
    const analysisResult = await analyzeWithGemini3(imageSrc);
    
    // Initialize hybrid result
    const hybridResult: HybridAnalysisResult = {
        ...analysisResult,
        generatedImages: []
    };

    // Step 2: Generate AI images for top recommendations
    if (generateImages && GEMINI_API_KEY) {
        console.log('🎨 Generating AI hairstyle visualizations...');
        const base64Image = await getBase64Image(imageSrc);
        
        const topRecommendations = analysisResult.recommendations.slice(0, maxImagesToGenerate);
        
        for (const rec of topRecommendations) {
            const imageEntry = {
                styleId: rec.id,
                frontView: '',
                backView: undefined as string | undefined,
                status: 'generating' as const
            };
            
            hybridResult.generatedImages.push(imageEntry);

            try {
                // Generate front view
                const frontImage = await generateHairstyleImage(
                    base64Image, 
                    analysisResult, 
                    rec, 
                    'front'
                );
                
                if (frontImage) {
                    imageEntry.frontView = frontImage;
                    rec.frontViewImage = frontImage;
                }

                // Generate back view if requested
                if (includeBackView) {
                    const backImage = await generateHairstyleImage(
                        base64Image,
                        analysisResult,
                        rec,
                        'back'
                    );
                    
                    if (backImage) {
                        imageEntry.backView = backImage;
                        rec.backViewImage = backImage;
                    }
                }

                imageEntry.status = 'complete';
            } catch (error) {
                console.error(`Failed to generate images for ${rec.name}:`, error);
                imageEntry.status = 'failed';
            }
        }
    }

    return hybridResult;
}

// ============================================================================
// Color Analysis
// ============================================================================

/**
 * Analyze skin tone and recommend hair colors using Gemini 3 Pro
 */
export async function analyzeColorWithGemini3(imageSrc: string): Promise<ColorAnalysisResult> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured, using fallback color analysis');
        return getFallbackColorAnalysis();
    }

    try {
        const base64Image = await getBase64Image(imageSrc);
        const mimeType = getMimeType(imageSrc);

        const prompt = `# CONTEXT
You are a master colorist with expertise in personal color analysis and hair color theory.

# OBJECTIVE
Analyze this person's coloring to determine their optimal hair color palette using seasonal color analysis methodology.

# RESPONSE FORMAT
Respond ONLY with valid JSON:

{
    "skinTone": "Warm|Cool|Neutral",
    "undertone": "Detailed undertone description (golden, olive, peachy, pink, blue, etc.)",
    "season": "Spring|Summer|Autumn|Winter",
    "seasonDescription": "Comprehensive explanation of their color season with examples",
    "recommendedColors": [
        {
            "name": "Descriptive Color Name",
            "hexCode": "#XXXXXX",
            "description": "Why this color enhances their features",
            "expertTip": "Professional advice for achieving/maintaining this color"
        }
    ],
    "colorsToAvoid": [
        {
            "name": "Color Name",
            "reason": "Specific reason why this color doesn't work"
        }
    ],
    "keyTips": ["Personalized coloring advice", "Maintenance tips", "Transitioning advice"]
}

Provide 6-8 recommended colors with accurate hex codes.
Provide 3-4 colors to avoid with clear reasoning.
Consider eye color, natural hair color, and vein color if visible.`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            }
        };

        const response = await fetch(`${GEMINI_3_PRO_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('No response from Gemini');
        }

        return parseJsonResponse(textResponse) as ColorAnalysisResult;

    } catch (error) {
        console.error('Gemini 3 color analysis failed:', error);
        return getFallbackColorAnalysis();
    }
}

// ============================================================================
// Legacy Compatibility Aliases
// ============================================================================

// Maintain backward compatibility with existing code
export const analyzeWithGemini = analyzeWithGemini3;
export const analyzeColorWithGemini = analyzeColorWithGemini3;

export type GeminiHairstyleRecommendation = HairstyleRecommendation;
export type GeminiAnalysisResult = AnalysisResult;
export type GeminiColorAnalysisResult = ColorAnalysisResult;

// ============================================================================
// Image Search Fallback
// ============================================================================

/**
 * Search for reference hairstyle images (fallback when AI generation unavailable)
 */
export async function searchHairstyleImage(query: string): Promise<string> {
    const encodedQuery = encodeURIComponent(query);
    return `https://source.unsplash.com/400x500/?${encodedQuery},hairstyle,portrait`;
}

// ============================================================================
// Fallback Data
// ============================================================================

function getFallbackAnalysis(): AnalysisResult {
    return {
        faceShape: 'Oval',
        faceShapeDescription: 'Your face has balanced proportions with slightly wider cheekbones, creating a versatile oval shape that suits many hairstyles.',
        stylingRule: 'Oval faces are the most versatile - experiment with different styles! Focus on enhancing your best features.',
        gender: 'Male',
        skinTone: 'Neutral',
        hairType: 'Medium texture with natural wave',
        currentHairDescription: 'Current style analysis unavailable - please ensure API key is configured',
        faceFeatures: {
            jawline: 'Well-defined, balanced proportions',
            forehead: 'Medium height, well-proportioned',
            cheekbones: 'Subtly prominent, creating elegant contours'
        },
        confidenceScore: 0.5,
        recommendations: [
            {
                id: 'fb-1',
                name: 'The Modern Quiff',
                imageSearchQuery: 'modern quiff hairstyle men 2024',
                theLook: 'Voluminous top swept upward and back with tapered sides - the epitome of contemporary sophistication',
                whyItWorks: 'Adds height and sophistication while maintaining a clean, professional appearance that works for any occasion',
                whatToAskFor: 'Ask for a textured quiff with 2-3 inches on top, tapered sides, and a skin fade at the temples',
                expertTip: 'Use a sea salt spray before blow drying for natural texture, then finish with a matte clay for hold without shine',
                instructions: ['Apply volumizing mousse to damp hair', 'Blow dry upward using a round brush at the roots', 'Finish with matte clay, working from back to front'],
                matchScore: 92
            },
            {
                id: 'fb-2',
                name: 'Textured French Crop',
                imageSearchQuery: 'textured french crop haircut men',
                theLook: 'Short, choppy layers with natural movement and a subtle fringe',
                whyItWorks: 'Low maintenance yet effortlessly stylish, works with natural hair texture',
                whatToAskFor: 'Textured crop with point cutting throughout, short tapered sides, soft fringe at 1 inch',
                expertTip: 'Less product is more - a pea-sized amount of matte clay is all you need',
                instructions: ['Towel dry until slightly damp', 'Apply small amount of clay to fingertips', 'Work through hair with messy, natural movements'],
                matchScore: 88
            },
            {
                id: 'fb-3',
                name: 'Executive Side Part',
                imageSearchQuery: 'classic executive side part hairstyle',
                theLook: 'Timeless, polished look with a defined natural part and sleek finish',
                whyItWorks: 'Professional and versatile - takes you from boardroom to evening events effortlessly',
                whatToAskFor: 'Medium length on top (3-4 inches), tapered sides, define natural part line',
                expertTip: 'Find your natural part by pushing all hair forward and seeing where it naturally splits',
                instructions: ['Apply pomade to damp hair', 'Comb into place following natural part', 'Set with light-hold hairspray for all-day polish'],
                matchScore: 85
            },
            {
                id: 'fb-4',
                name: 'Effortless Messy Fringe',
                imageSearchQuery: 'messy fringe hairstyle men casual',
                theLook: 'Relaxed, lived-in style with textured bangs that say "I woke up like this"',
                whyItWorks: 'Creates a youthful, approachable appearance that is perfect for creative fields',
                whatToAskFor: 'Longer textured fringe (2-3 inches), razored layers throughout, shorter graduated back',
                expertTip: 'Air dry whenever possible for the most natural finish',
                instructions: ['Let hair air dry or rough dry with fingers', 'Apply texture spray from 6 inches away', 'Tousle with fingers until perfectly imperfect'],
                matchScore: 82
            },
            {
                id: 'fb-5',
                name: 'The Power Slick Back',
                imageSearchQuery: 'slicked back undercut hairstyle men',
                theLook: 'Sleek, refined style swept straight back - confident and commanding',
                whyItWorks: 'Creates a powerful, authoritative look that demands attention',
                whatToAskFor: '4-5 inches on top to slick back, high skin fade on sides, clean neckline',
                expertTip: 'Always start with damp hair for the best hold and smoothest finish',
                instructions: ['Apply high-hold gel or pomade to damp hair', 'Comb straight back from forehead', 'Let set naturally or use low heat to lock in place'],
                matchScore: 78
            },
            {
                id: 'fb-6',
                name: 'Sharp Buzz Fade',
                imageSearchQuery: 'buzz cut skin fade clean',
                theLook: 'Ultra-clean, minimal style with precision gradient fade',
                whyItWorks: 'Zero maintenance while always looking sharp and put-together',
                whatToAskFor: 'Guard 2 or 3 on top, skin fade from temples down, crisp lineup',
                expertTip: 'Keep scalp moisturized and protected from sun - this style shows everything',
                instructions: ['No daily styling needed', 'Maintain with trims every 2-3 weeks', 'Use SPF on scalp in summer'],
                matchScore: 75
            }
        ],
        keyTips: [
            'Consider your lifestyle and daily routine when choosing - busy professionals benefit from lower-maintenance cuts',
            'Always bring reference photos to your stylist for clearer communication of what you want',
            'Invest in quality products that match your hair type - it makes all the difference in achieving salon results at home'
        ]
    };
}

function getFallbackColorAnalysis(): ColorAnalysisResult {
    return {
        skinTone: 'Neutral',
        undertone: 'Balanced with subtle warm undertones - a versatile canvas for many colors',
        season: 'Autumn',
        seasonDescription: 'Your coloring suggests a warm Autumn palette. You have depth and richness to your features that pairs beautifully with earthy, warm tones. Think rich forests in fall - deep, warm, and inviting.',
        recommendedColors: [
            { 
                name: 'Rich Chestnut', 
                hexCode: '#5D2906', 
                description: 'A warm, multi-dimensional brown that enhances warmth in your skin', 
                expertTip: 'Add caramel highlights around the face for dimension and light-catching moments' 
            },
            { 
                name: 'Copper Penny', 
                hexCode: '#B04A00', 
                description: 'Vibrant warm copper that brings out golden undertones in your complexion', 
                expertTip: 'Use a color-depositing copper conditioner weekly to maintain vibrancy' 
            },
            { 
                name: 'Caramel Balayage', 
                hexCode: '#C68E17', 
                description: 'Sun-kissed warmth that creates natural-looking dimension', 
                expertTip: 'Focus lighter pieces around face frame for brightening effect' 
            },
            { 
                name: 'Warm Chocolate', 
                hexCode: '#3C1414', 
                description: 'Deep brown with red undertones - sophisticated yet approachable', 
                expertTip: 'Clear glossing treatments every 6 weeks enhance richness and shine' 
            },
            { 
                name: 'Honey Blonde', 
                hexCode: '#E8B960', 
                description: 'Warm, golden-toned blonde that complements autumn colorings beautifully', 
                expertTip: 'Requires purple shampoo sparingly - golden tones are your friend' 
            },
            { 
                name: 'Classic Auburn', 
                hexCode: '#8B2500', 
                description: 'The perfect red-brown blend - timeless and flattering', 
                expertTip: 'Most versatile and universally flattering shade for autumn colorings' 
            }
        ],
        colorsToAvoid: [
            { name: 'Platinum Blonde', reason: 'Too cool and stark - can wash out warm skin tones and create harsh contrast' },
            { name: 'Blue-Black', reason: 'Creates an unflattering, severe contrast with warm undertones' },
            { name: 'Ash Brown', reason: 'Gray undertones clash with warm complexion, can make skin look sallow' },
            { name: 'Cool Burgundy', reason: 'Blue-based reds fight against your natural warmth' }
        ],
        keyTips: [
            'Embrace warm tones - they enhance your natural glow and make your skin look healthier',
            'Avoid ashy or cool-toned colors that can make your complexion look tired or sallow',
            'When going lighter, stay in the golden/honey family rather than cool beige or platinum',
            'Rich, deep colors create beautiful contrast with your features without being harsh'
        ]
    };
}
