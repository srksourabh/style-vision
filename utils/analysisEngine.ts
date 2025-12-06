export type FaceShape = 'Oval' | 'Square' | 'Round' | 'Diamond' | 'Heart' | 'Triangle';
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
    expertTip: string;
    suitabilityReason: string;
    instructions: string[];
    bestForFaceShapes: FaceShape[];
}

export interface AnalysisResult {
    faceShape: FaceShape;
    jawline: Jawline;
    skinTone: SkinTone;
    recommendedStyles: Hairstyle[];
}

export interface ColorAnalysisResult {
    skinTone: SkinTone;
    season: Season;
    bestColors: HairColor[];
    avoidColors: string[];
}

const COLOR_DATABASE: HairColor[] = [
    // WINTER (Cool & Dark)
    { id: 'c1', name: 'Jet Black', hexCode: '#0a0a0a', season: 'Winter', description: 'Deep, cool black matches high contrast features.', expertTip: 'Use a blue-black toner for extra shine.' },
    { id: 'c2', name: 'Icy Platinum', hexCode: '#e0e0e0', season: 'Winter', description: 'Striking contrast for cool undertones.', expertTip: 'Requires purple shampoo maintenance.' },
    { id: 'c3', name: 'Deep Plum', hexCode: '#4a1a2c', season: 'Winter', description: 'Rich purple hues bring out cool skin.', expertTip: 'Great for adding dimension to dark hair.' },

    // SUMMER (Cool & Light)
    { id: 'c4', name: 'Ash Blonde', hexCode: '#b2b2b2', season: 'Summer', description: 'Muted cool tones that don’t overpower.', expertTip: 'Ask for a root smudge for a natural grow-out.' },
    { id: 'c5', name: 'Mushroom Brown', hexCode: '#7b6d61', season: 'Summer', description: 'Earthy, cool neutral brown.', expertTip: 'Perfect transition from blonde to brunette.' },
    { id: 'c6', name: 'Pastel Pink', hexCode: '#ffd1dc', season: 'Summer', description: 'Soft, airy color for delicate features.', expertTip: 'Fades fast, wash with cold water.' },

    // AUTUMN (Warm & Dark)
    { id: 'c7', name: 'Rich Chestnut', hexCode: '#5d2906', season: 'Autumn', description: 'Warm, golden brown adds glow.', expertTip: 'Golden highlights frame the face beautifully.' },
    { id: 'c8', name: 'Copper Red', hexCode: '#b04a00', season: 'Autumn', description: 'Vibrant warmth for warm skin tones.', expertTip: 'Use color-depositing conditioner to keep it bright.' },
    { id: 'c9', name: 'Caramel Balayage', hexCode: '#c68e17', season: 'Autumn', description: 'Sun-kissed depth without going too light.', expertTip: 'Focus the lightest pieces around the face.' },

    // SPRING (Warm & Light)
    { id: 'c10', name: 'Golden Honey', hexCode: '#eebb55', season: 'Spring', description: 'Radiant and bright for warm complexions.', expertTip: 'Gloss treatments are key for this shine.' },
    { id: 'c11', name: 'Strawberry Blonde', hexCode: '#ffcea0', season: 'Spring', description: 'A playful mix of red and gold.', expertTip: 'Looks amazing with freckles.' },
    { id: 'c12', name: 'Warm Beige', hexCode: '#dcc0a0', season: 'Spring', description: 'Creamy neutral that leans warm.', expertTip: 'A timeless, sophisticated shade.' },
];

const HAIRSTYLE_DATABASE: Hairstyle[] = [
    // MALE HAIRSTYLES
    {
        id: 'm1',
        name: "The Texture Quiff",
        gender: "Male",
        imageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=300&h=400&fit=crop",
        expertTip: "Jawed Habib Tip: Use point cutting on the top to create movement without thinning out the volume too much.",
        suitabilityReason: "The height of the quiff elongates the face, balancing wide cheekbones or a strong jaw.",
        instructions: [
            "Fade the sides triggered from #1 to #2.",
            "Leave 3-4 inches on top.",
            "Point cut for texture.",
            "Blow dry upwards with a round brush."
        ],
        bestForFaceShapes: ['Square', 'Round', 'Oval']
    },
    {
        id: 'm2',
        name: "Modern Pompadour",
        gender: "Male",
        imageUrl: "https://images.unsplash.com/photo-1503951914205-2d60d5b8b990?q=80&w=300&h=400&fit=crop",
        expertTip: "Alim Hakim Tip: Keep the edges sharp but the transition soft to maintain a gentleman’s look.",
        suitabilityReason: "Adds volume on top which suits rounder faces by adding verticality.",
        instructions: [
            "Scissor over comb for the sides.",
            "Maintain length at the fringe.",
            "Use matte clay for hold.",
            "Comb back with volume."
        ],
        bestForFaceShapes: ['Round', 'Triangle', 'Oval']
    },
    {
        id: 'm3',
        name: "Textured Crop",
        gender: "Male",
        imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=300&h=400&fit=crop",
        expertTip: "StyleVision Pro Tip: Works best with sea salt spray to enhance natural wave.",
        suitabilityReason: "The fringe breaks up a longer forehead or diamond face shape.",
        instructions: [
            "High skin fade.",
            "Blunt cut fringe.",
            "Deep point cutting on crown.",
            "Style with texture powder."
        ],
        bestForFaceShapes: ['Diamond', 'Oval', 'Heart']
    },
    {
        id: 'm4',
        name: "Classic Side Part",
        gender: "Male",
        imageUrl: "https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?q=80&w=300&h=400&fit=crop",
        expertTip: "Jawed Habib Tip: Define the parting line with a razor for a crisp, timeless finish.",
        suitabilityReason: "An asymmetrical style that softens square jawlines.",
        instructions: [
            "Taper the neck and ears.",
            "Leave weight on the parietal ridge.",
            "Razor the part line.",
            "Finish with high-shine pomade."
        ],
        bestForFaceShapes: ['Square', 'Oval']
    },
    {
        id: 'm5',
        name: "Surfer Waves",
        gender: "Male",
        imageUrl: "https://images.unsplash.com/photo-1521119989659-a83eee488058?q=80&w=300&h=400&fit=crop",
        expertTip: "Alim Hakim Tip: Don't over-wash. Natural oils help this style sit better.",
        suitabilityReason: "Softens angular features of diamond or rectangle faces.",
        instructions: [
            "Long layers throughout.",
            "Feather the ends.",
            "Use leave-in conditioner.",
            "Air dry for natural texture."
        ],
        bestForFaceShapes: ['Diamond', 'Square']
    },

    // FEMALE HAIRSTYLES
    {
        id: 'f1',
        name: "Long Layers with Curtain Bangs",
        gender: "Female",
        imageUrl: "https://images.unsplash.com/photo-1519699047748-40baea614fda?q=80&w=300&h=400&fit=crop",
        expertTip: "Jawed Habib Tip: Cut the bangs starting from the nose bridge to frame the eyes perfectly.",
        suitabilityReason: "Curtain bangs slim down a round face and emphasize cheekbones on an oval face.",
        instructions: [
            "Face-framing layers.",
            "Soft curtain bangs blended into sides.",
            "Point cut ends for softness.",
            "Blowout with large round brush."
        ],
        bestForFaceShapes: ['Round', 'Oval', 'Square']
    },
    {
        id: 'f2',
        name: "Textured Bob",
        gender: "Female",
        imageUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=300&h=400&fit=crop",
        expertTip: "Alim Hakim Tip: Keep the nape slightly shorter for a modern profile silhouette.",
        suitabilityReason: "Adds width to the jawline, balancing a heart-shaped or diamond face.",
        instructions: [
            "Chin-length bob.",
            "Internal layering for volume.",
            "Slight graduation at nape.",
            "Messy wave finish."
        ],
        bestForFaceShapes: ['Diamond', 'Heart', 'Oval']
    },
    {
        id: 'f3',
        name: "Sleek High Pony",
        gender: "Female",
        imageUrl: "https://images.unsplash.com/photo-1619420656799-73e4b78971f1?q=80&w=300&h=400&fit=crop",
        expertTip: "StyleVision Pro Tip: Wrap a strand of hair around the elastic for a runway-ready look.",
        suitabilityReason: "Draws the eyes up, lifting the face. Great for balancing round faces.",
        instructions: [
            "Straighten hair bone-straight.",
            "Gather at the crown.",
            "Smooth flyaways with gel.",
            "Secure tightly."
        ],
        bestForFaceShapes: ['Round', 'Square']
    },
    {
        id: 'f4',
        name: "Pixie Cut",
        gender: "Female",
        imageUrl: "https://images.unsplash.com/photo-1627447990176-58be780cf2a4?q=80&w=300&h=400&fit=crop",
        expertTip: "Jawed Habib Tip: Keep the sideburns soft to prevent it from looking too masculine.",
        suitabilityReason: "Highlights delicate features. Perfect for oval and heart shapes.",
        instructions: [
            "Tight sides and back.",
            "Choppy layers on top.",
            "Soft fringe.",
            "Use wax for definition."
        ],
        bestForFaceShapes: ['Oval', 'Heart']
    },
    {
        id: 'f5',
        name: "Hollywood Waves",
        gender: "Female",
        imageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a97e4?q=80&w=300&h=400&fit=crop",
        expertTip: "Alim Hakim Tip: Pin the curls while they cool to set the shape for longer duration.",
        suitabilityReason: "Softens sharp jawlines of square faces with flowing curves.",
        instructions: [
            "Deep side part.",
            "Use 1.5 inch curling iron.",
            "Brush out curls into glossy waves.",
            "Set with strong hold spray."
        ],
        bestForFaceShapes: ['Square', 'Diamond']
    }
];

export const analyzeFace = async (imageSrc: string): Promise<AnalysisResult> => {
    return new Promise((resolve) => {
        // Simulate AI Processing Delay
        setTimeout(() => {
            // Mock Data Generation
            const shapes: FaceShape[] = ['Oval', 'Square', 'Round', 'Diamond', 'Heart', 'Triangle'];
            const jawlines: Jawline[] = ['Soft', 'Sharp', 'Defined'];
            const skinTones: SkinTone[] = ['Warm', 'Neutral', 'Cool'];

            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];

            const recommendations = HAIRSTYLE_DATABASE.filter(
                style => style.bestForFaceShapes.includes(randomShape)
            );

            resolve({
                faceShape: randomShape,
                jawline: jawlines[Math.floor(Math.random() * jawlines.length)],
                skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
                recommendedStyles: recommendations
            });
        }, 3000);
    });
};

export const analyzeColor = async (imageSrc: string): Promise<ColorAnalysisResult> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const skinTones: SkinTone[] = ['Warm', 'Cool', 'Neutral'];
            const seasons: Record<string, Season[]> = {
                'Warm': ['Spring', 'Autumn'],
                'Cool': ['Summer', 'Winter'],
                'Neutral': ['Autumn', 'Summer'] // Simplified for mock
            };

            const selectedSkinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
            const possibleSeasons = seasons[selectedSkinTone];
            const selectedSeason = possibleSeasons[Math.floor(Math.random() * possibleSeasons.length)];

            const recommendations = COLOR_DATABASE.filter(c => c.season === selectedSeason);

            const avoidMap: Record<Season, string[]> = {
                'Winter': ['Golden Blonde', 'Warm Copper', 'Orange Reds'],
                'Summer': ['Jet Black', 'Brass Gold', 'Yellow Undertones'],
                'Autumn': ['Platinum', 'Ash colors', 'Blue-Black'],
                'Spring': ['Dark Ash', 'Black', 'Cool Silvers']
            };

            resolve({
                skinTone: selectedSkinTone,
                season: selectedSeason,
                bestColors: recommendations,
                avoidColors: avoidMap[selectedSeason]
            });
        }, 3000);
    });
};
