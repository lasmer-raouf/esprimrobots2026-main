import { useEffect, useState } from 'react';

interface VideoBackgroundProps {
  videoUrl: string;
  type: 'local' | 'youtube' | 'none';
}

export function VideoBackground({ videoUrl, type }: VideoBackgroundProps) {
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');

  useEffect(() => {
    if (type === 'youtube' && videoUrl) {
      // Extract YouTube video ID from various URL formats
      let videoId = '';
      
      if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = videoUrl.split('v=')[1]?.split('&')[0] || '';
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (videoUrl.includes('youtube.com/embed/')) {
        videoId = videoUrl.split('embed/')[1]?.split('?')[0] || '';
      }

      if (videoId) {
        setYoutubeEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`);
      }
    }
  }, [videoUrl, type]);

  if (type === 'none' || !videoUrl) {
    return null;
  }

  if (type === 'youtube') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          src={youtubeEmbedUrl}
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ aspectRatio: '16/9' }}
          allow="autoplay; encrypted-media"
          title="Background video"
        />
        <div className="absolute inset-0 bg-background/60" />
      </div>
    );
  }

  if (type === 'local') {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/60" />
      </div>
    );
  }

  return null;
}
