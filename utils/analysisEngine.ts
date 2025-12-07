import { 
    hybridAnalysis, 
    analyzeColorWithGemini3, 
    HybridAnalysisResult,
    HairstyleRecommendation,
    ColorAnalysisResult as GeminiColorAnalysisResult 
} from './geminiService';

export type FaceShape = 'Oval' | 'Square' | 'Round' | 'Diamond' | 'Heart' | 'Triangle' | 'Oblong';
export type Jawline = 'Soft' | 'Sharp' | 'Defined';
export type SkinTone = 'Warm' | 'Neutral' | 'Cool';
export type Gender = 'Male' | 'Female';
export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface HairColor {
    id: string;
    name: string;
    hexCode: string;
    season: Season;
    description: string;
    expertTip: string;
}

export interface Hairstyle {
    id: string;
    name: string;
    gender: Gender;
    imageUrl: string;
    theLook: string;
    whyItWorks: string;
    whatToAskFor: string;
    expertTip?: string;
    suitabilityReason?: string;
    instructions: string[];
    bestForFaceShapes: FaceShape[];
    matchScore?: number;
    // AI-Generated Images from Gemini 3 Pro Image
    frontViewImage?: string;
    backViewImage?: string;
    isAiGenerated?: boolean;
}

export interface AnalysisResult {
    faceShape: FaceShape;
    faceShapeDescription: string;
    stylingRule: string;
    jawline: Jawline;
    skinTone: SkinTone;
    gender: Gender;
    hairType?: string;
    currentHairDescription?: string;
    recommendedStyles: Hairstyle[];
    keyTips: string[];
    // Extended face features from Gemini 3
    faceFeatures?: {
        jawline: string;
        forehead: string;
        cheekbones: string;
        eyeShape?: string;
    };
    confidenceScore?: number;
    // Image generation status
    hasAiGeneratedImages?: boolean;
    imageGenerationStatus?: 'pending' | 'complete' | 'partial' | 'failed';
}

export interface ColorAnalysisResult {
    skinTone: SkinTone;
    undertone?: string;
    season: Season;
    seasonDescription?: string;
    bestColors: HairColor[];
    avoidColors: {
        name: string;
        reason: string;
    }[];
    keyTips?: string[];
}

// Hairstyle image database for fallback matching
const HAIRSTYLE_IMAGES: Record<string, string> = {
    'quiff': 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400&h=500&fit=crop',
    'side part': 'https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?q=80&w=400&h=500&fit=crop',
    'pompadour': 'https://images.unsplash.com/photo-1503951914205-2d60d5b8b990?q=80&w=400&h=500&fit=crop',
    'fade': 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&h=500&fit=crop',
    'undercut': 'https://images.unsplash.com/photo-1512413348602-c7f46eb293df?q=80&w=400&h=500&fit=crop',
    'fringe': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&h=500&fit=crop',
    'faux hawk': 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400&h=500&fit=crop',
    'buzz': 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&h=500&fit=crop',
    'crew cut': 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=400&h=500&fit=crop',
    'textured': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&h=500&fit=crop',
    'slick': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&h=500&fit=crop',
    'layered': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=500&fit=crop',
    'bob': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&h=500&fit=crop',
    'pixie': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&h=500&fit=crop',
    'waves': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400&h=500&fit=crop',
    'long': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&h=500&fit=crop',
    'curly': 'https://images.unsplash.com/photo-1503104834685-7205e8607eb9?q=80&w=400&h=500&fit=crop',
    'crop': 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400&h=500&fit=crop',
    'default_male': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&h=500&fit=crop',
    'default_female': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=500&fit=crop',
};

// Find appropriate fallback image for hairstyle
function findHairstyleImage(styleName: string, gender: string): string {
    const lowerName = styleName.toLowerCase();
    
    for (const [key, url] of Object.entries(HAIRSTYLE_IMAGES)) {
        if (lowerName.includes(key)) {
            return url;
        }
    }
    
    // Return gender-appropriate default
    return gender.toLowerCase() === 'female' ? HAIRSTYLE_IMAGES['default_female'] : HAIRSTYLE_IMAGES['default_male'];
}

/**
 * Main face analysis function - uses Gemini 3 Pro Hybrid System
 * 
 * Pipeline:
 * 1. Gemini 3 Pro analyzes face shape, features, and recommends styles
 * 2. Gemini 3 Pro Image generates AI visualizations of top styles
 * 3. Falls back to stock images if AI generation fails
 */
export const analyzeFace = async (
    imageSrc: string, 
    options: {
        generateImages?: boolean;
        maxImagesToGenerate?: number;
        includeBackView?: boolean;
    } = {}
): Promise<AnalysisResult> => {
    const {
        generateImages = true,
        maxImagesToGenerate = 3,
        includeBackView = false
    } = options;

    try {
        console.log('🚀 Starting Gemini 3 Pro hybrid analysis...');
        
        // Call Gemini 3 Pro Hybrid System
        const geminiResult: HybridAnalysisResult = await hybridAnalysis(imageSrc, {
            generateImages,
            maxImagesToGenerate,
            includeBackView
        });
        
        // Track image generation status
        let imageGenStatus: 'complete' | 'partial' | 'failed' | 'pending' = 'pending';
        let hasAiImages = false;

        if (geminiResult.generatedImages && geminiResult.generatedImages.length > 0) {
            const completedImages = geminiResult.generatedImages.filter(img => img.status === 'complete' && img.frontView);
            const failedImages = geminiResult.generatedImages.filter(img => img.status === 'failed');
            
            if (completedImages.length === geminiResult.generatedImages.length) {
                imageGenStatus = 'complete';
                hasAiImages = true;
            } else if (completedImages.length > 0) {
                imageGenStatus = 'partial';
                hasAiImages = true;
            } else if (failedImages.length === geminiResult.generatedImages.length) {
                imageGenStatus = 'failed';
            }
        }

        // Convert Gemini result to our format with AI-generated images
        const recommendedStyles: Hairstyle[] = geminiResult.recommendations.map((rec: HairstyleRecommendation, index: number) => {
            // Check if this recommendation has an AI-generated image
            const generatedImage = geminiResult.generatedImages?.find(img => img.styleId === rec.id);
            const hasAiGeneratedFront = !!rec.frontViewImage || !!generatedImage?.frontView;
            const hasAiGeneratedBack = !!rec.backViewImage || !!generatedImage?.backView;

            return {
                id: rec.id || `style-${index}`,
                name: rec.name,
                gender: geminiResult.gender,
                // Use AI-generated image if available, otherwise fallback to stock
                imageUrl: rec.frontViewImage || generatedImage?.frontView || findHairstyleImage(rec.name, geminiResult.gender),
                theLook: rec.theLook,
                whyItWorks: rec.whyItWorks,
                whatToAskFor: rec.whatToAskFor,
                expertTip: rec.expertTip,
                instructions: rec.instructions || [],
                bestForFaceShapes: [geminiResult.faceShape as FaceShape],
                matchScore: rec.matchScore,
                // AI-generated images
                frontViewImage: rec.frontViewImage || generatedImage?.frontView,
                backViewImage: rec.backViewImage || generatedImage?.backView,
                isAiGenerated: hasAiGeneratedFront
            };
        });

        // Sort by match score (highest first)
        recommendedStyles.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        console.log(`✅ Analysis complete. ${recommendedStyles.filter(s => s.isAiGenerated).length} AI-generated images`);

        return {
            faceShape: geminiResult.faceShape as FaceShape,
            faceShapeDescription: geminiResult.faceShapeDescription,
            stylingRule: geminiResult.stylingRule,
            jawline: (geminiResult.faceFeatures?.jawline?.toLowerCase().includes('sharp') ? 'Sharp' : 
                      geminiResult.faceFeatures?.jawline?.toLowerCase().includes('soft') ? 'Soft' : 'Defined') as Jawline,
            skinTone: geminiResult.skinTone as SkinTone,
            gender: geminiResult.gender,
            hairType: geminiResult.hairType,
            currentHairDescription: geminiResult.currentHairDescription,
            recommendedStyles,
            keyTips: geminiResult.keyTips || [],
            faceFeatures: geminiResult.faceFeatures,
            confidenceScore: geminiResult.confidenceScore,
            hasAiGeneratedImages: hasAiImages,
            imageGenerationStatus: imageGenStatus
        };
        
    } catch (error) {
        console.error('❌ Gemini 3 Pro analysis failed, using fallback:', error);
        return getFallbackAnalysisResult();
    }
};

/**
 * Color analysis function - uses Gemini 3 Pro
 */
export const analyzeColor = async (imageSrc: string): Promise<ColorAnalysisResult> => {
    try {
        console.log('🎨 Starting Gemini 3 Pro color analysis...');
        
        // Call Gemini 3 Pro for color analysis
        const geminiResult: GeminiColorAnalysisResult = await analyzeColorWithGemini3(imageSrc);
        
        // Convert Gemini result to our format
        const bestColors: HairColor[] = geminiResult.recommendedColors.map((color, index) => ({
            id: `color-${index}`,
            name: color.name,
            hexCode: color.hexCode,
            season: geminiResult.season as Season,
            description: color.description,
            expertTip: color.expertTip
        }));

        console.log('✅ Color analysis complete');

        return {
            skinTone: geminiResult.skinTone as SkinTone,
            undertone: geminiResult.undertone,
            season: geminiResult.season as Season,
            seasonDescription: geminiResult.seasonDescription,
            bestColors,
            avoidColors: geminiResult.colorsToAvoid,
            keyTips: geminiResult.keyTips
        };
        
    } catch (error) {
        console.error('❌ Color analysis failed, using fallback:', error);
        return getFallbackColorAnalysisResult();
    }
};

// Fallback analysis results
function getFallbackAnalysisResult(): AnalysisResult {
    return {
        faceShape: 'Oval',
        faceShapeDescription: 'Your face has well-balanced proportions with a gently rounded hairline and chin. This versatile shape works well with many different hairstyles.',
        stylingRule: 'Oval faces are considered the most versatile face shape. You can experiment with various styles - focus on enhancing your best features rather than correcting proportions.',
        jawline: 'Defined',
        skinTone: 'Neutral',
        gender: 'Male',
        faceFeatures: {
            jawline: 'Well-defined, balanced proportions',
            forehead: 'Medium height, well-proportioned',
            cheekbones: 'Subtly prominent'
        },
        confidenceScore: 0.5,
        hasAiGeneratedImages: false,
        imageGenerationStatus: 'failed',
        recommendedStyles: [
            {
                id: 'fb-1',
                name: 'The Modern Quiff',
                gender: 'Male',
                imageUrl: HAIRSTYLE_IMAGES['quiff'],
                theLook: 'Voluminous top swept upward and back with clean tapered sides',
                whyItWorks: 'Adds height and sophistication while complementing your balanced facial proportions',
                whatToAskFor: 'Tapered sides with 2-3 inches on top for volume. Ask for texture on top.',
                expertTip: 'Use a sea salt spray before blow drying for natural texture and hold',
                instructions: ['Apply mousse to damp hair', 'Blow dry upward with round brush', 'Finish with matte paste for texture'],
                bestForFaceShapes: ['Oval', 'Round'],
                matchScore: 92,
                isAiGenerated: false
            },
            {
                id: 'fb-2',
                name: 'Textured Side Part',
                gender: 'Male',
                imageUrl: HAIRSTYLE_IMAGES['side part'],
                theLook: 'Classic side-parted style with modern textured finish',
                whyItWorks: 'Timeless and professional, works for any occasion',
                whatToAskFor: 'Medium length on top, tapered sides, find your natural part line',
                expertTip: 'Find your natural part by pushing hair forward and seeing where it falls',
                instructions: ['Apply light pomade to damp hair', 'Comb into place', 'Add texture with fingers'],
                bestForFaceShapes: ['Oval', 'Square'],
                matchScore: 88,
                isAiGenerated: false
            },
            {
                id: 'fb-3',
                name: 'Textured French Crop',
                gender: 'Male',
                imageUrl: HAIRSTYLE_IMAGES['crop'],
                theLook: 'Short, choppy layers with natural movement and texture',
                whyItWorks: 'Low maintenance yet stylish, enhances natural hair texture',
                whatToAskFor: 'Textured crop with point cutting technique, short sides',
                expertTip: 'Less product is more - just a small amount of matte clay',
                instructions: ['Towel dry to 80%', 'Apply small amount of clay', 'Style with fingers for natural look'],
                bestForFaceShapes: ['Oval', 'Diamond'],
                matchScore: 85,
                isAiGenerated: false
            },
            {
                id: 'fb-4',
                name: 'High Fade with Texture',
                gender: 'Male',
                imageUrl: HAIRSTYLE_IMAGES['fade'],
                theLook: 'Clean high fade with textured, styled top',
                whyItWorks: 'Sharp and modern, creates clean lines that enhance your features',
                whatToAskFor: 'High skin fade, textured top with 2 inches length',
                expertTip: 'Keep the fade fresh every 2-3 weeks for best results',
                instructions: ['Use matte wax', 'Work through dry hair', 'Style upward and to the side'],
                bestForFaceShapes: ['Oval', 'Round'],
                matchScore: 82,
                isAiGenerated: false
            },
            {
                id: 'fb-5',
                name: 'Classic Pompadour',
                gender: 'Male',
                imageUrl: HAIRSTYLE_IMAGES['pompadour'],
                theLook: 'Volume swept back with classic pompadour shape',
                whyItWorks: 'Adds impressive height while maintaining a refined appearance',
                whatToAskFor: 'Leave 4-5 inches on top, taper the sides, no hard lines',
                expertTip: 'Build volume at the roots first before styling back',
                instructions: ['Blow dry roots upward', 'Apply pomade throughout', 'Comb back and up for volume'],
                bestForFaceShapes: ['Oval', 'Square'],
                matchScore: 78,
                isAiGenerated: false
            },
            {
                id: 'fb-6',
                name: 'Messy Fringe',
                gender: 'Male',
                imageUrl: HAIRSTYLE_IMAGES['fringe'],
                theLook: 'Relaxed, effortless style with textured bangs falling forward',
                whyItWorks: 'Creates a youthful, approachable appearance',
                whatToAskFor: 'Longer textured fringe, shorter back and sides',
                expertTip: 'Work product through with fingers only - no combs',
                instructions: ['Air dry or rough dry', 'Apply texture spray or paste', 'Tousle with fingers'],
                bestForFaceShapes: ['Oval', 'Heart'],
                matchScore: 75,
                isAiGenerated: false
            }
        ],
        keyTips: [
            'With your oval face shape, you have the most versatility - experiment with different styles!',
            'Consider your lifestyle when choosing - busy schedules benefit from lower maintenance cuts',
            'Bring reference photos to your stylist for clearer communication'
        ]
    };
}

function getFallbackColorAnalysisResult(): ColorAnalysisResult {
    return {
        skinTone: 'Neutral',
        undertone: 'Balanced with subtle warm undertones',
        season: 'Autumn',
        seasonDescription: 'Your coloring suggests a warm Autumn palette. You have depth and richness to your features that pairs beautifully with earthy, warm tones.',
        bestColors: [
            { id: 'c1', name: 'Rich Chestnut', hexCode: '#5D2906', season: 'Autumn', description: 'Warm brown with golden undertones that adds natural glow', expertTip: 'Add golden highlights for dimension' },
            { id: 'c2', name: 'Copper Red', hexCode: '#B04A00', season: 'Autumn', description: 'Vibrant warm copper that complements warm skin tones', expertTip: 'Use color-depositing conditioner weekly' },
            { id: 'c3', name: 'Caramel Balayage', hexCode: '#C68E17', season: 'Autumn', description: 'Sun-kissed warmth without going too light', expertTip: 'Focus lighter pieces around the face' },
            { id: 'c4', name: 'Warm Chocolate', hexCode: '#3C1414', season: 'Autumn', description: 'Deep brown with subtle red undertones', expertTip: 'Glossing treatments enhance shine' },
            { id: 'c5', name: 'Golden Honey', hexCode: '#E8B960', season: 'Autumn', description: 'Radiant warm blonde for brightening', expertTip: 'Requires regular toning' },
            { id: 'c6', name: 'Auburn', hexCode: '#8B2500', season: 'Autumn', description: 'Classic red-brown blend', expertTip: 'Most versatile shade for autumn colorings' }
        ],
        avoidColors: [
            { name: 'Platinum Blonde', reason: 'Too cool and stark, can wash out warm skin tones' },
            { name: 'Jet Black', reason: 'Creates harsh contrast that can make skin look dull' },
            { name: 'Ash Brown', reason: 'Cool undertones clash with warm complexion' }
        ],
        keyTips: [
            'Warm tones will enhance your natural glow and make your skin look vibrant',
            'Avoid ashy or cool-toned colors that can make skin look sallow or washed out',
            'Rich, deep colors create beautiful contrast with your warm features'
        ]
    };
}
