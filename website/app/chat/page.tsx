'use client';
import { useEffect, useRef } from 'react';

export default function ChatPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Resize iframe dynamically
    const resizeIframe = () => {
      if (iframeRef.current) {
        iframeRef.current.style.height = `${window.innerHeight - 0}px`;
      }
    };
    window.addEventListener('resize', resizeIframe);
    resizeIframe();
    return () => window.removeEventListener('resize', resizeIframe);
  }, []);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#0a0a0a', // PHANTOM FM dark background
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <iframe
        ref={iframeRef}
        src="https://aptio-convicted-old-writing.trycloudflare.com" // Change to your public Cloudflare Tunnel if needed
        title="PHANTOM FM IRC Chat" // this is what it will be called for now
        style={{
          border: 'none',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          colorScheme: 'dark',
        }}
      />
    </div>
  );
}