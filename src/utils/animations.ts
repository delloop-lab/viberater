// Function to get watermark position (bottom right of image)
export const getWatermarkPosition = (watermarkRef: React.RefObject<HTMLDivElement>, imgRef: React.RefObject<HTMLImageElement>) => {
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
      y: rect.bottom - 30
    };
  }
  return {
    x: window.innerWidth - 100,
    y: window.innerHeight - 80
  };
};

// Function to get face center coordinates
export const getFaceCenter = (imgRef: React.RefObject<HTMLImageElement>) => {
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

// Function to show floating hearts animation
export const showFloatingHearts = (watermarkRef: React.RefObject<HTMLDivElement>, imgRef: React.RefObject<HTMLImageElement>, audioEnabled: boolean) => {
  const watermarkPos = getWatermarkPosition(watermarkRef, imgRef);
  // Play multiple pop sounds in rapid succession (only if audio is enabled)
  if (audioEnabled) {
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
  for (let i = 0; i < 25; i++) {
    const heart = document.createElement('div');
    heart.classList.add('floating-heart');
    heart.innerHTML = '💗';
    heart.style.left = `${watermarkPos.x + Math.random() * 120 - 60}px`;
    heart.style.top = `${watermarkPos.y + Math.random() * 20 - 10}px`;
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

// Function to show floating daggers animation
export const showFloatingDaggers = (x: number, y: number, watermarkRef: React.RefObject<HTMLDivElement>, imgRef: React.RefObject<HTMLImageElement>, audioEnabled: boolean) => {
  // Get watermark position for weapons to rain down on
  const watermarkPos = getWatermarkPosition(watermarkRef, imgRef);
  
  // Play multiple dagger sounds in rapid succession (only if audio is enabled)
  if (audioEnabled) {
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
  const weapons = ['🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️'];

  for (let i = 0; i < 12; i++) {
    const dagger = document.createElement('div');
    dagger.classList.add('floating-dagger');
    
    // Mix of different weapon emojis
    const weapons = ['🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️', '🗡️', '🔪', '⚔️'];
    dagger.innerHTML = weapons[i];
    
    // Position weapons above the watermark to rain down
    dagger.style.left = `${watermarkPos.x + Math.random() * 120 - 60}px`;
    dagger.style.top = `${watermarkPos.y - 100}px`;
    dagger.style.position = 'absolute';
    dagger.style.width = '20px';
    dagger.style.height = '20px';
    dagger.style.fontSize = '20px';
    dagger.style.animation = `rainDownDagger 1.2s ease-out forwards`;
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