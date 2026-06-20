"use client";

import { useEffect, useRef, useState } from "react";

type NowPlayingData = {
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
  };
};

type VisualizerMode = "BARS" | "WAVE" | "ORBIT" | "GRID";

const STREAM_URL = "https://radio.phantomfm.xyz/listen/phantomfm/radio.mp3";
const NOW_PLAYING_URL = "https://radio.phantomfm.xyz/nowplaying";

const AUTO_MODES: VisualizerMode[] = ["BARS", "WAVE", "ORBIT"];
const ALL_MODES: VisualizerMode[] = ["BARS", "WAVE", "ORBIT", "GRID"];
const MODE_ROTATION_SECONDS = 60;

function formatTime(seconds?: number) {
  if (!seconds || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainder}`;
}

function average(values: Uint8Array, start: number, end: number) {
  const slice = values.slice(start, end);
  const total = slice.reduce((sum, value) => sum + value, 0);

  return total / Math.max(1, slice.length);
}

function getCleanArtUrl(url?: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname === "radio.phantomfm.xyz" &&
      parsed.pathname.includes("/api/station/phantomfm/art/")
    ) {
      return parsed
        .toString()
        .replace(
          "https://radio.phantomfm.xyz/api/station/phantomfm/art/",
          "https://radio.phantomfm.xyz/art/"
        );
    }

    return url;
  } catch {
    return url;
  }
}

export default function RadioPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const animationRef = useRef<number | null>(null);
  const progressAnimationRef = useRef<number | null>(null);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const visualizerModeRef = useRef<VisualizerMode>("BARS");
  const lastModeSwitchRef = useRef(Date.now());

  const progressStartRef = useRef({
    elapsed: 0,
    duration: 0,
    receivedAt: Date.now(),
  });

  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.84);
  const [visualizerReady, setVisualizerReady] = useState(false);
  const [signalMessage, setSignalMessage] = useState("SIGNAL DORMANT");

  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [displayDuration, setDisplayDuration] = useState(0);

  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>("BARS");
  const [autoRotate, setAutoRotate] = useState(true);
  const [secondsToNextMode, setSecondsToNextMode] = useState(
    MODE_ROTATION_SECONDS
  );

  const song = nowPlaying?.now_playing?.song;
  const nextSong = nowPlaying?.playing_next?.song;
  const listeners = nowPlaying?.listeners?.current ?? 0;

  const songArt = getCleanArtUrl(song?.art);
  const nextArt = getCleanArtUrl(nextSong?.art);

  const progress =
    displayDuration > 0
      ? Math.min(100, (displayElapsed / displayDuration) * 100)
      : 0;

  useEffect(() => {
    visualizerModeRef.current = visualizerMode;
  }, [visualizerMode]);

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
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
    }

    rotationIntervalRef.current = setInterval(() => {
      if (!autoRotate) {
        setSecondsToNextMode(MODE_ROTATION_SECONDS);
        return;
      }

      const elapsedSeconds = Math.floor(
        (Date.now() - lastModeSwitchRef.current) / 1000
      );

      const remaining = Math.max(0, MODE_ROTATION_SECONDS - elapsedSeconds);
      setSecondsToNextMode(remaining);

      if (elapsedSeconds >= MODE_ROTATION_SECONDS) {
        lastModeSwitchRef.current = Date.now();
        setSecondsToNextMode(MODE_ROTATION_SECONDS);

        setVisualizerMode((currentMode) => {
          const currentIndex = AUTO_MODES.indexOf(currentMode);
          const nextIndex =
            currentIndex === -1 ? 0 : (currentIndex + 1) % AUTO_MODES.length;

          return AUTO_MODES[nextIndex];
        });
      }
    }, 1000);

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, [autoRotate]);

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

    const drawBackground = (width: number, height: number) => {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(8, 0, 18, 0.98)");
      gradient.addColorStop(0.5, "rgba(15, 3, 34, 0.96)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.98)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.12;
      context.strokeStyle = "rgba(168, 85, 247, 0.55)";
      context.lineWidth = 1;

      for (let y = 0; y < height; y += 24) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      for (let x = 0; x < width; x += 64) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      context.restore();

      const glow = context.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );

      glow.addColorStop(0, "rgba(168, 85, 247, 0.2)");
      glow.addColorStop(0.38, "rgba(34, 211, 238, 0.08)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    };

    const getAudioData = () => {
      const analyser = analyserRef.current;
      const bufferLength = analyser?.frequencyBinCount || 256;
      const frequencyData = new Uint8Array(bufferLength);
      const waveformData = new Uint8Array(bufferLength);

      if (analyser && visualizerReady && playing) {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(waveformData);
      } else {
        const time = Date.now() / 700;

        for (let i = 0; i < bufferLength; i++) {
          frequencyData[i] =
            42 +
            Math.sin(time + i * 0.18) * 22 +
            Math.sin(time * 0.7 + i * 0.06) * 18;

          waveformData[i] =
            128 +
            Math.sin(time + i * 0.1) * 30 +
            Math.sin(time * 1.4 + i * 0.035) * 14;
        }
      }

      return { frequencyData, waveformData, bufferLength };
    };

    const drawBars = (
      width: number,
      height: number,
      frequencyData: Uint8Array,
      waveformData: Uint8Array,
      bufferLength: number
    ) => {
      const barCount = 108;
      const gap = 3;
      const barWidth = Math.max(2, width / barCount - gap);
      const baseY = height * 0.76;
      const maxUsefulIndex = bufferLength * 0.58;

      const bassEnergy = average(frequencyData, 0, 18);
      const midEnergy = average(frequencyData, 18, 82);

      for (let i = 0; i < barCount; i++) {
        const sourceIndex = Math.floor(
          Math.pow(i / Math.max(1, barCount - 1), 1.65) * maxUsefulIndex
        );

        const rawValue = frequencyData[sourceIndex] || 0;
        const value = Math.min(
          255,
          rawValue * 1.45 + bassEnergy * 0.22 + midEnergy * 0.12
        );

        const movement = Math.pow(value / 255, 1.18);
        const barHeight = Math.max(5, movement * height * 0.36);

        const x = i * (barWidth + gap);
        const y = baseY - barHeight;

        const barGradient = context.createLinearGradient(0, y, 0, baseY);
        barGradient.addColorStop(0, "rgba(34, 211, 238, 0.96)");
        barGradient.addColorStop(0.48, "rgba(236, 72, 153, 0.9)");
        barGradient.addColorStop(1, "rgba(168, 85, 247, 0.76)");

        context.fillStyle = barGradient;
        context.shadowColor =
          i < barCount / 2
            ? "rgba(236,72,153,0.5)"
            : "rgba(34,211,238,0.5)";
        context.shadowBlur = 9;
        context.fillRect(x, y, barWidth, barHeight);

        context.globalAlpha = 0.14;
        context.fillRect(x, baseY + 8, barWidth, barHeight * 0.36);
        context.globalAlpha = 1;
      }

      context.shadowBlur = 0;

      context.beginPath();
      context.lineWidth = 2.4;
      context.strokeStyle = "rgba(34, 211, 238, 0.95)";
      context.shadowColor = "rgba(34, 211, 238, 0.8)";
      context.shadowBlur = 14;

      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i] / 255;
        const x = (i / (waveformData.length - 1)) * width;
        const y = height * 0.33 + (value - 0.5) * height * 0.18;

        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.stroke();
      context.shadowBlur = 0;
    };

    const drawWave = (
      width: number,
      height: number,
      waveformData: Uint8Array
    ) => {
      for (let layer = 0; layer < 4; layer++) {
        context.beginPath();
        context.lineWidth = layer === 0 ? 3.5 : 2;
        context.strokeStyle =
          layer === 0
            ? "rgba(34, 211, 238, 0.98)"
            : `rgba(236, 72, 153, ${0.32 - layer * 0.05})`;
        context.shadowColor =
          layer === 0 ? "rgba(34, 211, 238, 0.8)" : "rgba(236,72,153,0.65)";
        context.shadowBlur = layer === 0 ? 20 : 14;

        for (let i = 0; i < waveformData.length; i++) {
          const value = waveformData[i] / 255;
          const x = (i / (waveformData.length - 1)) * width;
          const waveSize = height * (0.2 + layer * 0.06);
          const y =
            height * 0.48 +
            (value - 0.5) * waveSize +
            Math.sin(Date.now() / 900 + i * 0.05 + layer) * 12;

          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.stroke();
      }

      context.shadowBlur = 0;
    };

    const drawOrbit = (
      width: number,
      height: number,
      frequencyData: Uint8Array
    ) => {
      const time = Date.now() / 1000;
      const centerX = width / 2;
      const centerY = height / 2;

      const bass = average(frequencyData, 0, 18);
      const pulse = 0.55 + bass / 300;

      for (let ring = 0; ring < 5; ring++) {
        const radius = 64 + ring * 34 + pulse * 18;

        context.beginPath();
        context.lineWidth = ring === 0 ? 3 : 1.4;
        context.strokeStyle =
          ring % 2 === 0
            ? `rgba(34, 211, 238, ${0.72 - ring * 0.1})`
            : `rgba(236, 72, 153, ${0.64 - ring * 0.1})`;
        context.shadowColor =
          ring % 2 === 0 ? "rgba(34,211,238,0.7)" : "rgba(236,72,153,0.7)";
        context.shadowBlur = 18;
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
      }

      const dots = 72;

      for (let i = 0; i < dots; i++) {
        const value =
          frequencyData[Math.floor((i / dots) * frequencyData.length * 0.58)] ||
          0;

        const angle = (i / dots) * Math.PI * 2 + time * 0.45;
        const radius = 118 + (value / 255) * 125;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const size = 2 + (value / 255) * 4.5;

        context.fillStyle =
          i % 2 === 0
            ? "rgba(34, 211, 238, 0.9)"
            : "rgba(236, 72, 153, 0.82)";
        context.shadowColor =
          i % 2 === 0 ? "rgba(34,211,238,0.7)" : "rgba(236,72,153,0.7)";
        context.shadowBlur = 14;

        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }

      context.shadowBlur = 0;
    };

    const drawGrid = (
      width: number,
      height: number,
      frequencyData: Uint8Array
    ) => {
      const time = Date.now() / 1000;
      const horizon = height * 0.42;

      context.save();
      context.globalAlpha = 0.5;
      context.strokeStyle = "rgba(168,85,247,0.78)";
      context.lineWidth = 1;

      for (let i = 0; i < 18; i++) {
        const y = horizon + Math.pow(i, 1.45) * 7 + (time * 14) % 28;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      for (let i = -16; i <= 16; i++) {
        const x = width / 2 + i * 52;
        context.beginPath();
        context.moveTo(width / 2, horizon);
        context.lineTo(x, height);
        context.stroke();
      }

      context.restore();

      const columns = 78;
      const baseY = height * 0.8;

      for (let i = 0; i < columns; i++) {
        const sourceIndex = Math.floor(
          Math.pow(i / Math.max(1, columns - 1), 1.65) *
            frequencyData.length *
            0.58
        );

        const rawValue = frequencyData[sourceIndex] || 0;
        const bassEnergy = average(frequencyData, 0, 18);
        const value = Math.min(255, rawValue * 1.35 + bassEnergy * 0.2);

        const x = (i / columns) * width;
        const movement = Math.pow(value / 255, 1.15);
        const barHeight = 10 + movement * height * 0.3;

        context.fillStyle =
          i % 3 === 0
            ? "rgba(34,211,238,0.86)"
            : "rgba(236,72,153,0.8)";
        context.shadowColor =
          i % 3 === 0 ? "rgba(34,211,238,0.65)" : "rgba(236,72,153,0.6)";
        context.shadowBlur = 12;

        context.fillRect(
          x,
          baseY - barHeight,
          Math.max(3, width / columns - 5),
          barHeight
        );
      }

      context.shadowBlur = 0;
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);
      drawBackground(width, height);

      const { frequencyData, waveformData, bufferLength } = getAudioData();

      if (visualizerModeRef.current === "BARS") {
        drawBars(width, height, frequencyData, waveformData, bufferLength);
      }

      if (visualizerModeRef.current === "WAVE") {
        drawWave(width, height, waveformData);
      }

      if (visualizerModeRef.current === "ORBIT") {
        drawOrbit(width, height, frequencyData);
      }

      if (visualizerModeRef.current === "GRID") {
        drawGrid(width, height, frequencyData);
      }

      context.fillStyle = "rgba(255, 255, 255, 0.72)";
      context.font = "700 10px monospace";
      context.fillText(
        `${
          visualizerReady ? "REAL AUDIO ANALYSIS" : "SIGNAL SIMULATION"
        } // MODE: ${visualizerModeRef.current}`,
        14,
        22
      );

      context.fillStyle = "rgba(34, 211, 238, 0.78)";
      context.fillText(
        autoRotate
          ? `NEXT SHIFT: 00:${secondsToNextMode.toString().padStart(2, "0")}`
          : "AUTO SHIFT: MANUAL",
        14,
        38
      );

      animationRef.current = requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playing, visualizerReady, autoRotate, secondsToNextMode]);

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
        analyserRef.current.smoothingTimeConstant = 0.66;
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

  const selectVisualizerMode = (mode: VisualizerMode) => {
    setVisualizerMode(mode);
    setAutoRotate(false);
    lastModeSwitchRef.current = Date.now();
    setSecondsToNextMode(MODE_ROTATION_SECONDS);
  };

  const enableAutoRotate = () => {
    setVisualizerMode("BARS");
    setAutoRotate(true);
    lastModeSwitchRef.current = Date.now();
    setSecondsToNextMode(MODE_ROTATION_SECONDS);
  };

  return (
    <main className="relative h-screen overflow-hidden bg-[#030008] text-purple-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(168,85,247,0.2),transparent_34%),radial-gradient(circle_at_78%_70%,rgba(34,211,238,0.1),transparent_32%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.96)]" />

      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      <section className="relative z-10 mx-auto flex h-screen w-full max-w-[1480px] flex-col gap-4 px-4 py-4 md:px-6">
        <header className="shrink-0 border border-purple-900/80 bg-black/65 px-4 py-3 shadow-[0_0_28px_rgba(147,51,234,0.16)]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.34em] text-cyan-300">
                PHANTOM FM // RADIO TRANSMISSION
              </p>

              <h1 className="mt-1 truncate text-4xl font-black tracking-[0.24em] text-white drop-shadow-[0_0_16px_rgba(168,85,247,0.7)] md:text-5xl">
                NIGHT SIGNAL
              </h1>
            </div>

            <div className="shrink-0 text-right text-xs tracking-[0.22em] text-purple-300">
              <p className={playing ? "text-green-300" : "text-purple-400"}>
                ● {signalMessage}
              </p>
              <p className="mt-1">
                {listeners} LISTENER{listeners === 1 ? "" : "S"}
              </p>
              <p className="mt-1 text-cyan-300">
                MODE {visualizerMode}{" "}
                {autoRotate ? `// NEXT ${secondsToNextMode}s` : "// MANUAL"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_290px]">
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_104px] overflow-hidden border border-purple-900/80 bg-black shadow-[0_0_55px_rgba(147,51,234,0.2)]">
            <div className="min-h-0">
              <div className="flex h-[42px] items-center justify-between border-b border-purple-900/80 bg-[#0b0315] px-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                  <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  <span className="ml-3 text-[10px] tracking-[0.28em] text-pink-400">
                    VISUALIZER
                  </span>
                </div>

                <div className="flex gap-2">
                  {ALL_MODES.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => selectVisualizerMode(mode)}
                      className={[
                        "border px-2.5 py-1 text-[9px] font-black tracking-[0.18em] transition",
                        visualizerMode === mode
                          ? "border-cyan-300 bg-cyan-950/50 text-white"
                          : "border-purple-900/80 bg-black/50 text-purple-300 hover:border-cyan-300 hover:text-cyan-300",
                      ].join(" ")}
                    >
                      {mode}
                    </button>
                  ))}

                  <button
                    onClick={enableAutoRotate}
                    className={[
                      "border px-2.5 py-1 text-[9px] font-black tracking-[0.18em] transition",
                      autoRotate
                        ? "border-pink-400 bg-pink-950/40 text-white"
                        : "border-purple-900/80 bg-black/50 text-purple-300 hover:border-pink-400 hover:text-pink-300",
                    ].join(" ")}
                  >
                    AUTO
                  </button>
                </div>
              </div>

              <div className="relative h-[calc(100%-42px)] min-h-0 bg-black">
                <canvas ref={canvasRef} className="h-full w-full" />
              </div>
            </div>

            <div className="border-t border-purple-900/80 bg-black/85 px-3 py-2 shadow-[0_-12px_32px_rgba(0,0,0,0.72)]">
              <div className="grid h-full grid-cols-[76px_1fr_126px] items-center gap-3">
                <div className="h-[76px] w-[76px] overflow-hidden border border-purple-800/90 bg-black shadow-[0_0_18px_rgba(147,51,234,0.2)]">
                  {songArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={songArt}
                      alt={song?.title || "Album Art"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(168,85,247,0.25),transparent_62%)] text-center text-[9px] font-black tracking-[0.2em] text-purple-300">
                      PHANTOM
                      <br />
                      FM
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] tracking-[0.3em] text-cyan-300">
                    NOW PLAYING
                  </p>

                  <h2 className="mt-0.5 truncate text-2xl font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                    {song?.title || "Awaiting Signal"}
                  </h2>

                  <p className="truncate text-sm text-purple-200">
                    {song?.artist || "PHANTOM FM"}
                  </p>

                  <div className="mt-1.5 h-1.5 overflow-hidden bg-purple-950/70">
                    <div
                      className="h-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.75)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-1 flex justify-between text-[9px] tracking-[0.16em] text-purple-300">
                    <span>{formatTime(displayElapsed)}</span>
                    <span>
                      {displayDuration ? formatTime(displayDuration) : "LIVE"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={togglePlay}
                    className="border border-cyan-300 bg-cyan-950/40 px-4 py-2 text-xs font-black tracking-[0.22em] text-white shadow-[0_0_18px_rgba(34,211,238,0.18)] transition hover:bg-cyan-800/50"
                  >
                    {playing ? "PAUSE" : "LOCK"}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />

                  <div className="text-right text-[9px] tracking-[0.18em] text-purple-300">
                    {Math.round(volume * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="hidden min-h-0 flex-col gap-4 xl:flex">
            <div className="border border-purple-900/80 bg-black/70 p-4 shadow-[0_0_28px_rgba(147,51,234,0.12)]">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                STATUS
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-purple-900/60 pb-2.5">
                  <span className="text-purple-300">STREAM</span>
                  <span
                    className={playing ? "text-green-300" : "text-purple-400"}
                  >
                    {playing ? "LIVE" : "READY"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-purple-900/60 pb-2.5">
                  <span className="text-purple-300">LISTENERS</span>
                  <span className="text-cyan-300">{listeners}</span>
                </div>

                <div className="flex items-center justify-between border-b border-purple-900/60 pb-2.5">
                  <span className="text-purple-300">VISUAL</span>
                  <span className="text-pink-300">{visualizerMode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-purple-300">AUTO</span>
                  <span
                    className={
                      autoRotate ? "text-green-300" : "text-yellow-300"
                    }
                  >
                    {autoRotate ? `${secondsToNextMode}s` : "OFF"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-purple-900/80 bg-black/70 p-4">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                NEXT
              </p>

              <div className="mt-4 flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden border border-purple-900/80 bg-black">
                  {nextArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nextArt}
                      alt={nextSong?.title || "Next Track"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)]" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-white">
                    {nextSong?.title || "Unknown"}
                  </h3>

                  <p className="mt-1 truncate text-sm text-purple-300">
                    {nextSong?.artist || "Awaiting queue"}
                  </p>

                  <p className="mt-1 truncate text-xs text-purple-500">
                    {nextSong?.album || "Queue signal pending."}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-purple-900/80 bg-black/70 p-4">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                LINKS
              </p>

              <a
                href="https://radio.phantomfm.xyz/public/phantomfm"
                target="_blank"
                rel="noreferrer"
                className="mt-4 block border border-purple-800/80 px-4 py-3 text-xs font-bold text-purple-200 transition hover:border-cyan-300 hover:text-cyan-300"
              >
                PUBLIC PLAYER
              </a>

              <a
                href={STREAM_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block border border-purple-800/80 px-4 py-3 text-xs font-bold text-purple-200 transition hover:border-cyan-300 hover:text-cyan-300"
              >
                DIRECT STREAM
              </a>
            </div>

            <div className="min-h-0 flex-1 border border-purple-900/80 bg-black/60 p-4">
              <p className="text-[10px] tracking-[0.3em] text-pink-300">
                VISUAL CORE
              </p>

              <div className="mt-5 flex h-[150px] items-center justify-center bg-[radial-gradient(circle,rgba(168,85,247,0.15),transparent_68%)]">
                <div className="flex items-end gap-1">
                  <span className="h-7 w-2 animate-pulse bg-pink-500" />
                  <span className="h-12 w-2 animate-pulse bg-pink-500 delay-75" />
                  <span className="h-16 w-2 animate-pulse bg-cyan-300 delay-150" />
                  <span className="h-9 w-2 animate-pulse bg-purple-400 delay-300" />
                  <span className="h-20 w-2 animate-pulse bg-cyan-300 delay-500" />
                  <span className="h-14 w-2 animate-pulse bg-pink-500 delay-700" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}