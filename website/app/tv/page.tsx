"use client";

import { useState } from "react";

export default function TVPage() {
  const [audioEnabled, setAudioEnabled] = useState(false);

  return (
    <main className="min-h-screen bg-black text-pink-600 overflow-hidden relative flex flex-col items-center justify-center">

      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* Scanlines */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,0,120,0.08)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

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
            PHANTOM FM TV
          </h1>

          <span className="text-red-500 animate-pulse tracking-[0.2em]">
            ● LIVE TRANSMISSION
          </span>

        </div>

        {/* Audio Toggle */}
        <div className="mt-6 flex justify-center">

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="border border-pink-900 px-6 py-3 text-pink-500 tracking-[0.3em] hover:bg-pink-900/20 transition-all"
          >
            {audioEnabled
              ? "● TV AUDIO LINK : ENABLED"
              : "○ TV AUDIO LINK : DISABLED"}
          </button>

        </div>

        {/* Live Broadcast */}
        <div className="relative mt-8 h-[500px] border border-pink-900 overflow-hidden bg-black">

          {/* Embedded Stream */}
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/LSrrc7HKkZc?autoplay=1&mute=${audioEnabled ? 0 : 1}&controls=0&modestbranding=1&rel=0`}
            title="PHANTOM FM TV"
            allow="autoplay"
            allowFullScreen
          />

          {/* CRT Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20" />

          {/* Glow Overlay */}
          <div className="absolute inset-0 bg-pink-900/10 pointer-events-none" />

          {/* LIVE Badge */}
          <div className="absolute top-4 left-4 border border-red-900 bg-black/80 px-4 py-2 text-red-500 tracking-[0.3em] text-sm">

            ● LIVE

          </div>

          {/* Signal Strength */}
          <div className="absolute bottom-4 right-4 border border-pink-900 bg-black/80 px-4 py-2 text-pink-500 text-sm tracking-[0.2em] flex items-center gap-3">

            <span>SIGNAL</span>

            <div className="flex gap-1">

              <div className="w-2 h-3 bg-pink-500" />
              <div className="w-2 h-5 bg-pink-500" />
              <div className="w-2 h-4 bg-pink-500" />
              <div className="w-2 h-6 bg-pink-500" />
              <div className="w-2 h-5 bg-pink-500" />

            </div>

          </div>

        </div>

        {/* Bottom Telemetry */}
        <div className="mt-6 flex justify-between text-sm tracking-[0.2em] text-pink-500">

          <span>CHANNEL: 01</span>

          <span>UPLINK: STABLE</span>

          <span>FREQUENCY: 88.7</span>

        </div>

      </div>

    </main>
  );
}