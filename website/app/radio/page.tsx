"use client";

import { useEffect, useRef, useState } from "react";

type NowPlayingData = {
  station?: {
    name?: string;
    description?: string;
    listen_url?: string;
    public_player_url?: string;
  };
  now_playing?: {
    song?: {
      title?: string;
      artist?: string;
      album?: string;
      art?: string;
    };
    elapsed?: number;
    duration?: number;
  };
  playing_next?: {
    song?: {
      title?: string;
      artist?: string;
      album?: string;
      art?: string;
    };
  };
  listeners?: {
    current?: number;
    unique?: number;
  };
  live?: {
    is_live?: boolean;
    streamer_name?: string;
  };
};

const STREAM_URL = "https://radio.phantomfm.xyz/listen/phantomfm/radio.mp3";
const NOW_PLAYING_URL = "https://radio.phantomfm.xyz/nowplaying";

function formatTime(seconds?: number) {
  if (!seconds || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainder}`;
}

export default function RadioPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const progressAnimationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const progressStartRef = useRef({
    elapsed: 0,
    duration: 0,
    receivedAt: Date.now(),
  });

  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [visualizerReady, setVisualizerReady] = useState(false);
  const [signalMessage, setSignalMessage] = useState("SIGNAL DORMANT");
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [displayDuration, setDisplayDuration] = useState(0);

  const song = nowPlaying?.now_playing?.song;
  const nextSong = nowPlaying?.playing_next?.song;
  const listeners = nowPlaying?.listeners?.current ?? 0;

  const progress =
    displayDuration > 0
      ? Math.min(100, (displayElapsed / displayDuration) * 100)
      : 0;

  useEffect(() => {
    const loadNowPlaying = async () => {
      try {
        const response = await fetch(NOW_PLAYING_URL, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Now playing failed: ${response.status}`);
        }

        const data = (await response.json()) as NowPlayingData;

        const elapsed = data.now_playing?.elapsed ?? 0;
        const duration = data.now_playing?.duration ?? 0;

        progressStartRef.current = {
          elapsed,
          duration,
          receivedAt: Date.now(),
        };

        setDisplayElapsed(elapsed);
        setDisplayDuration(duration);
        setNowPlaying(data);
      } catch (error) {
        console.warn("PHANTOM RADIO metadata error:", error);
      }
    };

    loadNowPlaying();

    const interval = setInterval(loadNowPlaying, 10 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = () => {
      const { elapsed, duration, receivedAt } = progressStartRef.current;

      if (duration > 0) {
        const secondsSinceUpdate = (Date.now() - receivedAt) / 1000;
        const smoothElapsed = Math.min(elapsed + secondsSinceUpdate, duration);

        setDisplayElapsed(smoothElapsed);
        setDisplayDuration(duration);
      }

      progressAnimationRef.current = requestAnimationFrame(tick);
    };

    progressAnimationRef.current = requestAnimationFrame(tick);

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);

      context.setTransform(scale, 0, 0, scale, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(8, 0, 18, 0.95)");
      gradient.addColorStop(0.5, "rgba(17, 3, 35, 0.92)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.96)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.18;
      context.strokeStyle = "rgba(168, 85, 247, 0.55)";
      context.lineWidth = 1;

      for (let y = 0; y < height; y += 18) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      for (let x = 0; x < width; x += 48) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      context.restore();

      const analyser = analyserRef.current;
      const bufferLength = analyser?.frequencyBinCount || 128;
      const frequencyData = new Uint8Array(bufferLength);
      const waveformData = new Uint8Array(bufferLength);

      if (analyser && visualizerReady && playing) {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(waveformData);
      } else {
        const time = Date.now() / 650;

        for (let i = 0; i < bufferLength; i++) {
          frequencyData[i] =
            60 +
            Math.sin(time + i * 0.22) * 38 +
            Math.sin(time * 0.55 + i * 0.08) * 24;

          waveformData[i] =
            128 +
            Math.sin(time + i * 0.14) * 42 +
            Math.sin(time * 1.6 + i * 0.04) * 18;
        }
      }

      const bassSlice = frequencyData.slice(0, 12);
      const bass =
        bassSlice.reduce((sum, value) => sum + value, 0) /
        Math.max(1, bassSlice.length);

      const pulse = visualizerReady && playing ? bass / 255 : playing ? 0.55 : 0.25;
      const orbRadius = 85 + pulse * 70;

      const orbGradient = context.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        orbRadius * 2.4
      );

      orbGradient.addColorStop(0, `rgba(34, 211, 238, ${0.38 + pulse * 0.42})`);
      orbGradient.addColorStop(
        0.22,
        `rgba(168, 85, 247, ${0.28 + pulse * 0.36})`
      );
      orbGradient.addColorStop(
        0.55,
        `rgba(88, 28, 135, ${0.16 + pulse * 0.2})`
      );
      orbGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = orbGradient;
      context.beginPath();
      context.arc(width / 2, height / 2, orbRadius * 2.1, 0, Math.PI * 2);
      context.fill();

      const barCount = 96;
      const barGap = 3;
      const barWidth = Math.max(2, width / barCount - barGap);
      const barBaseY = height * 0.72;

      for (let i = 0; i < barCount; i++) {
        const value =
          frequencyData[Math.floor((i / barCount) * bufferLength)] || 0;
        const barHeight = Math.max(6, (value / 255) * height * 0.5);

        const x = i * (barWidth + barGap);
        const y = barBaseY - barHeight;

        const barGradient = context.createLinearGradient(0, y, 0, barBaseY);
        barGradient.addColorStop(0, "rgba(34, 211, 238, 0.95)");
        barGradient.addColorStop(0.45, "rgba(168, 85, 247, 0.9)");
        barGradient.addColorStop(1, "rgba(88, 28, 135, 0.4)");

        context.fillStyle = barGradient;
        context.shadowColor = "rgba(34, 211, 238, 0.55)";
        context.shadowBlur = 10;
        context.fillRect(x, y, barWidth, barHeight);
      }

      context.shadowBlur = 0;

      context.beginPath();
      context.lineWidth = 3;
      context.strokeStyle = "rgba(34, 211, 238, 0.95)";
      context.shadowColor = "rgba(34, 211, 238, 0.95)";
      context.shadowBlur = 18;

      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i] / 255;
        const x = (i / (waveformData.length - 1)) * width;
        const y = height * 0.35 + (value - 0.5) * height * 0.28;

        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.stroke();
      context.shadowBlur = 0;

      context.fillStyle = "rgba(255, 255, 255, 0.9)";
      context.font = "700 11px monospace";
      context.fillText(
        visualizerReady ? "REAL AUDIO ANALYSIS" : "SIGNAL SIMULATION FALLBACK",
        18,
        28
      );

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playing, visualizerReady]);

  const setupAudioGraph = async () => {
    if (!audioRef.current) return false;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) {
        setSignalMessage("VISUALIZER UNSUPPORTED");
        return false;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 512;
        analyserRef.current.smoothingTimeConstant = 0.82;
      }

      if (!sourceRef.current) {
        sourceRef.current = audioContext.createMediaElementSource(
          audioRef.current
        );
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
      }

      setVisualizerReady(true);
      return true;
    } catch (error) {
      console.warn("Audio visualizer setup failed:", error);
      setVisualizerReady(false);
      return false;
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
        setSignalMessage("SIGNAL PAUSED");
        return;
      }

      audio.crossOrigin = "anonymous";

      if (audio.src !== STREAM_URL) {
        audio.src = STREAM_URL;
      }

      await audio.play();

      const graphReady = await setupAudioGraph();

      setPlaying(true);
      setSignalMessage(graphReady ? "SIGNAL LOCKED" : "SIGNAL PLAYING");
    } catch (error) {
      console.error("Radio playback failed:", error);
      setPlaying(false);
      setSignalMessage("SIGNAL BLOCKED");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030008] text-purple-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(168,85,247,0.26),transparent_34%),radial-gradient(circle_at_78%_70%,rgba(34,211,238,0.13),transparent_32%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,0.96)]" />

      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 md:px-8">
        <div className="mb-5 flex flex-col gap-4 border border-purple-900/80 bg-black/65 px-5 py-4 shadow-[0_0_35px_rgba(147,51,234,0.18)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs tracking-[0.34em] text-cyan-300">
              PHANTOM FM // RADIO TRANSMISSION
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[0.26em] text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.75)] md:text-6xl">
              NIGHT SIGNAL
            </h1>
          </div>

          <div className="flex flex-col gap-1 text-sm tracking-[0.22em] text-purple-300 md:text-right">
            <span className={playing ? "text-green-300" : "text-purple-400"}>
              ● {signalMessage}
            </span>
            <span>
              {listeners} LISTENER{listeners === 1 ? "" : "S"}
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[1fr_390px]">
          <div className="overflow-hidden border border-purple-900/80 bg-black shadow-[0_0_60px_rgba(147,51,234,0.2)]">
            <div className="flex items-center justify-between border-b border-purple-900/80 bg-[#0b0315] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
              </div>

              <p className="text-xs tracking-[0.28em] text-purple-300">
                /PHANTOM/RADIO/NIGHT_SIGNAL
              </p>
            </div>

            <div className="relative h-[58vh] min-h-[460px] bg-black">
              <canvas ref={canvasRef} className="h-full w-full" />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/65 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 border border-purple-900/80 bg-black/70 p-4 backdrop-blur">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                      NOW PLAYING
                    </p>

                    <h2 className="mt-2 truncate text-2xl font-black text-white md:text-4xl">
                      {song?.title || "Awaiting Signal"}
                    </h2>

                    <p className="mt-1 truncate text-lg text-purple-200">
                      {song?.artist || "PHANTOM FM"}
                    </p>
                  </div>

                  <button
                    onClick={togglePlay}
                    className="border border-cyan-300 bg-cyan-950/40 px-8 py-4 text-sm font-black tracking-[0.28em] text-white shadow-[0_0_26px_rgba(34,211,238,0.2)] transition hover:bg-cyan-800/50 hover:shadow-[0_0_34px_rgba(34,211,238,0.32)]"
                  >
                    {playing ? "PAUSE" : "LOCK SIGNAL"}
                  </button>
                </div>

                <div className="mt-4 h-2 overflow-hidden bg-purple-950/70">
                  <div
                    className="h-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-xs tracking-[0.16em] text-purple-300">
                  <span>{formatTime(displayElapsed)}</span>
                  <span>{displayDuration ? formatTime(displayDuration) : "LIVE"}</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="border border-purple-900/80 bg-black/70 p-5 shadow-[0_0_35px_rgba(147,51,234,0.15)]">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                BROADCAST CARD
              </p>

              <div className="mt-4 flex gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden border border-purple-900/80 bg-black">
                  {song?.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.art}
                      alt={song.title || "Album Art"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.22em] text-purple-400">
                      NO ART
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-2xl font-black text-white">
                    {song?.title || "Night Signal"}
                  </h3>

                  <p className="mt-1 truncate text-purple-200">
                    {song?.artist || "PHANTOM FM"}
                  </p>

                  <p className="mt-2 truncate text-sm text-purple-400">
                    {song?.album || "Broadcasting from the dead air."}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-purple-900/80 bg-black/70 p-5">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                PLAYING NEXT
              </p>

              <h3 className="mt-3 truncate text-xl font-black text-white">
                {nextSong?.title || "Unknown"}
              </h3>

              <p className="mt-1 truncate text-purple-300">
                {nextSong?.artist || "Awaiting queue"}
              </p>
            </div>

            <div className="border border-purple-900/80 bg-black/70 p-5">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                VOLUME
              </p>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="mt-4 w-full accent-cyan-300"
              />

              <div className="mt-2 text-xs tracking-[0.2em] text-purple-300">
                {Math.round(volume * 100)}%
              </div>
            </div>

            <div className="border border-purple-900/80 bg-black/70 p-5">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                SIGNAL LINKS
              </p>

              <a
                href="https://radio.phantomfm.xyz/public/phantomfm"
                target="_blank"
                rel="noreferrer"
                className="mt-4 block border border-purple-800/80 px-4 py-3 text-sm font-bold text-purple-200 transition hover:border-cyan-300 hover:text-cyan-300"
              >
                OPEN PUBLIC PLAYER
              </a>

              <a
                href={STREAM_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block border border-purple-800/80 px-4 py-3 text-sm font-bold text-purple-200 transition hover:border-cyan-300 hover:text-cyan-300"
              >
                DIRECT MP3 STREAM
              </a>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}