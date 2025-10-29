import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import html2canvas from 'html2canvas';
import { generateRoast as generateLevelRoast, generateCoupleRoast } from "../roastPhrases";

interface FaceExpressions {
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
  neutral: number;
}

// Helper for correct pronouns
const getPronouns = (gender: string) => {
  if (gender === 'male') {
    return { subject: 'He', object: 'him', possessive: 'his' };
  } else {
    return { subject: 'She', object: 'her', possessive: 'her' };
  }
};

interface FaceData {
  age: number;
  gender: string;
}

export default function TwoSelfieMood() {
  // All hooks and related constants go here!
  const roastLevelEmojis: Record<string, string> = {
    L: '??',
    G: '??',
    P: '??',
    A: '??',
    X: '??',
    XXX: '??',
    H: '??',
  };
  const roastLevelLabels: Record<string, string> = {
    L: 'Love You',
    G: 'Gentle',
    P: 'Playful',
    A: 'Average',
    X: 'Extreme',
    XXX: 'XXX',
    H: 'Not So Like You',
  };
  const [lastRoastLevel, setLastRoastLevel] = useState<string>('');
  const [buttonBounce, setButtonBounce] = useState<string | null>(null);

  const [faceData, setFaceData] = useState<FaceData[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);
  const [statement, setStatement] = useState<string>("");
  const [secondStatement, setSecondStatement] = useState<string>("");
  const [roast, setRoast] = useState<string>("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const [shareWarning, setShareWarning] = useState<string>('');
  const [mode, setMode] = useState<'nice' | 'roast'>('nice');
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);
  const [cloudinaryLoading, setCloudinaryLoading] = useState(false);
  const [cloudinaryError, setCloudinaryError] = useState('');
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState<string | null>(null);
  const [roastLevel, setRoastLevel] = useState<'G' | 'P' | 'A' | 'X' | 'XXX'>('A');
  const [showRoastDropdown, setShowRoastDropdown] = useState(false);
  const [useHawkingVoice, setUseHawkingVoice] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const watermarkRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);
  const urlTextRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setError('');
        setLoadingStatus('Loading face detection model...');
        await (faceapi.nets.tinyFaceDetector as any).loadFromUri('/models');
        setLoadingStatus('Loading age and gender model...');
        await (faceapi.nets.ageGenderNet as any).loadFromUri('/models');
        setLoadingStatus('Loading expression model...');
        await (faceapi.nets.faceExpressionNet as any).loadFromUri('/models');
        setLoadingStatus('');
        setModelsLoaded(true);
        console.log('All models loaded successfully');
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face detection models. Please make sure the models are in the public/models directory.');
        setLoadingStatus('');
      }
    };
    loadModels();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImgLoaded(false);
      setStatement("I'm Ready!");
      setSecondStatement("");
      setFaceData([]);
      setRoast("");
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!modelsLoaded) {
      console.log('Models not loaded yet');
      setStatement('Models are still loading...');
      return;
    }

    if (!imgRef.current) {
      console.log('No image reference found');
      return;
    }

    if (!imgRef.current.complete) {
      console.log('Image not fully loaded yet');
      return;
    }

    setIsAnalyzing(true);
    setStatement('Analyzing...');
    try {
      console.log('Starting face detection...');
      console.log('Image dimensions:', imgRef.current.width, 'x', imgRef.current.height);
      
      const detections = await faceapi
        .detectAllFaces(imgRef.current, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender()
        .withFaceExpressions();

      console.log('Detection results:', detections);

      if (detections.length > 2) {
        setStatement("Whoa! Too many beautiful people. Trim it down to just one or two.");
        setIsAnalyzing(false);
        return;
      }

      if (!detections || detections.length === 0) {
        console.log('No faces detected in image');
        setStatement('No face detected. Please try a different image or angle.');
        return;
      }

      const allFaceData = detections.map(d => ({ age: d.age, gender: d.gender }));

      setStatement(`Found ${detections.length} faces. Running personality scan...`);
      setSecondStatement("");
      setFaceData([]);
      setIsScanning(true);

      // Play beep sounds for each dot
      const playBuzz = (frequency: number) => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'square';
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
          console.log('Buzz audio failed to play:', e);
        }
      };

      // Play chaotic buzzes at different frequencies
      // First dot - multiple chaotic buzzes
      playBuzz(800);
      setTimeout(() => playBuzz(1200), 100);
      setTimeout(() => playBuzz(600), 200);
      setTimeout(() => playBuzz(1000), 350);
      setTimeout(() => playBuzz(1400), 450);
      
      // Second dot - multiple chaotic buzzes
      setTimeout(() => playBuzz(900), 1000);
      setTimeout(() => playBuzz(1300), 1100);
      setTimeout(() => playBuzz(700), 1200);
      setTimeout(() => playBuzz(1100), 1350);
      setTimeout(() => playBuzz(1500), 1450);
      
      // Third dot - multiple chaotic buzzes
      setTimeout(() => playBuzz(1000), 2000);
      setTimeout(() => playBuzz(1400), 2100);
      setTimeout(() => playBuzz(800), 2200);
      setTimeout(() => playBuzz(1200), 2350);
      setTimeout(() => playBuzz(1600), 2450);
      setTimeout(() => playBuzz(600), 2550);

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
        setFaceData(allFaceData);
        setStatement("");
        setSecondStatement("Scan complete — pick your vibe and let's go!");
        scanTimeoutRef.current = null;
      }, 3000); // 3 seconds for 3 blinks

    } catch (err) {
      console.error('Error analyzing face:', err);
      setStatement('Error analyzing face. Please try again.');
      
      // Stop scan sound on error
      if (beepAudioRef.current) {
        beepAudioRef.current.pause();
        beepAudioRef.current.currentTime = 0;
      }
      setIsScanning(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShare = async () => {
    setShareWarning('');
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: '#ffffff'
    });
    if (canvas.width === 0 || canvas.height === 0) {
      setShareWarning('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/jpeg');
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'viberaters.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'VibeRaters', text: 'Check out my VibeRaters result!' });
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'viberaters.jpg';
      link.click();
    }
  };

  const handleDownload = async () => {
    setShareWarning('');
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: '#ffffff'
    });
    if (canvas.width === 0 || canvas.height === 0) {
      setShareWarning('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'viberaters.jpg';
    link.click();
  };

  const handleCopy = async () => {
    console.log('=== COPY BUTTON DEBUG ===');
    console.log('cloudinaryUrl:', cloudinaryUrl);
    console.log('cloudinaryLoading:', cloudinaryLoading);
    console.log('cloudinaryError:', cloudinaryError);
    console.log('imageUrl:', imageUrl);
    console.log('statement:', statement);
    console.log('imgLoaded:', imgLoaded);
    
    if (cloudinaryUrl) {
      try {
        await navigator.clipboard.writeText(cloudinaryUrl);
        alert('Image URL copied to clipboard!');
      } catch (e) {
        alert('Failed to copy URL to clipboard.');
      }
    } else {
      alert('No image URL available. Please wait for the image to upload.');
    }
  };

  // Ensure we have a fresh composed image URL (captures current DOM and uploads if missing)
  const ensureComposedImage = async (): Promise<{ url: string | null; publicId: string | null }> => {
    try {
      if (cloudinaryUrl && cloudinaryPublicId) return { url: cloudinaryUrl, publicId: cloudinaryPublicId };
      if (!shareRef.current) return { url: null, publicId: null };
      // Give the DOM a tick to render the latest roast/watermark
      await new Promise((r) => setTimeout(r, 150));
      const canvas = await html2canvas(shareRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });
      if (canvas.width === 0 || canvas.height === 0) return { url: null, publicId: null };
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg'));
      if (!blob) return { url: null, publicId: null };
      const publicId = `viberater_${Date.now()}`;
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', 'viberater');
      formData.append('public_id', publicId);
      const response = await fetch('https://api.cloudinary.com/v1_1/dovuirnzm/image/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        setCloudinaryUrl(data.secure_url);
        setCloudinaryPublicId(data.public_id || publicId);
        return { url: data.secure_url as string, publicId: (data.public_id || publicId) as string };
      }
      return { url: null, publicId: null };
    } catch (e) {
      return { url: null, publicId: null };
    }
  };

  const handleSocialDownload = async (platform: string) => {
    if (!roast) {
      alert('Please choose a vibe first!');
      return;
    }
    
    if (!imageUrl) {
      alert('No photo selected. Please choose a photo first.');
      return;
    }
    
    if (!shareRef.current) {
      alert('Image not ready. Please wait and try again.');
      return;
    }
    
    console.log('=== SHARE DEBUG ===');
    console.log('shareRef.current:', shareRef.current);
    console.log('shareRef HTML:', shareRef.current.innerHTML.substring(0, 200));
    console.log('roast:', roast);
    console.log('imageUrl:', imageUrl);
    
    try {
      // Wait a moment to ensure DOM is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(shareRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: true
      });
      
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        alert('Could not capture the image. Please try again.');
        return;
      }
      
      // Convert to blob for clipboard
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      
      // Download the image first
      const dataUrl = canvas.toDataURL('image/jpeg');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `viberaters-${platform}.jpg`;
      link.click();
      
      // Redirect to social media platform IMMEDIATELY (before alert to avoid popup blockers)
      const platformUrls: Record<string, string> = {
        'X': 'https://x.com/compose/tweet',
        'Facebook': 'https://www.facebook.com/',
        'WhatsApp': 'https://web.whatsapp.com/',
        'Instagram': 'https://www.instagram.com/',
        'TikTok': 'https://www.tiktok.com/upload'
      };
      
      // Open platform BEFORE showing alert to prevent popup blockers
      if (platformUrls[platform]) {
        window.open(platformUrls[platform], '_blank');
      }
      
      // Show instructions based on platform
      if (platform === 'Facebook') {
        alert(`Image downloaded to your device!\n\nOn Facebook:\n1. Click "Photo/Video"\n2. Select the downloaded image\n3. Add your caption and post!`);
      } else {
        alert(`Image downloaded to your device!\n\nUpload it to ${platform} to share your vibe!`);
      }
      
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to prepare image. Please try again.');
    }
  };

  // Automatically upload to Cloudinary when a roast is generated
  useEffect(() => {
    if (!roast || !imageUrl || !imgLoaded || !shareRef.current) {
      return;
    }

    const autoUpload = async () => {
      // Use a short timeout to ensure the DOM is updated with the roast before capturing
      await new Promise(resolve => setTimeout(resolve, 100));

      setCloudinaryError('');
      setCloudinaryUrl(null);
      setCloudinaryLoading(true);

      console.log('=== CLOUDINARY UPLOAD with roast DEBUG ===');
      console.log('roast:', roast);
      
      try {
        const canvas = await html2canvas(shareRef.current!, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          backgroundColor: '#ffffff'
        });
        
        if (canvas.width === 0 || canvas.height === 0) {
          setCloudinaryError('Could not capture the image for upload.');
          setCloudinaryLoading(false);
          return;
        }
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setCloudinaryError('Failed to create image blob for upload.');
            setCloudinaryLoading(false);
            return;
          }

          const formData = new FormData();
          formData.append('file', blob);
          formData.append('upload_preset', 'viberater');
          // Add a unique public_id to prevent caching issues on social media
          formData.append('public_id', `viberater_${Date.now()}`);
          
          try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dovuirnzm/image/upload', {
              method: 'POST',
              body: formData
            });
            const data = await response.json();

            if (data.secure_url) {
              setCloudinaryUrl(data.secure_url);
              setCloudinaryPublicId(data.public_id || null);
            } else {
              setCloudinaryError('Cloudinary upload failed: ' + (data.error?.message || 'Unknown error'));
            }
          } catch (e) {
            setCloudinaryError('Cloudinary upload failed.');
          } finally {
            setCloudinaryLoading(false);
          }
        }, 'image/jpeg');
      } catch (err) {
        console.error('html2canvas error during upload:', err);
        setCloudinaryError('Failed to capture image for upload.');
        setCloudinaryLoading(false);
      }
    };

    autoUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roast, imageUrl, imgLoaded]);

  useEffect(() => {
    if (imageUrl && imgLoaded && statement && statement === "I'm Ready!") {
      handleAnalyze();
    }
    // eslint-disable-next-line
  }, [imageUrl, imgLoaded, statement]);

  // Cleanup scan audio on unmount
  useEffect(() => {
    return () => {
      if (beepAudioRef.current) {
        beepAudioRef.current.pause();
        beepAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Function to speak the roast text
  const speakRoast = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      setIsAudioPlaying(true);
      // Add extra space after commas for more pause
      const processedText = text.replace(/,/g, ',  ');
      const utterance = new window.SpeechSynthesisUtterance(processedText);
      utterance.rate = 0.5;
      utterance.pitch = 1;
      
      utterance.onend = () => {
        setIsAudioPlaying(false);
      };
      
      utterance.onerror = () => {
        setIsAudioPlaying(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Update handleLevelRoast to only set the roast, not speak automatically
  const handleLevelRoast = (level: 'G' | 'P' | 'A' | 'X' | 'XXX' | 'L' | 'H') => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setIsScanning(false);

    let roastText = "";
    if (faceData.length === 1) {
      roastText = generateLevelRoast(level);
    } else if (faceData.length === 2) {
      if (level === 'L') {
        roastText = "You two look lovely together. No notes, just vibes.";
      } else if (level === 'H') {
        roastText = "A couple? Great, twice the disappointment.";
      } else {
        roastText = generateCoupleRoast({
          age1: Math.round(faceData[0].age),
          gender1: faceData[0].gender as "male" | "female" | "other",
          age2: Math.round(faceData[1].age),
          gender2: faceData[1].gender as "male" | "female" | "other",
          level: level,
        });
      }
    } else {
      roastText = "Whoa! Too many beautiful people. Trim it down to just one or two.";
    }

    setRoast(roastText);
    setStatement("");
    setSecondStatement("");
    setLastRoastLevel(level);
    setButtonBounce(level);
    setTimeout(() => setButtonBounce(''), 400);
  };

  // Add Surprise Me button handler
  const handleSurpriseMe = () => {
    const randomLevel = ['L', 'G', 'P', 'A', 'X', 'XXX', 'H'][Math.floor(Math.random() * 7)];
    handleLevelRoast(randomLevel as any);
  };

  // Add Copy Roast handler
  const handleCopyRoast = async () => {
    if (roast) {
      try {
        await navigator.clipboard.writeText(roast);
        alert('Roast copied to clipboard!');
      } catch {
        alert('Failed to copy roast.');
      }
    }
  };

  // Function to show floating hearts animation
  const showFloatingHearts = (shouldPlayAudio: boolean = false) => {
    const urlArea = getUrlAreaCoordinates();
    // Play multiple pop sounds in rapid succession (only if audio is enabled)
    if (shouldPlayAudio || audioEnabled) {
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          try {
            const audio = new Audio('/audio/pop.wav');
            audio.volume = 0.3;
            audio.playbackRate = 0.8 + Math.random() * 0.4; // Randomize pitch slightly
            audio.play().catch(e => {});
          } catch (e) {}
        }, i * 50);
      }
    }
    
    // Array of positive icons including flowers, hearts, stars, etc.
    const positiveIcons = ['❤️', '🌹', '🌸', '🌺', '🌻', '🌼', '🌷', '💐', '⭐', '✨', '🌟', '💖', '💕', '💗', '💓', '💝', '🌺', '🌷', '🌹', '🌸', '🌼', '🌻', '🌺', '🌷', '🌹'];
    
    for (let i = 0; i < 25; i++) {
      const heart = document.createElement('div');
      heart.classList.add('floating-heart');
      heart.innerHTML = positiveIcons[i % positiveIcons.length];
      heart.style.left = `${urlArea.x + Math.random() * 120 - 60}px`;
      heart.style.top = `${urlArea.y - 30 + Math.random() * 20 - 10}px`;
      heart.style.position = 'absolute';
      heart.style.width = '20px';
      heart.style.height = '20px';
      heart.style.fontSize = '20px';
      heart.style.animation = `floatUp 3s ease-out forwards`;
      heart.style.animationDelay = i === 0 ? '0s' : `${Math.random() * 0.6}s`;
      heart.style.pointerEvents = 'none';
      heart.style.opacity = '0.8';
      heart.style.zIndex = '1000';
      document.body.appendChild(heart);
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
      }, 3000);
    }
  };

  // Function to get face center coordinates
  const getFaceCenter = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    // Fallback to center of viewport
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
  };

  // Function to get image bottom center coordinates
  const getImageBottomCenter = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.bottom - 20
      };
    }
    // Fallback to bottom center of viewport
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight - 100
    };
  };

  // Function to get URL area coordinates (where viberaters.vercel.app appears)
  const getUrlAreaCoordinates = () => {
    if (urlTextRef.current) {
      const rect = urlTextRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    // Fallback to bottom center of viewport
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight - 100
    };
  };

  // Function to enable audio (call this on first user interaction)
  const enableAudio = () => {
    setAudioEnabled(true);
    console.log('Audio enabled');
  };

  // Function to show floating daggers animation
  const showFloatingDaggers = (x: number, y: number, shouldPlayAudio: boolean = false) => {
    // Get URL area coordinates for weapons to rise up from
    const urlArea = getUrlAreaCoordinates();
    
    // Play multiple dagger sounds in rapid succession (only if audio is enabled)
    if (shouldPlayAudio || audioEnabled) {
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          try {
            const audio = new Audio('/audio/knife.mp3'); // Using the new knife sound
            audio.volume = 0.3;
            audio.playbackRate = 1.0 + Math.random() * 0.4; // Slight pitch variation
            audio.play().catch(e => console.error('Knife sound failed:', e));
          } catch (e) {
            console.error('Knife audio creation failed:', e);
          }
        }, i * 80); // Play every 80ms for dagger effect
      }
    }

    // Array of different weapon emojis
    const weapons = ['🗡️', '⚔️', '🔪', '💀', '☠️', '⚰️', '🪦', '💣', '🧨', '🔥', '⚡', '💥'];

    for (let i = 0; i < 12; i++) {
      const dagger = document.createElement('div');
      dagger.classList.add('floating-dagger');
      
      // Mix of different weapon emojis
      dagger.innerHTML = weapons[i % weapons.length];
      
      // Position weapons at the URL area to rise up
      dagger.style.left = `${urlArea.x + Math.random() * 120 - 60}px`;
      dagger.style.top = `${urlArea.y}px`;
      dagger.style.position = 'absolute';
      dagger.style.width = '20px';
      dagger.style.height = '20px';
      dagger.style.fontSize = '20px';
      dagger.style.animation = `floatUp 1.2s ease-out forwards`;
      dagger.style.animationDelay = i === 0 ? '0s' : `${Math.random() * 0.6}s`;
      dagger.style.pointerEvents = 'none';
      dagger.style.opacity = '0.9';
      dagger.style.zIndex = '1000';
      
      document.body.appendChild(dagger);

      setTimeout(() => {
        if (dagger.parentNode) {
          dagger.parentNode.removeChild(dagger);
        }
      }, 1200 + (parseFloat(dagger.style.animationDelay) * 1000 || 0));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-pink-100 via-blue-100 to-teal-100">
      {/* Header */}
      <div className="shrink-0 p-2 text-center">
        <img src="/vibe.png" alt="VibeRaters Logo" className="mx-auto w-40 sm:w-48" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-2 w-full min-h-0">
        <div className="w-full max-w-md mx-auto">
          <div className="flex flex-col space-y-4 w-full">
            <div className="flex-none px-4 flex flex-col gap-2">
              {/* Camera Input */}
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleImageUpload}
                className="hidden"
                id="camera-upload"
              />
              {/* Gallery Input */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="gallery-upload"
              />
              
              {/* Two buttons side by side */}
              <div className="flex gap-2 items-center">
                <label
                  htmlFor="camera-upload"
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-center bg-[#B1CDBE] text-black font-semibold text-sm sm:text-base rounded-xl cursor-pointer hover:bg-[#9CB7A9] transition-all duration-300 shadow-md hover:shadow-xl border border-white/60"
                >
                  📸 Snap a Photo
                </label>
                <span className="text-gray-700 font-bold text-sm sm:text-base px-1">OR</span>
                <label
                  htmlFor="gallery-upload"
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-center bg-[#B1CDBE] text-black font-semibold text-sm sm:text-base rounded-xl cursor-pointer hover:bg-[#9CB7A9] transition-all duration-300 shadow-md hover:shadow-xl border border-white/60"
                >
                  🖼️ Choose One
                </label>
              </div>
              
              <p className="text-center text-gray-700 text-xs sm:text-sm font-medium">
                Vibe it, share it!
              </p>
            </div>
            
            <div className="flex-none px-4">
              <img 
                src="/it-works.png" 
                alt="How it works" 
                className="w-full rounded-xl shadow-md"
              />
            </div>

            {imageUrl && (
              <div ref={shareRef} className="relative grid grid-cols-1 w-full gap-4 bg-transparent">
                {/* Image Container */}
                <div className="relative rounded-lg overflow-hidden shadow-xl border-none bg-white/80 flex flex-col justify-start" style={{ minHeight: '350px' }}>
                  <div className="relative w-full flex-grow flex items-center justify-center p-2">
                    <img
                      ref={imgRef}
                      src={imageUrl}
                      alt="Selfie"
                      className="w-full h-full object-cover rounded-lg"
                      onLoad={() => {
                        setImgLoaded(true);
                        setStatement("I'm Ready!");
                        setSecondStatement("");
                        setRoast("");
                        console.log('Image loaded successfully');
                      }}
                    />
                    {!imgLoaded && (
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/50">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>

                  <div className="text-[#555555] text-base sm:text-lg font-medium p-4 text-center bg-white/50 w-full flex items-center justify-center" style={{ minHeight: '120px' }}>
                    {!roast ? (
                      <div>
                        {isScanning ? (
                          <>
                            <span>{statement}</span>
                            <span className="blinking-text">...</span>
                          </>
                        ) : faceData.length > 0 ? (
                          <>
                            {faceData.length === 2 && <div className="font-bold mb-2">Couple Detected</div>}
                            {faceData.map((face, index) => (
                              <div key={index}>
                                ID confirmed: {Math.round(face.age)}-year-old {face.gender}.
                              </div>
                            ))}
                            <div className="mt-2">{secondStatement}</div>
                          </>
                        ) : (
                          statement && statement !== "I'm Ready!" && <span>{statement}</span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-800 text-base sm:text-lg font-medium">
                          {roast}
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2" ref={urlTextRef}>
                          Get your pic rated at viberaters.vercel.app
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-4 right-4 pointer-events-none flex flex-col items-end">
                    <img src="/vibe.png" alt="VibeRaters" className="w-24 sm:w-32 opacity-70" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-4 sm:space-y-8 h-full min-h-0">
        {loadingStatus && (
          <div className="bg-blue-200/60 border border-blue-300 text-blue-800 px-4 py-3 rounded-xl shadow-sm text-sm sm:text-base">
            {loadingStatus}
          </div>
        )}
        
        {error && (
          <div className="bg-red-200/60 border border-red-300 text-red-800 px-4 py-3 rounded-xl shadow-sm text-sm sm:text-base">
            {error}
          </div>
        )}
      </div>

      {imageUrl && imgLoaded && (
        <div className="w-full flex flex-col items-center mt-2 pb-4 overflow-y-auto flex-shrink-0">
          {/* Roast Level Buttons */}
          <div className="flex flex-col gap-2 sm:gap-4 my-1 sm:my-2 justify-center items-center w-full max-w-full px-2">
            {/* Tell them how you feel */}
            <div className="flex flex-col gap-1 sm:gap-3 items-center">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1C1C1C] drop-shadow-sm text-center">
                Tell them how you feel
              </h3>
              <div className="flex flex-row gap-1 sm:gap-4 justify-center items-center flex-wrap">
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    handleLevelRoast('L');
                    const faceCenter = getFaceCenter();
                    showFloatingHearts(shouldPlayAudio); // Pass audio state directly
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-[#F3D66B] text-black text-xs sm:text-base md:text-lg hover:bg-yellow-500 transition-all ${buttonBounce === 'L' ? 'animate-bounce-smooth' : ''}`}
                >
                  I LOVE YOU
                </button>
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    handleLevelRoast('H');
                    const faceCenter = getFaceCenter();
                    showFloatingDaggers(faceCenter.x, faceCenter.y, shouldPlayAudio); // Pass audio state directly
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-gray-600 text-white text-xs sm:text-base md:text-lg hover:bg-gray-800 transition-all ${buttonBounce === 'H' ? 'animate-bounce' : ''}`}
                >
                  I NO LIKE YOU
                </button>
              </div>
            </div>
            
            {/* Roast them how you will */}
            <div className="flex flex-col gap-1 sm:gap-3 items-center">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1C1C1C] drop-shadow-sm text-center">
                Roast them how you will
              </h3>
              <div className="flex justify-center flex-wrap gap-2 sm:gap-4 mt-4">
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    if (shouldPlayAudio || audioEnabled) {
                      try {
                        const audio = new Audio('/audio/harp.wav');
                        audio.volume = 0.3;
                        audio.play().catch(e => {});
                      } catch (e) {}
                    }
                    handleLevelRoast('G');
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-[#A9CBB7] text-black text-xs sm:text-base md:text-lg hover:bg-green-500 transition-all ${buttonBounce === 'G' ? 'animate-bounce-smooth' : ''}`}
                >
                  Gentle
                </button>
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    if (shouldPlayAudio || audioEnabled) {
                      try {
                        const audio = new Audio('/audio/squeak.wav');
                        audio.volume = 0.3;
                        audio.play().catch(e => {});
                      } catch (e) {}
                    }
                    handleLevelRoast('P');
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-[#F3D66B] text-black text-xs sm:text-base md:text-lg hover:bg-yellow-500 transition-all ${buttonBounce === 'P' ? 'animate-bounce-smooth' : ''}`}
                >
                  Playful
                </button>
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    if (shouldPlayAudio || audioEnabled) {
                      try {
                        const audio = new Audio('/audio/bop.wav');
                        audio.volume = 0.3;
                        audio.play().catch(e => {});
                      } catch (e) {}
                    }
                    handleLevelRoast('A');
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-[#9A8FD9] text-white text-xs sm:text-base md:text-lg hover:bg-purple-500 transition-all ${buttonBounce === 'A' ? 'animate-bounce-smooth' : ''}`}
                >
                  Average
                </button>
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    if (shouldPlayAudio || audioEnabled) {
                      try {
                        const audio = new Audio('/audio/glitch.wav');
                        audio.volume = 0.3;
                        audio.play().catch(e => {});
                      } catch (e) {}
                    }
                    handleLevelRoast('X');
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-gray-500 text-white text-xs sm:text-base md:text-lg hover:bg-gray-600 transition-all ${buttonBounce === 'X' ? 'animate-bounce' : ''}`}
                >
                  Bitter
                </button>
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    if (shouldPlayAudio || audioEnabled) {
                      try {
                        const audio = new Audio('/audio/glitch.wav');
                        audio.volume = 0.3;
                        audio.play().catch(e => {});
                      } catch (e) {}
                    }
                    handleLevelRoast('XXX');
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-gray-700 text-white text-xs sm:text-base md:text-lg hover:bg-gray-800 transition-all ${buttonBounce === 'XXX' ? 'animate-bounce' : ''}`}
                >
                  Extreme
                </button>
              </div>
            </div>
          </div>
          {/* Social Media Share Section */}
          <div className="w-full flex flex-col items-center mt-2 sm:mt-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1C1C1C] drop-shadow-sm mb-1 sm:mb-2 text-center">
              Share it with them
            </h3>
            <div className="flex flex-wrap gap-1 sm:gap-3 justify-center">
              {/* X (formerly Twitter) */}
              <div className="relative group">
                <button
                  onClick={() => handleSocialDownload('X')}
                  className="p-2 text-black transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download for X"
                  disabled={!roast}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Download for X'}
                </span>
              </div>
              {/* Facebook */}
              <div className="relative group">
                <button
                  onClick={() => handleSocialDownload('Facebook')}
                  className="p-2 text-[#1877F3] transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download for Facebook"
                  disabled={!roast}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Download for Facebook'}
                </span>
              </div>
              {/* WhatsApp */}
              <div className="relative group">
                <button
                  onClick={() => handleSocialDownload('WhatsApp')}
                  className="p-2 text-[#25D366] transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download for WhatsApp"
                  disabled={!roast}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.75 13.96c.25.58.93.94 1.5.94.7 0 1.41-.44 1.41-1.57 0-1.33-1.01-1.57-2.03-1.57h-.43c-.72 0-1.41.13-2.03.38-.61.25-1.01.75-1.01 1.41 0 .67.41 1.18 1.01 1.43.63.25 1.31.38 2.03.38h.38c.18 0 .37-.01.55-.04zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1.5-5.5h-1.63c-.68 0-1.25-.57-1.25-1.25s.57-1.25 1.25-1.25h3.25c.68 0 1.25.57 1.25 1.25s-.57 1.25-1.25 1.25h-1.62c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5h1.38c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5z"></path></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Download for WhatsApp'}
                </span>
              </div>
              {/* Instagram */}
              <div className="relative group">
                <button
                  onClick={() => handleSocialDownload('Instagram')}
                  className="p-2 text-[#E1306C] transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download for Instagram"
                  disabled={!roast}
                >
                  <svg className="w-8 h-8" viewBox="0 0 448 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9 114.9-51.3 114.9-114.9S287.7 141 224.1 141zm0 186c-39.5 0-71.5-32-71.5-71.5s32-71.5 71.5-71.5 71.5 32 71.5 71.5-32 71.5-71.5 71.5zm146.4-194.3c0 14.9-12 26.9-26.9 26.9s-26.9-12-26.9-26.9 12-26.9 26.9-26.9 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.3-9.9-66.7-36.2-92.1C385.6 9.9 354.2 1.7 318.9 0 281.7-1.7 166.3-1.7 129.1 0 93.8 1.7 62.4 9.9 37.1 35.2 9.9 62.4 1.7 93.8 0 129.1c-1.7 37.2-1.7 152.6 0 189.8 1.7 35.3 9.9 66.7 36.2 92.1 27.2 27.2 58.6 35.4 93.9 37.1 37.2 1.7 152.6 1.7 189.8 0 35.3-1.7 66.7-9.9 92.1-36.2 27.2-27.2 35.4-58.6 37.1-93.9 1.7-37.2 1.7-152.6 0-189.8zM398.8 388c-7.8 19.6-22.9 34.7-42.5 42.5-29.4 11.7-99.2 9-132.3 9s-102.9 2.6-132.3-9c-19.6-7.8-34.7-22.9-42.5-42.5-11.7-29.4-9-99.2-9-132.3s-2.6-102.9 9-132.3c7.8-19.6 22.9-34.7 42.5-42.5 29.4-11.7 99.2-9 132.3-9s102.9-2.6 132.3 9c19.6 7.8 34.7 22.9 42.5 42.5 11.7 29.4 9 99.2 9 132.3s2.6 102.9-9 132.3z"/></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Download for Instagram'}
                </span>
              </div>
              {/* TikTok */}
              <div className="relative group">
                <button
                  onClick={() => handleSocialDownload('TikTok')}
                  className="p-2 text-gray-700 transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download for TikTok"
                  disabled={!roast}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.86-.95-6.69-2.81-1.77-1.8-2.6-4.28-2.5-6.75-.02-2.5.9-4.97 2.69-6.75 1.87-1.86 4.4-2.67 6.96-2.55.02 1.57-.01 3.14-.02 4.71-.6.02-1.2.1-1.79.23-1.07.23-2.05.65-2.89 1.38-1.16 1.05-1.6 2.53-1.54 4.07.02.89.31 1.78.82 2.51.53.76 1.29 1.3 2.16 1.62.9.31 1.85.34 2.76.13.9-.21 1.75-.62 2.45-1.27.22-.2.43-.41.64-.63.02-1.57.01-3.14.01-4.71z"></path></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Download for TikTok'}
                </span>
              </div>
              {/* Copy */}
              <div className="relative group">
                <button
                  onClick={handleCopy}
                  className="p-2 text-blue-500 transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Copy Image URL"
                  disabled={!roast || cloudinaryLoading}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Copy the image URL to share!'}
                </span>
              </div>
              {/* Download */}
              <div className="relative group">
                <button
                  onClick={handleDownload}
                  className="p-2 text-green-500 transition-opacity duration-200 hover:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Download Image"
                  disabled={!roast}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13v4h-2v-4H9.5L12 10.5 14.5 13H17z"></path></svg>
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {!roast ? 'Choose a vibe first!' : 'Download the image to share!'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {shareWarning && (
        <div className="mt-2 text-red-600 font-semibold text-sm sm:text-base px-2">{shareWarning}</div>
      )}
      <footer className="w-full text-center py-2 sm:py-4 text-blue-900/60 text-xs sm:text-sm font-medium select-none">
        Copyright © 2025 <a href="mailto:silvervirtual@gmail.com" className="hover:text-blue-700 transition-colors">Lou Schillaci</a>
      </footer>
    </div>
  );
}