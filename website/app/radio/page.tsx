"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_VIDEO_ID = "edqlOxtnvL0";

export default function RadioPage() {
  const playerRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(65);
  const [visualTick, setVisualTick] = useState(0);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(() => {
      setVisualTick((tick) => tick + 1);
    }, 90);

    return () => window.clearInterval(interval);
  }, [playing]);

  useEffect(() => {
    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = createPlayer;

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPlayer = () => {
    if (playerRef.current || !window.YT?.Player) return;

    playerRef.current = new window.YT.Player("phantom-radio-player", {
      videoId: YOUTUBE_VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(volume);
          setReady(true);
        },
        onStateChange: (event: any) => {
          const isPlaying = event.data === window.YT.PlayerState.PLAYING;
          setPlaying(isPlaying);
        },
      },
    });
  };

  const togglePlayback = () => {
    if (!playerRef.current || !ready) return;

    if (playing) {
      playerRef.current.pauseVideo();
      setPlaying(false);
    } else {
      playerRef.current.playVideo();
      setPlaying(true);
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    playerRef.current?.setVolume(value);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030008] text-purple-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(147,51,234,0.24),transparent_34%),radial-gradient(circle_at_78%_70%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.95)]" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8">
        <div className="w-full max-w-6xl border border-purple-900/80 bg-black/65 shadow-[0_0_55px_rgba(147,51,234,0.24)]">
          <div className="flex items-center justify-between border-b border-purple-900/80 bg-[#0b0315] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
              <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
            </div>

            <p className="text-xs tracking-[0.28em] text-purple-300">
              /PHANTOM/RADIO/YOUTUBE-CARRIER
            </p>
          </div>

          <div className="grid gap-7 p-7 md:p-10 lg:grid-cols-[1fr_360px]">
            <section>
              <p className="text-xs tracking-[0.35em] text-cyan-300">
                PHANTOM FM // AUDIO TRANSMISSION
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[0.28em] text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.8)] md:text-7xl">
                RADIO
              </h1>

              <p className="mt-3 text-sm tracking-[0.25em] text-pink-400">
                PLACEHOLDER CARRIER // YOUTUBE 24/7 SOURCE
              </p>

              <div className="mt-8 border border-purple-900/80 bg-[#05010b]/90 p-5 shadow-[0_0_35px_rgba(147,51,234,0.16)]">
                <div className="flex h-[260px] items-end gap-2 overflow-hidden bg-black/60 px-4 py-5">
                  {Array.from({ length: 64 }).map((_, index) => {
                    const waveA = Math.sin((visualTick + index * 1.7) * 0.22);
                    const waveB = Math.cos(
                      (visualTick * 1.4 + index * 0.9) * 0.18
                    );
                    const waveC = Math.sin(
                      (visualTick * 0.8 + index * 2.6) * 0.11
                    );

                    const energy = playing
                      ? Math.abs((waveA + waveB + waveC) / 3)
                      : 0.08 + (index % 5) * 0.025;

                    const volumeBoost = volume / 100;
                    const height = playing
                      ? 8 + energy * 82 * volumeBoost
                      : 8 + energy * 22;

                    return (
                      <div
                        key={index}
                        className={[
                          "flex-1 rounded-t-sm bg-gradient-to-t from-cyan-300 via-purple-500 to-pink-500 transition-all duration-100",
                          playing
                            ? "shadow-[0_0_16px_rgba(168,85,247,0.65)]"
                            : "opacity-25 shadow-none",
                        ].join(" ")}
                        style={{
                          height: `${Math.max(7, Math.min(96, height))}%`,
                          opacity: playing ? 0.45 + volume / 170 : 0.22,
                          transform: playing
                            ? `scaleY(${0.9 + energy * 0.25})`
                            : "scaleY(0.55)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
                <button
                  onClick={togglePlayback}
                  disabled={!ready}
                  className="border border-cyan-400/70 bg-cyan-950/10 px-6 py-4 text-sm font-bold tracking-[0.28em] text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.18)] transition-all hover:bg-cyan-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {!ready ? "SYNCING" : playing ? "PAUSE" : "PLAY"}
                </button>

                <div className="border border-purple-900/80 bg-black/60 px-5 py-4">
                  <div className="mb-3 flex items-center justify-between text-xs tracking-[0.24em]">
                    <span className="text-purple-300">VOLUME</span>
                    <span className="text-cyan-300">{volume}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    onChange={(event) =>
                      changeVolume(Number(event.target.value))
                    }
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-3 text-xs tracking-[0.22em] text-purple-300 md:grid-cols-3">
                <div className="border border-purple-900/80 bg-black/60 px-4 py-3">
                  SOURCE <span className="text-cyan-300">YOUTUBE</span>
                </div>

                <div className="border border-purple-900/80 bg-black/60 px-4 py-3 text-left md:text-center">
                  PHANTOMFM.XYZ
                </div>

                <div className="border border-purple-900/80 bg-black/60 px-4 py-3 text-left md:text-right">
                  <span
                    className={playing ? "text-green-300" : "text-yellow-300"}
                  >
                    {playing ? "SIGNAL ACTIVE" : "AWAITING INPUT"}
                  </span>
                </div>
              </div>

              <a
                href="/"
                className="mt-8 inline-block text-xs tracking-[0.25em] text-purple-400 transition-all hover:text-cyan-300"
              >
                ← RETURN TO PHANTOM OS
              </a>
            </section>

            <aside className="border border-purple-900/80 bg-black/60 p-5 shadow-[0_0_35px_rgba(147,51,234,0.14)]">
              <p className="text-xs tracking-[0.3em] text-cyan-300">
                SOURCE MONITOR
              </p>

              <div className="mt-5 overflow-hidden border border-purple-900/80 bg-black">
                <div id="phantom-radio-player" className="aspect-video w-full" />
              </div>

              <div className="mt-5 space-y-3 border border-purple-900/80 bg-[#05010b]/90 p-4 font-mono text-sm text-green-300">
                <p>&gt; source: youtube carrier</p>
                <p>&gt; stream id: {YOUTUBE_VIDEO_ID}</p>
                <p>&gt; visualizer: simulated</p>
                <p>&gt; volume bridge: {ready ? "online" : "syncing"}</p>
                <p className="animate-pulse">
                  &gt; status: {playing ? "broadcasting" : "standby"}
                </p>
              </div>

              <p className="mt-5 text-xs leading-5 tracking-[0.16em] text-purple-400">
                This placeholder uses the official YouTube player as the audio
                carrier. The visualizer is PHANTOM-side ambience, not an audio
                rip.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}