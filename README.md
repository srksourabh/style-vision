# StyleVision AI 💇‍♀️✨

AI-powered hairstyle and hair color recommendation app using Google's Gemini AI.

![StyleVision AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- **Face Analysis**: AI analyzes your face shape, features, and current hair type
- **Hairstyle Recommendations**: Get 6 personalized hairstyle suggestions ranked by suitability
- **Color Analysis**: Discover your skin tone, undertone, and color season
- **Hair Color Recommendations**: Get 6 complementary hair color suggestions with hex codes
- **Expert Tips**: Receive personalized styling and color advice

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Google Gemini API key ([Get one free](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/srksourabh/style-vision.git
cd style-vision
git checkout mvp-clean
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file and add your Gemini API key:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Upload a clear photo of your face (front-facing works best)
2. Choose between "Hairstyle Analysis" or "Color Analysis"
3. Click "Analyze" and wait for the AI to process your image
4. Browse through personalized recommendations
5. Click on any recommendation to see detailed styling tips

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.0 Flash
- **Icons**: Lucide React

## API Usage

The app uses the Gemini 2.0 Flash model for:
- Face shape and feature detection
- Hair type and texture analysis
- Personalized recommendation generation
- Skin tone and undertone analysis

## Privacy

- Photos are processed client-side and sent directly to Google's Gemini API
- No images are stored on any server
- Analysis results are not saved after the session ends

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
