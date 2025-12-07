// Face Detection Utility using skin-tone based detection
// This is a lightweight approach that works without heavy ML models

// Types
export interface FaceBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FaceDetectionResult {
    detected: boolean;
    faceBox: FaceBox | null;
    isInOval: boolean;
    message: string;
    confidence: number;
}

// Simple face detection using canvas pixel analysis
export class FaceDetector {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private isInitialized: boolean = false;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    }

    async initialize(): Promise<void> {
        this.isInitialized = true;
    }

    // Check if a detected face is within the oval guide
    checkFaceInOval(
        faceBox: FaceBox,
        videoWidth: number,
        videoHeight: number,
        ovalWidth: number = 260,
        ovalHeight: number = 340
    ): boolean {
        // Calculate oval center (center of video)
        const ovalCenterX = videoWidth / 2;
        const ovalCenterY = videoHeight / 2;
        
        // Calculate face center
        const faceCenterX = faceBox.x + faceBox.width / 2;
        const faceCenterY = faceBox.y + faceBox.height / 2;
        
        // Scale oval to video coordinates
        const scaleX = videoWidth / 640;
        const scaleY = videoHeight / 480;
        
        const scaledOvalWidth = ovalWidth * scaleX;
        const scaledOvalHeight = ovalHeight * scaleY;
        
        // Check if face center is within oval bounds (with some margin)
        const margin = 0.15;
        const dx = (faceCenterX - ovalCenterX) / (scaledOvalWidth / 2 * (1 - margin));
        const dy = (faceCenterY - ovalCenterY) / (scaledOvalHeight / 2 * (1 - margin));
        
        // Ellipse equation: (x/a)² + (y/b)² ≤ 1
        const isInside = (dx * dx + dy * dy) <= 1;
        
        // Also check face size is appropriate
        const minFaceSize = Math.min(scaledOvalWidth, scaledOvalHeight) * 0.4;
        const maxFaceSize = Math.min(scaledOvalWidth, scaledOvalHeight) * 1.2;
        const faceSize = Math.max(faceBox.width, faceBox.height);
        
        const isSizeAppropriate = faceSize >= minFaceSize && faceSize <= maxFaceSize;
        
        return isInside && isSizeAppropriate;
    }

    // Detect skin-tone regions to find face area
    async detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Draw mirrored video frame
        this.ctx.translate(width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(video, 0, 0, width, height);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        try {
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // Find skin-tone pixels using YCbCr color space
            const skinPixels: { x: number; y: number }[] = [];
            
            // Sample every 4th pixel for performance
            for (let y = 0; y < height; y += 4) {
                for (let x = 0; x < width; x += 4) {
                    const idx = (y * width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Convert RGB to YCbCr
                    const y_val = 0.299 * r + 0.587 * g + 0.114 * b;
                    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
                    
                    // Skin tone detection thresholds
                    if (y_val > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173) {
                        skinPixels.push({ x, y });
                    }
                }
            }
            
            // If we found enough skin pixels, estimate face region
            if (skinPixels.length > 100) {
                let minX = width, maxX = 0, minY = height, maxY = 0;
                
                for (const pixel of skinPixels) {
                    minX = Math.min(minX, pixel.x);
                    maxX = Math.max(maxX, pixel.x);
                    minY = Math.min(minY, pixel.y);
                    maxY = Math.max(maxY, pixel.y);
                }
                
                const padding = 20;
                const faceBox: FaceBox = {
                    x: Math.max(0, minX - padding),
                    y: Math.max(0, minY - padding),
                    width: Math.min(width - minX + padding, maxX - minX + padding * 2),
                    height: Math.min(height - minY + padding, maxY - minY + padding * 2)
                };
                
                const faceArea = faceBox.width * faceBox.height;
                const expectedMinPixels = faceArea * 0.1 / 16;
                const confidence = Math.min(1, skinPixels.length / expectedMinPixels);
                
                const isInOval = this.checkFaceInOval(faceBox, width, height);
                
                let message = '';
                if (isInOval) {
                    message = 'Perfect! Hold still...';
                } else {
                    const faceCenterX = faceBox.x + faceBox.width / 2;
                    const faceCenterY = faceBox.y + faceBox.height / 2;
                    const centerX = width / 2;
                    const centerY = height / 2;
                    
                    if (faceCenterX < centerX - 50) {
                        message = 'Move right';
                    } else if (faceCenterX > centerX + 50) {
                        message = 'Move left';
                    } else if (faceCenterY < centerY - 30) {
                        message = 'Move down';
                    } else if (faceCenterY > centerY + 30) {
                        message = 'Move up';
                    } else if (faceBox.width < 100) {
                        message = 'Move closer';
                    } else if (faceBox.width > 300) {
                        message = 'Move back';
                    } else {
                        message = 'Align face with oval';
                    }
                }
                
                return {
                    detected: true,
                    faceBox,
                    isInOval,
                    message,
                    confidence: confidence > 0.5 ? confidence : 0.5
                };
            }
            
            return {
                detected: false,
                faceBox: null,
                isInOval: false,
                message: 'Position your face in the oval',
                confidence: 0
            };
            
        } catch (error) {
            console.error('Face detection error:', error);
            return {
                detected: false,
                faceBox: null,
                isInOval: false,
                message: 'Detection error',
                confidence: 0
            };
        }
    }

    dispose(): void {
        this.isInitialized = false;
    }
}

// Singleton instance
let detectorInstance: FaceDetector | null = null;

export const getFaceDetector = (): FaceDetector => {
    if (!detectorInstance) {
        detectorInstance = new FaceDetector();
    }
    return detectorInstance;
};
