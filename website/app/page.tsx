"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <main className="min-h-screen bg-black text-pink-600 overflow-hidden relative">

      {/* Hidden Audio */}
      <audio ref={audioRef} loop>
        <source src="/ambient.mp3" type="audio/mpeg" />
      </audio>

      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* Scanlines */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,0,120,0.08)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-pink-900 px-12 py-8 flex justify-between items-center relative z-10">

        <div>
          <h1 className="text-6xl font-black tracking-widest text-red-600 drop-shadow-[0_0_20px_rgba(255,0,80,0.7)]">
            PHANTOM FM
          </h1>

          <p className="text-purple-500 tracking-[0.4em] mt-3 text-lg">
            THE SIGNAL NEVER DIES
          </p>
        </div>

        <nav className="flex gap-10 text-sm tracking-[0.3em] text-pink-500">
          <span>HOME</span>
          <span>RADIO</span>
          <span>TV</span>
          <span>CHAT</span>
          <span>VAULT</span>
        </nav>

      </header>

      {/* Main Panels */}
      <section className="relative z-10 grid grid-cols-3 gap-6 px-8 py-10">

        {/* Left Panel */}
        <div className="border border-pink-900 bg-black/60 p-8 shadow-[0_0_30px_rgba(255,0,120,0.15)]">

          <p className="text-red-500 tracking-[0.3em] text-sm">
            ● TRANSMISSION STATUS
          </p>

          <h2 className="mt-12 text-5xl text-green-400 font-bold tracking-wide animate-pulse">
            SIGNAL DETECTED
          </h2>

          <div className="mt-12 h-[1px] bg-pink-900" />

          <div className="mt-10 text-purple-400 leading-10 text-lg">
            <p>Broadcasting from beyond the shadows.</p>
            <p>Citywide transmission network.</p>
          </div>

          <div className="mt-14 border border-pink-900 p-6">

            <p className="text-red-400 tracking-[0.2em] text-sm">
              STATION STATUS
            </p>

            <div className="mt-6 flex justify-between items-center">
              <span className="text-4xl text-white">
                STANDBY
              </span>

              <div className="flex gap-1">
                <div className="w-2 h-8 bg-pink-500" />
                <div className="w-2 h-6 bg-pink-500" />
                <div className="w-2 h-10 bg-pink-500" />
                <div className="w-2 h-5 bg-pink-500" />
                <div className="w-2 h-7 bg-pink-500" />
              </div>
            </div>

          </div>

        </div>

        {/* Center Panel */}
        <div className="border border-pink-900 bg-black/60 p-8 flex items-center justify-center shadow-[0_0_40px_rgba(255,0,120,0.18)]">

          <Image
            src="/logo.png"
            alt="PHANTOM FM"
            width={650}
            height={650}
            className="opacity-95"
            priority
          />

        </div>

        {/* Right Panel */}
        <div className="border border-pink-900 bg-black/60 p-8 shadow-[0_0_30px_rgba(255,0,120,0.15)]">

          <p className="text-red-500 tracking-[0.3em] text-sm">
            ● NETWORK STATUS
          </p>

          <div className="mt-12 space-y-10">

            <div className="flex justify-between text-2xl">
              <span className="text-purple-400">RADIO</span>
              <span className="text-yellow-400">STANDBY</span>
            </div>

            <div className="flex justify-between text-2xl">
              <span className="text-purple-400">TV</span>
              <span className="text-yellow-400">STANDBY</span>
            </div>

            <div className="flex justify-between text-2xl">
              <span className="text-purple-400">CHAT</span>
              <span className="text-yellow-400">STANDBY</span>
            </div>

            <div className="flex justify-between text-2xl">
              <span className="text-purple-400">VAULT</span>
              <span className="text-yellow-400">STANDBY</span>
            </div>

          </div>

          <div className="mt-16 border border-pink-900 p-5 text-center">

            <p className="text-green-400 tracking-[0.2em]">
              SYSTEMS CHECK NOMINAL ●
            </p>

          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-pink-900 px-8 py-5 flex justify-between text-sm tracking-[0.2em] text-pink-500 relative z-10">

        <div className="flex gap-8 items-center">

          <button
            onClick={toggleAudio}
            className="border border-pink-800 px-4 py-2 hover:bg-pink-900/30 transition-all tracking-[0.2em]"
          >
            {playing
              ? "● AUDIO TRANSMISSION : ONLINE"
              : "○ AUDIO TRANSMISSION : OFFLINE"}
          </button>

          <span className="text-red-500">● LIVE</span>
          <span>PHANTOM FM</span>
          <span>LOCATION: UNKNOWN</span>

        </div>

        <div className="flex items-center gap-4">

          <span>SIGNAL STRENGTH</span>

          <div className="flex gap-1">
            <div className="w-2 h-6 bg-pink-500" />
            <div className="w-2 h-8 bg-pink-500" />
            <div className="w-2 h-5 bg-pink-500" />
            <div className="w-2 h-10 bg-pink-500" />
            <div className="w-2 h-7 bg-pink-500" />
          </div>

        </div>

      </footer>

    </main>
  );
}