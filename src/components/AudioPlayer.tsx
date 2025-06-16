import React from 'react';

interface AudioPlayerProps {
  previewUrl?: string;
  externalUrl?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ previewUrl, externalUrl }) => {
  if (!externalUrl) return null;

  return (
    <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
      <div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          View on Last.fm
        </a>
        <p className="text-sm text-gray-400 mt-1">Click to view track details and listen on Last.fm</p>
      </div>
    </div>
  );
}; 