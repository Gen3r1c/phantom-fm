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

type VisualizerMode = "BARS" | "WAVE" | "ORBIT" | "GRID";

const STREAM_URL = "https://radio.phantomfm.xyz/listen/phantomfm/radio.mp3";
const NOW_PLAYING_URL = "https://radio.phantomfm.xyz/nowplaying";

const visualizerModes: VisualizerMode[] = ["BARS", "WAVE", "ORBIT", "GRID"];
const MODE_ROTATION_SECONDS = 60;

function formatTime(seconds?: number) {
  if (!seconds || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainder}`;
}

function getAverage(values: Uint8Array, start: number, end: number) {
  const slice = values.slice(start, end);
  const total = slice.reduce((sum, value) => sum + value, 0);

  return total / Math.max(1, slice.length);
}

export default function RadioPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const progressAnimationRef = useRef<number | null>(null);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastModeSwitchRef = useRef(Date.now());

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const modeRef = useRef<VisualizerMode>("BARS");

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
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>("BARS");
  const [autoRotate, setAutoRotate] = useState(true);
  const [secondsToNextMode, setSecondsToNextMode] = useState(
    MODE_ROTATION_SECONDS
  );

  const song = nowPlaying?.now_playing?.song;
  const nextSong = nowPlaying?.playing_next?.song;
  const listeners = nowPlaying?.listeners?.current ?? 0;

  const progress =
    displayDuration > 0
      ? Math.min(100, (displayElapsed / displayDuration) * 100)
      : 0;

  useEffect(() => {
    modeRef.current = visualizerMode;
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
          const currentIndex = visualizerModes.indexOf(currentMode);
          const nextIndex = (currentIndex + 1) % visualizerModes.length;

          return visualizerModes[nextIndex];
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

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawBackground = (width: number, height: number) => {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(8, 0, 18, 0.97)");
      gradient.addColorStop(0.42, "rgba(18, 3, 38, 0.94)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.98)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.15;
      context.strokeStyle = "rgba(168, 85, 247, 0.55)";
      context.lineWidth = 1;

      for (let y = 0; y < height; y += 22) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      for (let x = 0; x < width; x += 58) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      context.restore();

      const centerGlow = context.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );

      centerGlow.addColorStop(0, "rgba(168, 85, 247, 0.24)");
      centerGlow.addColorStop(0.35, "rgba(34, 211, 238, 0.08)");
      centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = centerGlow;
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
            70 +
            Math.sin(time + i * 0.21) * 42 +
            Math.sin(time * 0.5 + i * 0.07) * 25 +
            Math.sin(time * 1.7 + i * 0.015) * 12;

          waveformData[i] =
            128 +
            Math.sin(time + i * 0.1) * 42 +
            Math.sin(time * 1.4 + i * 0.035) * 20;
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
      const barCount = 130;
      const barGap = 3;
      const barWidth = Math.max(2, width / barCount - barGap);
      const centerY = height * 0.52;

      for (let i = 0; i < barCount; i++) {
        const value =
          frequencyData[Math.floor((i / barCount) * bufferLength)] || 0;

        const mirroredIndex = Math.abs(i - barCount / 2) / (barCount / 2);
        const centerBoost = 1 + (1 - mirroredIndex) * 0.7;
        const barHeight = Math.max(8, (value / 255) * height * 0.38 * centerBoost);

        const x = i * (barWidth + barGap);
        const y = centerY - barHeight / 2;

        const barGradient = context.createLinearGradient(0, y, 0, y + barHeight);
        barGradient.addColorStop(0, "rgba(34, 211, 238, 0.95)");
        barGradient.addColorStop(0.45, "rgba(236, 72, 153, 0.95)");
        barGradient.addColorStop(1, "rgba(168, 85, 247, 0.85)");

        context.fillStyle = barGradient;
        context.shadowColor = i < barCount / 2 ? "rgba(236,72,153,0.75)" : "rgba(34,211,238,0.75)";
        context.shadowBlur = 14;
        context.fillRect(x, y, barWidth, barHeight);

        context.globalAlpha = 0.25;
        context.fillRect(x, centerY + barHeight / 2 + 8, barWidth, barHeight * 0.45);
        context.globalAlpha = 1;
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
        const y = height * 0.28 + (value - 0.5) * height * 0.17;

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
        context.lineWidth = layer === 0 ? 4 : 2;
        context.strokeStyle =
          layer === 0
            ? "rgba(34, 211, 238, 0.95)"
            : `rgba(236, 72, 153, ${0.35 - layer * 0.06})`;
        context.shadowColor =
          layer === 0 ? "rgba(34, 211, 238, 0.9)" : "rgba(236,72,153,0.7)";
        context.shadowBlur = layer === 0 ? 24 : 18;

        for (let i = 0; i < waveformData.length; i++) {
          const value = waveformData[i] / 255;
          const x = (i / (waveformData.length - 1)) * width;
          const waveSize = height * (0.22 + layer * 0.08);
          const y =
            height * 0.45 +
            (value - 0.5) * waveSize +
            Math.sin(Date.now() / 900 + i * 0.05 + layer) * 18;

          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.stroke();
      }

      context.shadowBlur = 0;

      const horizon = height * 0.62;
      context.save();
      context.globalAlpha = 0.32;
      context.strokeStyle = "rgba(168, 85, 247, 0.8)";

      for (let i = 0; i < 16; i++) {
        const y = horizon + i * 22;
        context.beginPath();
        context.moveTo(width * 0.08, y);
        context.lineTo(width * 0.92, y);
        context.stroke();
      }

      for (let i = 0; i < 18; i++) {
        const x = width * 0.5 + (i - 9) * 58;
        context.beginPath();
        context.moveTo(width * 0.5, horizon);
        context.lineTo(x, height);
        context.stroke();
      }

      context.restore();
    };

    const drawOrbit = (
      width: number,
      height: number,
      frequencyData: Uint8Array
    ) => {
      const time = Date.now() / 1000;
      const centerX = width / 2;
      const centerY = height / 2;
      const bass = getAverage(frequencyData, 0, 18);
      const mid = getAverage(frequencyData, 18, 90);
      const pulse = 0.6 + bass / 255;

      for (let ring = 0; ring < 5; ring++) {
        const radius = 80 + ring * 45 + pulse * 24;
        context.beginPath();
        context.lineWidth = ring === 0 ? 3 : 1.5;
        context.strokeStyle =
          ring % 2 === 0
            ? `rgba(34, 211, 238, ${0.7 - ring * 0.1})`
            : `rgba(236, 72, 153, ${0.65 - ring * 0.1})`;
        context.shadowColor =
          ring % 2 === 0 ? "rgba(34,211,238,0.8)" : "rgba(236,72,153,0.8)";
        context.shadowBlur = 22;
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
      }

      const dots = 80;

      for (let i = 0; i < dots; i++) {
        const value =
          frequencyData[Math.floor((i / dots) * frequencyData.length)] || 0;

        const angle = (i / dots) * Math.PI * 2 + time * 0.45;
        const radius = 150 + (value / 255) * 175;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const size = 2 + (value / 255) * 6;

        context.fillStyle =
          i % 2 === 0
            ? "rgba(34, 211, 238, 0.92)"
            : "rgba(236, 72, 153, 0.88)";
        context.shadowColor =
          i % 2 === 0 ? "rgba(34,211,238,0.85)" : "rgba(236,72,153,0.85)";
        context.shadowBlur = 18;

        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }

      const coreGradient = context.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        170 + mid / 2
      );

      coreGradient.addColorStop(0, "rgba(255,255,255,0.9)");
      coreGradient.addColorStop(0.12, "rgba(34,211,238,0.65)");
      coreGradient.addColorStop(0.42, "rgba(168,85,247,0.32)");
      coreGradient.addColorStop(1, "rgba(0,0,0,0)");

      context.fillStyle = coreGradient;
      context.beginPath();
      context.arc(centerX, centerY, 170 + pulse * 18, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = 0;
    };

    const drawGrid = (
      width: number,
      height: number,
      frequencyData: Uint8Array
    ) => {
      const time = Date.now() / 1000;
      const horizon = height * 0.38;

      context.save();
      context.globalAlpha = 0.58;
      context.strokeStyle = "rgba(168,85,247,0.85)";
      context.lineWidth = 1;

      for (let i = 0; i < 22; i++) {
        const y = horizon + Math.pow(i, 1.45) * 7 + (time * 18) % 28;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      for (let i = -18; i <= 18; i++) {
        const x = width / 2 + i * 42;
        context.beginPath();
        context.moveTo(width / 2, horizon);
        context.lineTo(x, height);
        context.stroke();
      }

      context.restore();

      const columns = 82;
      const baseY = height * 0.78;

      for (let i = 0; i < columns; i++) {
        const value =
          frequencyData[Math.floor((i / columns) * frequencyData.length)] || 0;

        const x = (i / columns) * width;
        const perspective = Math.abs(i - columns / 2) / (columns / 2);
        const barHeight =
          20 + (value / 255) * height * (0.45 - perspective * 0.18);

        context.fillStyle =
          i % 3 === 0
            ? "rgba(34,211,238,0.9)"
            : "rgba(236,72,153,0.85)";
        context.shadowColor =
          i % 3 === 0 ? "rgba(34,211,238,0.8)" : "rgba(236,72,153,0.75)";
        context.shadowBlur = 18;

        context.fillRect(x, baseY - barHeight, Math.max(3, width / columns - 4), barHeight);
      }

      context.shadowBlur = 0;

      context.fillStyle = "rgba(34,211,238,0.9)";
      context.font = "700 12px monospace";

      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 155;
        const y = 42 + Math.sin(time + i) * 8;
        context.fillText(`0${i} // SIGNAL`, x, y);
      }
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);
      drawBackground(width, height);

      const { frequencyData, waveformData, bufferLength } = getAudioData();

      if (modeRef.current === "BARS") {
        drawBars(width, height, frequencyData, waveformData, bufferLength);
      }

      if (modeRef.current === "WAVE") {
        drawWave(width, height, waveformData);
      }

      if (modeRef.current === "ORBIT") {
        drawOrbit(width, height, frequencyData);
      }

      if (modeRef.current === "GRID") {
        drawGrid(width, height, frequencyData);
      }

      context.fillStyle = "rgba(255, 255, 255, 0.92)";
      context.font = "700 11px monospace";
      context.fillText(
        `${visualizerReady ? "REAL AUDIO ANALYSIS" : "SIGNAL SIMULATION"} // MODE: ${modeRef.current}`,
        18,
        28
      );

      context.fillStyle = "rgba(34, 211, 238, 0.92)";
      context.fillText(
        autoRotate
          ? `NEXT SHIFT: 00:${secondsToNextMode.toString().padStart(2, "0")}`
          : "AUTO SHIFT: MANUAL OVERRIDE",
        18,
        48
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
        analyserRef.current.smoothingTimeConstant = 0.84;
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
    setAutoRotate(true);
    lastModeSwitchRef.current = Date.now();
    setSecondsToNextMode(MODE_ROTATION_SECONDS);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030008] text-purple-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(168,85,247,0.26),transparent_34%),radial-gradient(circle_at_78%_70%,rgba(34,211,238,0.13),transparent_32%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,0.96)]" />

      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-5 py-6 md:px-8">
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
            <span className="text-cyan-300">
              MODE {visualizerMode} {autoRotate ? `// NEXT ${secondsToNextMode}s` : "// MANUAL"}
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
          <div className="overflow-hidden border border-purple-900/80 bg-black shadow-[0_0_70px_rgba(147,51,234,0.24)]">
            <div className="flex flex-col gap-3 border-b border-purple-900/80 bg-[#0b0315] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                <span className="ml-3 text-xs tracking-[0.28em] text-pink-400">
                  VISUALIZER MODE
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {visualizerModes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => selectVisualizerMode(mode)}
                    className={[
                      "border px-3 py-1 text-[10px] font-black tracking-[0.22em] transition",
                      visualizerMode === mode
                        ? "border-cyan-300 bg-cyan-950/50 text-white shadow-[0_0_18px_rgba(34,211,238,0.2)]"
                        : "border-purple-900/80 bg-black/50 text-purple-300 hover:border-cyan-300 hover:text-cyan-300",
                    ].join(" ")}
                  >
                    {mode}
                  </button>
                ))}

                <button
                  onClick={enableAutoRotate}
                  className={[
                    "border px-3 py-1 text-[10px] font-black tracking-[0.22em] transition",
                    autoRotate
                      ? "border-pink-400 bg-pink-950/40 text-white shadow-[0_0_18px_rgba(236,72,153,0.2)]"
                      : "border-purple-900/80 bg-black/50 text-purple-300 hover:border-pink-400 hover:text-pink-300",
                  ].join(" ")}
                >
                  AUTO
                </button>
              </div>
            </div>

            <div className="relative h-[70vh] min-h-[620px] bg-black">
              <canvas ref={canvasRef} className="h-full w-full" />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/65 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 border border-purple-900/80 bg-black/72 p-4 shadow-[0_0_34px_rgba(147,51,234,0.22)] backdrop-blur-md">
                <div className="grid gap-4 md:grid-cols-[150px_1fr_auto] md:items-center">
                  <div className="h-[150px] w-[150px] overflow-hidden border border-purple-800/90 bg-black shadow-[0_0_24px_rgba(147,51,234,0.24)]">
                    {song?.art ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={song.art}
                        alt={song.title || "Album Art"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(168,85,247,0.28),transparent_62%)] text-center text-xs font-black tracking-[0.25em] text-purple-300">
                        PHANTOM
                        <br />
                        FM
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                      NOW PLAYING
                    </p>

                    <h2 className="mt-2 truncate text-3xl font-black text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.25)] md:text-5xl">
                      {song?.title || "Awaiting Signal"}
                    </h2>

                    <p className="mt-2 truncate text-xl text-purple-200">
                      {song?.artist || "PHANTOM FM"}
                    </p>

                    <p className="mt-1 truncate text-sm text-purple-400">
                      {song?.album || "Broadcasting from the dead air."}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden bg-purple-950/70">
                      <div
                        className="h-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs tracking-[0.16em] text-purple-300">
                      <span>{formatTime(displayElapsed)}</span>
                      <span>
                        {displayDuration ? formatTime(displayDuration) : "LIVE"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 md:items-end">
                    <button
                      onClick={togglePlay}
                      className="border border-cyan-300 bg-cyan-950/40 px-8 py-4 text-sm font-black tracking-[0.28em] text-white shadow-[0_0_26px_rgba(34,211,238,0.2)] transition hover:bg-cyan-800/50 hover:shadow-[0_0_34px_rgba(34,211,238,0.32)]"
                    >
                      {playing ? "PAUSE" : "LOCK SIGNAL"}
                    </button>

                    <div className="w-full md:w-44">
                      <p className="text-[10px] tracking-[0.28em] text-pink-300">
                        VOLUME
                      </p>

                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(event) => setVolume(Number(event.target.value))}
                        className="mt-2 w-full accent-cyan-300"
                      />

                      <div className="mt-1 text-xs tracking-[0.18em] text-purple-300">
                        {Math.round(volume * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="border border-purple-900/80 bg-black/70 p-5 shadow-[0_0_35px_rgba(147,51,234,0.15)]">
              <p className="text-[10px] tracking-[0.3em] text-cyan-300">
                TRANSMISSION STATUS
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-purple-900/60 pb-3">
                  <span className="text-purple-300">STREAM</span>
                  <span className={playing ? "text-green-300" : "text-purple-400"}>
                    {playing ? "LIVE" : "READY"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-purple-900/60 pb-3">
                  <span className="text-purple-300">LISTENERS</span>
                  <span className="text-cyan-300">{listeners}</span>
                </div>

                <div className="flex items-center justify-between border-b border-purple-900/60 pb-3">
                  <span className="text-purple-300">VISUAL MODE</span>
                  <span className="text-pink-300">{visualizerMode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-purple-300">AUTO SHIFT</span>
                  <span className={autoRotate ? "text-green-300" : "text-yellow-300"}>
                    {autoRotate ? `${secondsToNextMode}s` : "OFF"}
                  </span>
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

              <p className="mt-2 truncate text-sm text-purple-500">
                {nextSong?.album || "Queue signal pending."}
              </p>
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

            <div className="hidden flex-1 border border-purple-900/80 bg-black/60 p-5 xl:block">
              <p className="text-[10px] tracking-[0.3em] text-pink-300">
                PHANTOM VISUAL CORE
              </p>

              <div className="mt-5 flex h-[220px] items-center justify-center bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_68%)]">
                <div className="flex items-end gap-1">
                  <span className="h-8 w-2 animate-pulse bg-pink-500" />
                  <span className="h-14 w-2 animate-pulse bg-pink-500 delay-75" />
                  <span className="h-20 w-2 animate-pulse bg-cyan-300 delay-150" />
                  <span className="h-11 w-2 animate-pulse bg-purple-400 delay-300" />
                  <span className="h-24 w-2 animate-pulse bg-cyan-300 delay-500" />
                  <span className="h-16 w-2 animate-pulse bg-pink-500 delay-700" />
                </div>
              </div>

              <p className="mt-4 text-center text-xs tracking-[0.22em] text-green-300">
                SYSTEMS NOMINAL
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}