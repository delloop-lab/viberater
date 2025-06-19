import 'face-api.js';

declare module 'face-api.js' {
  interface TinyFaceDetector {
    loadFromUri(uri: string): Promise<void>;
  }
  interface AgeGenderNet {
    loadFromUri(uri: string): Promise<void>;
  }
  interface FaceExpressionNet {
    loadFromUri(uri: string): Promise<void>;
  }
} 