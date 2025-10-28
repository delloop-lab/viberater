import React, { useEffect, useState } from 'react';

const SharePage = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareImage = urlParams.get('image');
    const text = urlParams.get('text');
    
    if (shareImage) {
      setImageUrl(decodeURIComponent(shareImage));
    }
    if (text) {
      setShareText(decodeURIComponent(text));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {imageUrl && (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt="VibeRaters Result" 
              className="w-full h-auto"
            />
            <div className="absolute top-4 right-4">
              <img src="/vibe.png" alt="VibeRaters" className="w-16 h-16 opacity-80" />
            </div>
          </div>
        )}
        
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">VibeRaters</h1>
          {shareText && (
            <p className="text-gray-600 mb-6">{shareText}</p>
          )}
          <a 
            href="https://viberaters.vercel.app" 
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-bold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
          >
            Create Your Own Vibe
          </a>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
