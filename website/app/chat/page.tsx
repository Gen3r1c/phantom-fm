"use client";

import { useEffect, useState } from "react";

export default function ChatPage() {
  const statuses = [
    "SIGNAL STRENGTH :: 84%",
    "NODE :: NULL-01",
    "UPLINK :: STABLE",
    "ENCRYPTION :: ACTIVE",
    "RELAY :: ONLINE",
  ];

  const [statusIndex, setStatusIndex] = useState(0);
  const [handle, setHandle] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08),transparent_60%)]" />

      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.08) 51%)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Noise Overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-screen">
        <div className="h-full w-full animate-pulse bg-[url('/noise.png')]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6">
        {/* Logo */}
        <h1
          className="
            text-6xl
            font-black
            uppercase
            tracking-[0.4em]
            text-purple-400
            drop-shadow-[0_0_18px_rgba(192,132,252,0.9)]
            md:text-7xl
          "
        >
          PHANTOM FM
        </h1>

        {/* Subtitle */}
        <p
          className="
            mt-5
            text-xs
            uppercase
            tracking-[0.55em]
            text-cyan-400
          "
        >
          Underground Signals Survive Forever
        </p>

        {/* Input */}
        <div className="mt-16 w-full">
          <input
            type="text"
            placeholder="ENTER YOUR HANDLE"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="
              w-full
              border
              border-purple-500/70
              bg-black/60
              px-5
              py-5
              text-lg
              uppercase
              tracking-[0.2em]
              text-gray-200
              outline-none
              transition-all
              duration-300
              placeholder:text-gray-600
              focus:border-cyan-400
              focus:shadow-[0_0_25px_rgba(34,211,238,0.25)]
            "
          />
        </div>

        {/* Enter Button */}
        <button
          className="
            mt-6
            w-full
            border
            border-cyan-400
            bg-transparent
            px-5
            py-5
            text-lg
            uppercase
            tracking-[0.3em]
            text-cyan-400
            transition-all
            duration-300
            hover:bg-cyan-400/10
            hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]
            active:scale-[0.99]
          "
        >
          Enter The Signal
        </button>

        {/* Status */}
        <div className="mt-10 h-5 text-center">
          <p
            className="
              text-[10px]
              uppercase
              tracking-[0.45em]
              text-gray-500
              transition-all
              duration-500
            "
          >
            {statuses[statusIndex]}
          </p>
        </div>

        {/* Bottom Node ID */}
        <div className="mt-24 text-[9px] uppercase tracking-[0.45em] text-gray-700">
          "NODE :: NULL-01",
        </div>
      </div>
    </main>
  );
}