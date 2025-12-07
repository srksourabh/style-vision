// Gemini API Service for StyleVision
// Uses Google's Gemini 2.0 Flash model for image analysis

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface GeminiHairstyleRecommendation {
    id: string;
    name: string;
    imageSearchQuery: string;
    theLook: string;
    whyItWorks: string;
    whatToAskFor: string;
    expertTip: string;
    instructions: string[];
    matchScore: number;
}

export interface GeminiAnalysisResult {
    faceShape: string;
    faceShapeDescription: string;
    stylingRule: string;
    gender: 'Male' | 'Female';
    skinTone: 'Warm' | 'Cool' | 'Neutral';
    hairType: string;
    currentHairDescription: string;
    recommendations: GeminiHairstyleRecommendation[];
    keyTips: string[];
}

export interface GeminiColorAnalysisResult {
    skinTone: 'Warm' | 'Cool' | 'Neutral';
    undertone: string;
    season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
    seasonDescription: string;
    recommendedColors: {
        name: string;
        hexCode: string;
        description: string;
        expertTip: string;
    }[];
    colorsToAvoid: {
        name: string;
        reason: string;
    }[];
    keyTips: string[];
}

// Convert image to base64 if it's a data URL or fetch and convert if URL
async function getBase64Image(imageSrc: string): Promise<string> {
    if (imageSrc.startsWith('data:image')) {
        // Already a data URL, extract base64 part
        return imageSrc.split(',')[1];
    }
    
    // Fetch the image and convert to base64
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

// Get MIME type from image source
function getMimeType(imageSrc: string): string {
    if (imageSrc.includes('image/png')) return 'image/png';
    if (imageSrc.includes('image/gif')) return 'image/gif';
    if (imageSrc.includes('image/webp')) return 'image/webp';
    return 'image/jpeg';
}

// Analyze face and get hairstyle recommendations using Gemini
export async function analyzeWithGemini(imageSrc: string): Promise<GeminiAnalysisResult> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured, using fallback analysis');
        return getFallbackAnalysis();
    }

    try {
        const base64Image = await getBase64Image(imageSrc);
        const mimeType = getMimeType(imageSrc);

        const prompt = `You are an expert hair stylist and face shape analyst. Analyze this person's face and provide personalized hairstyle recommendations.

IMPORTANT: Respond ONLY with valid JSON, no markdown formatting, no code blocks, just pure JSON.

Analyze the image and return a JSON object with this exact structure:
{
    "faceShape": "Oval|Round|Square|Heart|Diamond|Oblong|Triangle",
    "faceShapeDescription": "A detailed description of their face shape characteristics",
    "stylingRule": "The key styling rule for this face shape",
    "gender": "Male|Female",
    "skinTone": "Warm|Cool|Neutral",
    "hairType": "Description of their current hair type (straight, wavy, curly, etc.)",
    "currentHairDescription": "Brief description of their current hairstyle",
    "recommendations": [
        {
            "id": "unique-id-1",
            "name": "Hairstyle Name",
            "imageSearchQuery": "specific search query to find this hairstyle image",
            "theLook": "Description of the hairstyle look",
            "whyItWorks": "Why this style suits their face shape",
            "whatToAskFor": "What to tell the barber/stylist",
            "expertTip": "Professional styling tip",
            "instructions": ["Step 1", "Step 2", "Step 3"],
            "matchScore": 95
        }
    ],
    "keyTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Provide 6-8 hairstyle recommendations sorted by matchScore (highest first).
Make recommendations specific to their face shape, gender, and current features.
Be creative with hairstyle names and provide detailed, actionable advice.`;

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

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', errorData);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('No response from Gemini');
        }

        // Parse JSON response (handle potential markdown code blocks)
        let jsonStr = textResponse;
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
        }

        const result = JSON.parse(jsonStr.trim());
        return result as GeminiAnalysisResult;

    } catch (error) {
        console.error('Gemini analysis failed:', error);
        return getFallbackAnalysis();
    }
}

// Analyze skin tone and get color recommendations using Gemini
export async function analyzeColorWithGemini(imageSrc: string): Promise<GeminiColorAnalysisResult> {
    if (!GEMINI_API_KEY) {
        console.warn('Gemini API key not configured, using fallback color analysis');
        return getFallbackColorAnalysis();
    }

    try {
        const base64Image = await getBase64Image(imageSrc);
        const mimeType = getMimeType(imageSrc);

        const prompt = `You are an expert colorist and personal color analyst. Analyze this person's skin tone, undertones, and features to determine their best hair colors.

IMPORTANT: Respond ONLY with valid JSON, no markdown formatting, no code blocks, just pure JSON.

Analyze the image and return a JSON object with this exact structure:
{
    "skinTone": "Warm|Cool|Neutral",
    "undertone": "Description of their skin undertone (golden, peachy, olive, pink, etc.)",
    "season": "Spring|Summer|Autumn|Winter",
    "seasonDescription": "Detailed explanation of why they belong to this color season",
    "recommendedColors": [
        {
            "name": "Color Name",
            "hexCode": "#XXXXXX",
            "description": "Why this color suits them",
            "expertTip": "How to achieve/maintain this color"
        }
    ],
    "colorsToAvoid": [
        {
            "name": "Color Name",
            "reason": "Why to avoid this color"
        }
    ],
    "keyTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Provide 6-8 recommended colors with accurate hex codes.
Provide 3-4 colors to avoid with clear reasons.
Consider their eye color, natural hair color, and skin tone when making recommendations.`;

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

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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

        let jsonStr = textResponse;
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonStr.includes('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
        }

        const result = JSON.parse(jsonStr.trim());
        return result as GeminiColorAnalysisResult;

    } catch (error) {
        console.error('Gemini color analysis failed:', error);
        return getFallbackColorAnalysis();
    }
}

// Fallback analysis when API is unavailable
function getFallbackAnalysis(): GeminiAnalysisResult {
    return {
        faceShape: 'Oval',
        faceShapeDescription: 'Your face has balanced proportions with slightly wider cheekbones, creating a versatile oval shape that suits many hairstyles.',
        stylingRule: 'Oval faces are the most versatile - experiment with different styles! Focus on enhancing your best features rather than correcting proportions.',
        gender: 'Male',
        skinTone: 'Neutral',
        hairType: 'Medium texture with natural wave',
        currentHairDescription: 'Current style analysis unavailable',
        recommendations: [
            {
                id: 'fb-1',
                name: 'The Modern Quiff',
                imageSearchQuery: 'modern quiff hairstyle men',
                theLook: 'Voluminous top swept upward and back with tapered sides',
                whyItWorks: 'Adds height and sophistication while maintaining a clean, professional appearance',
                whatToAskFor: 'Tapered sides with 2-3 inches on top for volume',
                expertTip: 'Use a sea salt spray before blow drying for natural texture',
                instructions: ['Apply mousse to damp hair', 'Blow dry upward with round brush', 'Finish with matte paste'],
                matchScore: 92
            },
            {
                id: 'fb-2',
                name: 'Textured Crop',
                imageSearchQuery: 'textured crop haircut men',
                theLook: 'Short, choppy layers with natural movement',
                whyItWorks: 'Low maintenance yet stylish, works with natural hair texture',
                whatToAskFor: 'Textured crop with point cutting, short sides',
                expertTip: 'Less product is more - just a small amount of clay',
                instructions: ['Towel dry hair', 'Apply small amount of clay', 'Style with fingers'],
                matchScore: 88
            },
            {
                id: 'fb-3',
                name: 'Classic Side Part',
                imageSearchQuery: 'classic side part hairstyle men',
                theLook: 'Timeless, polished look with defined part',
                whyItWorks: 'Professional and versatile for any occasion',
                whatToAskFor: 'Medium length on top, tapered sides, natural part line',
                expertTip: 'Find your natural part by pushing hair forward and seeing where it falls',
                instructions: ['Apply pomade to damp hair', 'Comb into place', 'Set with light hairspray'],
                matchScore: 85
            },
            {
                id: 'fb-4',
                name: 'Messy Fringe',
                imageSearchQuery: 'messy fringe hairstyle men',
                theLook: 'Relaxed, effortless style with textured bangs',
                whyItWorks: 'Creates a youthful, approachable appearance',
                whatToAskFor: 'Longer fringe, textured throughout, shorter back',
                expertTip: 'Work product through with fingers for natural finish',
                instructions: ['Air dry or rough dry', 'Apply texture spray', 'Tousle with fingers'],
                matchScore: 82
            },
            {
                id: 'fb-5',
                name: 'Slick Back',
                imageSearchQuery: 'slicked back hairstyle men',
                theLook: 'Sleek, refined style swept straight back',
                whyItWorks: 'Creates a powerful, confident look',
                whatToAskFor: 'Length on top to slick back, faded or tapered sides',
                expertTip: 'Start with damp hair for best hold',
                instructions: ['Apply gel or pomade', 'Comb straight back', 'Let set naturally'],
                matchScore: 78
            },
            {
                id: 'fb-6',
                name: 'Buzz Cut Fade',
                imageSearchQuery: 'buzz cut fade hairstyle',
                theLook: 'Clean, minimal style with gradient fade',
                whyItWorks: 'Ultra low maintenance while still looking sharp',
                whatToAskFor: 'Guard 2 or 3 on top, skin fade on sides',
                expertTip: 'Keep the scalp moisturized and protected from sun',
                instructions: ['No daily styling needed', 'Regular trims every 2-3 weeks', 'Moisturize scalp'],
                matchScore: 75
            }
        ],
        keyTips: [
            'Consider your lifestyle when choosing a style - busy schedules benefit from low-maintenance cuts',
            'Bring reference photos to your stylist for clearer communication',
            'Invest in quality products that match your hair type'
        ]
    };
}

function getFallbackColorAnalysis(): GeminiColorAnalysisResult {
    return {
        skinTone: 'Neutral',
        undertone: 'Balanced with subtle warm undertones',
        season: 'Autumn',
        seasonDescription: 'Your coloring suggests a warm Autumn palette. You have depth and richness to your features that pairs beautifully with earthy, warm tones.',
        recommendedColors: [
            { name: 'Rich Chestnut', hexCode: '#5D2906', description: 'Warm brown with golden undertones', expertTip: 'Add golden highlights for dimension' },
            { name: 'Copper Red', hexCode: '#B04A00', description: 'Vibrant warm copper', expertTip: 'Use color-depositing conditioner weekly' },
            { name: 'Caramel Balayage', hexCode: '#C68E17', description: 'Sun-kissed warmth', expertTip: 'Focus lighter pieces around the face' },
            { name: 'Warm Chocolate', hexCode: '#3C1414', description: 'Deep brown with red undertones', expertTip: 'Glossing treatments enhance shine' },
            { name: 'Golden Blonde', hexCode: '#E8B960', description: 'Warm, honey-toned blonde', expertTip: 'Requires regular toning to avoid brassiness' },
            { name: 'Auburn', hexCode: '#8B2500', description: 'Classic red-brown blend', expertTip: 'Most versatile shade for autumn colorings' }
        ],
        colorsToAvoid: [
            { name: 'Platinum Blonde', reason: 'Too cool and can wash out warm skin tones' },
            { name: 'Jet Black', reason: 'Creates harsh contrast with warm undertones' },
            { name: 'Ash Brown', reason: 'Cool tones clash with warm complexion' }
        ],
        keyTips: [
            'Warm tones will enhance your natural glow',
            'Avoid ashy or cool-toned colors that can make skin look sallow',
            'Rich, deep colors create beautiful contrast with your features'
        ]
    };
}

// Search for hairstyle images using a simple approach
export async function searchHairstyleImage(query: string): Promise<string> {
    // Return a placeholder URL - in production, integrate with an image API
    const encodedQuery = encodeURIComponent(query);
    return `https://source.unsplash.com/300x400/?${encodedQuery},hairstyle,portrait`;
}
