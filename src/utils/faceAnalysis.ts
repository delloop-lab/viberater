import * as faceapi from 'face-api.js';
import { FaceExpressions } from '../types/face';

// Face detection and analysis functions
export const handleAnalyze = async (imgRef: React.RefObject<HTMLImageElement>) => {
  if (!imgRef.current) {
    console.log('❌ No image reference found');
    return null;
  }

  try {
    console.log('🔍 Starting face analysis...');
    
    // Load models if not already loaded
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models'),
      faceapi.nets.ageGenderNet.loadFromUri('/models')
    ]);

    console.log('✅ Models loaded successfully');

    // Detect faces with expressions and age/gender
    const detections = await faceapi
      .detectAllFaces(imgRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    console.log('🔍 Face detection results:', detections);

    if (detections.length === 0) {
      console.log('❌ No faces detected');
      return null;
    }

    // Use the first detected face
    const face = detections[0];
    console.log('✅ Face detected:', face);

    // Extract expressions
    const expressions = face.expressions as FaceExpressions;
    console.log('😊 Expressions:', expressions);

    // Find the dominant expression
    const dominantExpression = Object.entries(expressions).reduce((a, b) => 
      expressions[a[0] as keyof FaceExpressions] > expressions[b[0] as keyof FaceExpressions] ? a : b
    )[0];

    console.log('🎭 Dominant expression:', dominantExpression);

    // Extract age and gender
    const age = Math.round(face.age);
    const gender = face.gender;
    const genderProbability = face.genderProbability;

    console.log(`👤 Age: ${age}, Gender: ${gender} (${(genderProbability * 100).toFixed(1)}% confidence)`);

    return {
      mood: dominantExpression,
      age: age.toString(),
      gender: gender.toLowerCase(),
      expressions,
      ageValue: age,
      genderValue: gender,
      genderProbability
    };

  } catch (error) {
    console.error('❌ Face analysis failed:', error);
    return null;
  }
};

export const generateDescription = (analysis: any) => {
  if (!analysis) return "I'm Ready!";
  
  const { mood, age, gender, expressions } = analysis;
  
  // Create a detailed description
  const description = `Detected: ${mood} ${gender}, age ${age}`;
  
  // Add expression details
  const topExpressions = Object.entries(expressions)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([emotion, value]) => `${emotion}: ${((value as number) * 100).toFixed(1)}%`)
    .join(', ');
  
  return `${description}\nExpressions: ${topExpressions}`;
}; 