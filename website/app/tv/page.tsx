"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

const channels = [
  {
    id: "LSrrc7HKkZc",
    name: "PHANTOM FM",
    status: "LIVE",
  },

  {
    id: "jfKfPfyJRdk",
    name: "ANALOG",
    status: "ACTIVE",
  },

  {
    id: "DWcJFNfaw9c",
    name: "NIGHT SIGNAL",
    status: "CONNECTED",
  },

  {
    id: "5qap5aO4i9A",
    name: "NULL",
    status: "UNSTABLE",
  },
];

export default function TVPage() {
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [volume, setVolume] = useState(20);

  const [currentChannel, setCurrentChannel] = useState(0);

  useEffect(() => {
    const tag = document.createElement("script");

    tag.src = "https://www.youtube.com/iframe_api";

    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player(
        playerContainerRef.current as HTMLElement,
        {
          videoId: channels[currentChannel].id,

          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            loop: 1,
            playlist: channels[currentChannel].id,
          },

          events: {
            onReady: (event: any) => {
              event.target.setVolume(volume);
              event.target.mute();
              event.target.playVideo();
            },
          },
        }
      );
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current) return;

    playerRef.current.loadVideoById(
      channels[currentChannel].id
    );

    playerRef.current.setVolume(volume);

    if (audioEnabled) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
  }, [currentChannel]);

  useEffect(() => {
    if (!playerRef.current) return;

    playerRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!playerRef.current) return;

    if (audioEnabled) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
  }, [audioEnabled]);

  return (
    <main className="min-h-screen bg-black text-pink-600 overflow-hidden relative flex">

      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* Scanlines */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,0,120,0.08)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="relative z-10 w-[260px] border-r border-pink-900 p-6 bg-black/60">

        <h2 className="text-red-500 tracking-[0.3em] text-xl mb-8">
          CHANNELS
        </h2>

        <div className="flex flex-col gap-4">

          {channels.map((channel, index) => (
            <button
              key={channel.name}
              onClick={() => setCurrentChannel(index)}
              className={`border p-4 text-left transition-all ${
                currentChannel === index
                  ? "border-pink-500 bg-pink-900/20"
                  : "border-pink-900 hover:bg-pink-900/10"
              }`}
            >

              <div className="flex justify-between items-center">

                <span className="tracking-[0.2em]">
                  CH 0{index + 1}
                </span>

                <span className="text-xs text-green-500">
                  {channel.status}
                </span>

              </div>

              <div className="mt-2 text-lg text-pink-400 tracking-[0.2em]">
                {channel.name}
              </div>

            </button>
          ))}

        </div>

      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative">

        {/* Return Home */}
        <div className="absolute top-8 left-8 z-20">

          <a
            href="/"
            className="border border-pink-900 px-5 py-3 text-pink-500 tracking-[0.3em] hover:bg-pink-900/20 transition-all"
          >
            ← RETURN HOME
          </a>

        </div>

        {/* TV Container */}
        <div className="relative z-10 border border-pink-900 bg-black/80 p-8 shadow-[0_0_40px_rgba(255,0,120,0.2)] w-[900px]">

          {/* Header */}
          <div className="flex justify-between items-center border-b border-pink-900 pb-4">

            <h1 className="text-3xl tracking-[0.4em] text-red-500">
              {channels[currentChannel].name}
            </h1>

            <span className="text-red-500 animate-pulse tracking-[0.2em]">
              ● LIVE TRANSMISSION
            </span>

          </div>

          {/* Audio Controls */}
          <div className="mt-6 flex items-center justify-between gap-6 border border-pink-900 p-4">

            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="border border-pink-900 px-6 py-3 text-pink-500 tracking-[0.3em] hover:bg-pink-900/20 transition-all"
            >
              {audioEnabled
                ? "● TV AUDIO LINK : ENABLED"
                : "○ TV AUDIO LINK : DISABLED"}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-4 text-sm tracking-[0.2em]">

              <span>VOLUME</span>

              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="accent-pink-600 w-40"
              />

              <span className="w-10 text-right">
                {volume}%
              </span>

            </div>

          </div>

          {/* Live Broadcast */}
          <div className="relative mt-8 h-[500px] border border-pink-900 overflow-hidden bg-black">

            {/* YouTube Player */}
            <div
              ref={playerContainerRef}
              className="absolute inset-0 w-full h-full"
            />

            {/* CRT Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20" />

            {/* Glow Overlay */}
            <div className="absolute inset-0 bg-pink-900/10 pointer-events-none" />

            {/* LIVE Badge */}
            <div className="absolute top-4 left-4 border border-red-900 bg-black/80 px-4 py-2 text-red-500 tracking-[0.3em] text-sm">

              ● LIVE

            </div>

          </div>

          {/* Bottom Telemetry */}
          <div className="mt-6 flex justify-between text-sm tracking-[0.2em] text-pink-500">

            <span>CHANNEL: 0{currentChannel + 1}</span>

            <span>UPLINK: STABLE</span>

            <span>FREQUENCY: 88.7</span>

          </div>

        </div>

      </div>

    </main>
  );
}