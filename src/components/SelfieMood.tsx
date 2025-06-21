import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import html2canvas from 'html2canvas';
import { generateRoast as generateLevelRoast } from "../roastPhrases";

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

export default function SelfieMood() {
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
  const [roastLevel, setRoastLevel] = useState<'G' | 'P' | 'A' | 'X' | 'XXX'>('A');
  const [showRoastDropdown, setShowRoastDropdown] = useState(false);
  const [useHawkingVoice, setUseHawkingVoice] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const watermarkRef = useRef<HTMLDivElement>(null);

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
      
      const detection = await faceapi
        .detectSingleFace(imgRef.current, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender()
        .withFaceExpressions();

      console.log('Detection result:', detection);

      if (!detection) {
        console.log('No face detected in image');
        setStatement('No face detected. Please try a different image or angle.');
        return;
      }

      const { age, gender, expressions } = detection;
      console.log('Age:', age);
      console.log('Gender:', gender);
      console.log('Expressions:', expressions);
      
      setStatement(`Lookie here, we have a ${Math.round(age)} year old ${gender}!`);
      setSecondStatement("Now it's your turn, use the buttons to tell 'em how you feel!");
    } catch (err) {
      console.error('Error analyzing face:', err);
      setStatement('Error analyzing face. Please try again.');
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
        alert('Cloudinary URL copied to clipboard!');
      } catch (e) {
        alert('Failed to copy URL to clipboard.');
      }
    } else {
      alert('No image URL available. Please wait for the image to upload.');
    }
  };

  const handleFacebookShare = async () => {
    alert('To share on Facebook: 1) Download the image, 2) Go to Facebook, 3) Create a post and upload the image. Facebook does not allow direct image sharing from web apps.');
    window.open('https://www.facebook.com/', '_blank');
  };

  // Automatically upload to Cloudinary when image, statement, and imgLoaded are ready
  useEffect(() => {
    // Only upload if statement is not a loading message and all are ready
    if (
      !imageUrl ||
      !statement ||
      !imgLoaded ||
      statement === 'Loading image...' ||
      statement === '' ||
      !shareRef.current
    ) return;
    setCloudinaryError('');
    setCloudinaryUrl(null);
    setCloudinaryLoading(true);
    const autoUpload = async () => {
      console.log('=== CLOUDINARY UPLOAD DEBUG ===');
      console.log('imageUrl:', imageUrl ? 'YES' : 'NO');
      console.log('statement:', statement);
      console.log('imgLoaded:', imgLoaded);
      console.log('shareRef.current:', shareRef.current ? 'YES' : 'NO');
      
      const canvas = await html2canvas(shareRef.current!, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff'
      });
      console.log('Canvas captured:', canvas.width, 'x', canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        console.log('? Canvas is empty');
        setCloudinaryError('Could not capture the image. Please make sure the selfie is visible and fully loaded.');
        setCloudinaryLoading(false);
        return;
      }
      
      console.log('Converting canvas to blob...');
      canvas.toBlob(async (blob) => {
        console.log('Blob created:', blob ? 'YES' : 'NO');
        if (blob) {
          const formData = new FormData();
          formData.append('file', blob);
          formData.append('upload_preset', 'viberater');
          console.log('Uploading to Cloudinary...');
          console.log('Blob size:', blob.size, 'bytes');
          console.log('Blob type:', blob.type);
          console.log('FormData entries:');
          for (let [key, value] of formData.entries()) {
            console.log('  ', key, ':', value);
          }
          try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dovuirnzm/image/upload', {
              method: 'POST',
              body: formData
            });
            console.log('Cloudinary response status:', response.status);
            console.log('Cloudinary response headers:', response.headers);
            const data = await response.json();
            console.log('Cloudinary response data:', data);
            console.log('Cloudinary response data type:', typeof data);
            console.log('Cloudinary response keys:', Object.keys(data));
            if (data.secure_url) {
              console.log('? Cloudinary upload successful:', data.secure_url);
              setCloudinaryUrl(data.secure_url);
            } else {
              console.log('? Cloudinary upload failed - no secure_url');
              console.log('? Full Cloudinary response:', JSON.stringify(data, null, 2));
              console.log('? Cloudinary error object:', data.error);
              console.log('? Cloudinary error message:', data.error?.message);
              console.log('? Cloudinary error code:', data.error?.http_code);
              setCloudinaryError('Cloudinary upload failed: ' + (data.error?.message || 'Unknown error'));
            }
          } catch (e) {
            console.error('? Cloudinary upload fetch error:', e);
            setCloudinaryError('Cloudinary upload failed.');
          } finally {
            setCloudinaryLoading(false);
          }
        } else {
          console.log('? Failed to create blob');
          setCloudinaryError('Failed to create image blob.');
          setCloudinaryLoading(false);
        }
      }, 'image/jpeg');
    };
    autoUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, statement, imgLoaded]);

  useEffect(() => {
    if (imageUrl && imgLoaded && statement && statement === "I'm Ready!") {
      handleAnalyze();
    }
    // eslint-disable-next-line
  }, [imageUrl, imgLoaded, statement]);

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
    const roastText = generateLevelRoast(level);
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
    const imageBottomCenter = getImageBottomCenter();
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
      heart.style.left = `${imageBottomCenter.x + Math.random() * 120 - 60}px`;
      heart.style.top = `${imageBottomCenter.y - 30 + Math.random() * 20 - 10}px`;
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

  // Function to get watermark position (top right of image)
  const getWatermarkPosition = () => {
    if (watermarkRef.current) {
      const rect = watermarkRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      return {
        x: rect.right - 50,
        y: rect.top + 30
      };
    }
    return {
      x: window.innerWidth - 100,
      y: 80
    };
  };

  // Function to enable audio (call this on first user interaction)
  const enableAudio = () => {
    setAudioEnabled(true);
    console.log('Audio enabled');
  };

  // Function to show floating daggers animation
  const showFloatingDaggers = (x: number, y: number, shouldPlayAudio: boolean = false) => {
    // Get image bottom center for weapons to rise up from
    const imageBottomCenter = getImageBottomCenter();
    
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
      
      // Position weapons at the bottom center to rise up
      dagger.style.left = `${imageBottomCenter.x + Math.random() * 120 - 60}px`;
      dagger.style.top = `${imageBottomCenter.y}px`;
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
      <div className="shrink-0 p-4 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-transparent bg-clip-text drop-shadow-lg">
          VibeRaters
        </h1>
        <div className="mt-1 flex justify-center">
          <span className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-700/80 drop-shadow-sm px-2 sm:px-4 py-1 rounded-xl">
            Pick a face, any face, we'll generate the vibe and give you the words.
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-2 w-full min-h-0">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="flex flex-col space-y-4 w-full">
            <div className="flex-none">
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="block w-full px-3 py-2 sm:px-4 sm:py-3 text-center bg-blue-500 text-white font-semibold text-sm sm:text-base rounded-xl cursor-pointer hover:bg-blue-600 transition-all duration-300 shadow-md hover:shadow-xl border border-white/60 backdrop-blur-md"
                >
                  Upload someone's selfie
                </label>
              </div>
            </div>

            {imageUrl && (
              <div ref={shareRef} className="relative grid grid-cols-1 w-full gap-4 bg-transparent">
                {/* Image Container */}
                <div className="relative rounded-lg overflow-hidden shadow-xl border-none bg-white/60 backdrop-blur-lg flex flex-col justify-start" style={{ minHeight: '350px' }}>
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
                        <div className="text-white text-center">
                          <div className="text-lg font-semibold mb-2">I'm Ready.</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {roast ? (
                    <p className="text-gray-800 text-base sm:text-lg font-medium p-4 text-center bg-white/50 w-full">
                      {roast}
                    </p>
                  ) : (
                    <>
                      {statement && (
                        <p className="text-blue-900 text-base sm:text-lg font-medium p-4 text-center bg-white/50 w-full">
                          {statement}
                        </p>
                      )}
                      {secondStatement && (
                        <p className="text-blue-900 text-base sm:text-lg font-medium p-4 text-center bg-white/50 w-full">
                          {secondStatement}
                        </p>
                      )}
                    </>
                  )}

                  <div className="absolute top-4 right-4 pointer-events-none">
                    <div ref={watermarkRef} className="text-2xl sm:text-3xl font-bold text-white select-none" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      VibeRaters
                    </div>
                    <div className="text-sm sm:text-base font-medium text-white select-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                      viberaters.vercel.app
                    </div>
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
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm text-center">
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
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-pink-500 text-white text-xs sm:text-base md:text-lg hover:bg-pink-600 transition-all ${buttonBounce === 'L' ? 'animate-bounce-smooth' : ''}`}
                >
                  Love You !!
                </button>
                <button
                  onClick={() => {
                    const shouldPlayAudio = !audioEnabled; // Check if this is the first interaction
                    enableAudio(); // Enable audio on first interaction
                    handleLevelRoast('H');
                    const faceCenter = getFaceCenter();
                    showFloatingDaggers(faceCenter.x, faceCenter.y, shouldPlayAudio); // Pass audio state directly
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-gray-400 text-gray-900 text-xs sm:text-base md:text-lg hover:bg-gray-500 transition-all ${buttonBounce === 'H' ? 'animate-bounce' : ''}`}
                >
                  No Like You !!
                </button>
              </div>
            </div>
            
            {/* Roast them how you will */}
            <div className="flex flex-col gap-1 sm:gap-3 items-center">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm text-center">
                Roast them how you will
              </h3>
              <div className="flex flex-row flex-wrap gap-1 sm:gap-4 justify-center items-center">
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
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-green-500 text-white text-xs sm:text-base md:text-lg hover:bg-green-600 transition-all ${buttonBounce === 'G' ? 'animate-bounce-smooth' : ''}`}
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
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-yellow-400 text-gray-900 text-xs sm:text-base md:text-lg hover:bg-yellow-500 transition-all ${buttonBounce === 'P' ? 'animate-bounce-smooth' : ''}`}
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
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-blue-500 text-white text-xs sm:text-base md:text-lg hover:bg-blue-600 transition-all ${buttonBounce === 'A' ? 'animate-bounce-smooth' : ''}`}
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
                    handleLevelRoast('XXX');
                  }}
                  className={`px-2 sm:px-4 py-0.5 sm:py-2 rounded-lg sm:rounded-xl font-bold sm:font-extrabold shadow-md sm:shadow-lg bg-black text-white text-xs sm:text-base md:text-lg hover:bg-gray-900 transition-all ${buttonBounce === 'XXX' ? 'animate-bounce' : ''}`}
                >
                  Extreme
                </button>
              </div>
            </div>
          </div>
          {/* Social Media Share Section */}
          <div className="w-full flex flex-col items-center mt-2 sm:mt-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm mb-1 sm:mb-2 text-center">
              Share it with them
            </h3>
            <div className="flex flex-wrap gap-1 sm:gap-3 justify-center">
              {/* Twitter */}
              <button
                onClick={() => {
                  const text = encodeURIComponent('Check out my VibeRaters result!');
                  const url = encodeURIComponent(cloudinaryUrl || window.location.origin);
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                }}
                className="p-2 text-[#1DA1F2] transition-opacity duration-200 hover:opacity-75"
                aria-label="Share on Twitter"
                title="Share on Twitter"
                disabled={cloudinaryLoading}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.46 5.924c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.965-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.014-4.49 4.5 0 .353.04.697.116 1.027C7.728 9.37 4.1 7.6 1.67 4.905a4.48 4.48 0 0 0-.61 2.264c0 1.563.796 2.944 2.01 3.755a4.48 4.48 0 0 1-2.034-.563v.057c0 2.184 1.553 4.006 3.617 4.422a4.48 4.48 0 0 1-2.027.077c.572 1.785 2.23 3.084 4.196 3.12A8.98 8.98 0 0 1 2 19.54a12.7 12.7 0 0 0 6.92 2.03c8.303 0 12.85-6.876 12.85-12.84 0-.196-.004-.392-.013-.586A9.18 9.18 0 0 0 24 4.59a8.98 8.98 0 0 1-2.54.698z"/></svg>
              </button>
              {/* Facebook */}
              <button
                onClick={() => {
                  const text = encodeURIComponent('Check out my VibeRaters result!');
                  const url = encodeURIComponent(cloudinaryUrl || window.location.origin);
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
                }}
                className="p-2 text-[#1877F3] transition-opacity duration-200 hover:opacity-75"
                aria-label="Share on Facebook"
                title="Share on Facebook"
                disabled={cloudinaryLoading}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
              </button>
              {/* WhatsApp */}
              <button
                onClick={() => {
                  const text = encodeURIComponent('Check out my VibeRaters result! ' + (cloudinaryUrl || window.location.origin));
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="p-2 text-[#25D366] transition-opacity duration-200 hover:opacity-75"
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
                disabled={cloudinaryLoading}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.363.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.617h-.001a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374A9.86 9.86 0 0 1 0 11.513C0 5.156 5.149 0 11.495 0c2.729 0 5.296 1.065 7.223 2.998a10.13 10.13 0 0 1 2.985 7.217c-.003 6.346-5.152 11.484-11.497 11.484m8.413-19.897A11.815 11.815 0 0 0 11.495 0C5.148 0 0 5.156 0 11.513c0 2.026.523 4.008 1.523 5.748L.017 24l6.305-1.654a11.876 11.876 0 0 0 5.178 1.241h.005c6.347 0 11.495-5.138 11.498-11.484a11.82 11.82 0 0 0-3.48-8.413"/></svg>
              </button>
                          {/* Instagram */}
              <button
                onClick={() => {
                  alert('Instagram does not support direct web sharing. Please download your image and upload it manually to Instagram.');
                  window.open('https://www.instagram.com/', '_blank');
                }}
                className="p-2 text-[#E1306C] transition-opacity duration-200 hover:opacity-75"
                aria-label="Share on Instagram"
                title="Share on Instagram"
                disabled={cloudinaryLoading}
              >
                <svg className="w-8 h-8" viewBox="0 0 448 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9 114.9-51.3 114.9-114.9S287.7 141 224.1 141zm0 186c-39.5 0-71.5-32-71.5-71.5s32-71.5 71.5-71.5 71.5 32 71.5 71.5-32 71.5-71.5 71.5zm146.4-194.3c0 14.9-12 26.9-26.9 26.9s-26.9-12-26.9-26.9 12-26.9 26.9-26.9 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.3-9.9-66.7-36.2-92.1C385.6 9.9 354.2 1.7 318.9 0 281.7-1.7 166.3-1.7 129.1 0 93.8 1.7 62.4 9.9 37.1 35.2 9.9 62.4 1.7 93.8 0 129.1c-1.7 37.2-1.7 152.6 0 189.8 1.7 35.3 9.9 66.7 36.2 92.1 27.2 27.2 58.6 35.4 93.9 37.1 37.2 1.7 152.6 1.7 189.8 0 35.3-1.7 66.7-9.9 92.1-36.2 27.2-27.2 35.4-58.6 37.1-93.9 1.7-37.2 1.7-152.6 0-189.8zM398.8 388c-7.8 19.6-22.9 34.7-42.5 42.5-29.4 11.7-99.2 9-132.3 9s-102.9 2.6-132.3-9c-19.6-7.8-34.7-22.9-42.5-42.5-11.7-29.4-9-99.2-9-132.3s-2.6-102.9 9-132.3c7.8-19.6 22.9-34.7 42.5-42.5 29.4-11.7 99.2-9 132.3-9s102.9-2.6 132.3 9c19.6 7.8 34.7 22.9 42.5 42.5 11.7 29.4 9 99.2 9 132.3s2.6 102.9-9 132.3z"/></svg>
              </button>
              {/* TikTok */}
              <button
                onClick={() => {
                  alert('TikTok does not support direct web sharing. Please download your image and upload it manually to TikTok.');
                  window.open('https://www.tiktok.com/upload', '_blank');
                }}
                className="p-2 text-black transition-opacity duration-200 hover:opacity-75"
                aria-label="Share on TikTok"
                title="Share on TikTok"
                disabled={cloudinaryLoading}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </button>
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="p-2 text-blue-500 transition-opacity duration-200 hover:opacity-75"
                aria-label="Copy Image URL"
                title="Copy Image URL"
                disabled={cloudinaryLoading}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              </button>
              {/* Download */}
              <button
                onClick={handleDownload}
                className="p-2 text-green-500 transition-opacity duration-200 hover:opacity-75"
                aria-label="Download Image"
                title="Download Image"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {shareWarning && (
        <div className="mt-2 text-red-600 font-semibold text-sm sm:text-base px-2">{shareWarning}</div>
      )}
      <footer className="w-full text-center py-2 sm:py-4 text-blue-900/60 text-xs sm:text-sm font-medium select-none">
        Copyright (c) Lou Schillaci
      </footer>
    </div>
  );
}