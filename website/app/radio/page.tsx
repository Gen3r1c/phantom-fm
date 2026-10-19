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

type VisualizerMode =
  | "BARS"
  | "WAVE"
  | "ORBIT"
  | "GRID"
  | "SCOPE"
  | "SPECTRUM";

const STREAM_URL = "https://radio.phantomfm.xyz/listen/phantomfm/radio.mp3";
const NOW_PLAYING_URL = "https://radio.phantomfm.xyz/nowplaying";

const ALL_MODES: VisualizerMode[] = [
  "BARS",
  "WAVE",
  "ORBIT",
  "GRID",
  "SCOPE",
  "SPECTRUM",
];
const AUTO_MODES = ALL_MODES;
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
  const visualizerStageRef = useRef<HTMLDivElement | null>(null);

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
  const lastAudioSignalCheckRef = useRef(0);
  const audioSignalDetectedRef = useRef(false);
  const spectrogramHistoryRef = useRef<number[][]>([]);
  const lastSpectrogramFrameRef = useRef(0);

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
  const [isVisualizerFullscreen, setIsVisualizerFullscreen] = useState(false);
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
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsVisualizerFullscreen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVisualizerFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
      const base = context.createLinearGradient(0, 0, width, height);
      base.addColorStop(0, "#0b0d12");
      base.addColorStop(0.52, "#07090d");
      base.addColorStop(1, "#090a0d");
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);

      const bloom = context.createRadialGradient(
        width * 0.52,
        height * 0.48,
        0,
        width * 0.52,
        height * 0.48,
        Math.max(width, height) * 0.68
      );
      bloom.addColorStop(0, "rgba(91, 80, 150, 0.15)");
      bloom.addColorStop(0.48, "rgba(38, 48, 68, 0.08)");
      bloom.addColorStop(1, "rgba(4, 5, 8, 0)");
      context.fillStyle = bloom;
      context.fillRect(0, 0, width, height);

      const edge = context.createLinearGradient(0, 0, 0, height);
      edge.addColorStop(0, "rgba(3, 4, 7, 0.36)");
      edge.addColorStop(0.24, "rgba(3, 4, 7, 0)");
      edge.addColorStop(0.78, "rgba(3, 4, 7, 0)");
      edge.addColorStop(1, "rgba(3, 4, 7, 0.42)");
      context.fillStyle = edge;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.26;
      context.fillStyle = "#d9e5ed";
      for (let i = 0; i < 46; i++) {
        const x = ((i * 97 + 31) % 997) / 997 * width;
        const y = ((i * 193 + 71) % 991) / 991 * height;
        const size = i % 9 === 0 ? 1.5 : 0.7;
        context.globalAlpha = i % 9 === 0 ? 0.3 : 0.12;
        context.fillRect(x, y, size, size);
      }
      context.restore();
    };

    const getAudioData = () => {
      const analyser = analyserRef.current;
      const bufferLength = analyser?.frequencyBinCount || 256;
      const frequencyData = new Uint8Array(bufferLength);
      const waveformData = new Uint8Array(bufferLength);

      if (analyser && visualizerReady && playing) {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(waveformData);

        if (Date.now() - lastAudioSignalCheckRef.current >= 300) {
          const signalLevel =
            waveformData.reduce(
              (total, sample) => total + Math.abs(sample - 128),
              0
            ) / waveformData.length;

          audioSignalDetectedRef.current = signalLevel > 0.8;
          lastAudioSignalCheckRef.current = Date.now();
        }
      } else if (!playing) {
        audioSignalDetectedRef.current = false;
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
      _waveformData: Uint8Array,
      bufferLength: number
    ) => {
      const count = Math.min(88, Math.max(40, Math.floor(width / 11)));
      const spacing = width * 0.72 / count;
      const barWidth = Math.max(2, spacing * 0.28);
      const left = width * 0.14;
      const baseline = height * 0.58;
      const maxHeight = height * 0.34;
      const centerGlow = context.createRadialGradient(
        width / 2, baseline, 0, width / 2, baseline, width * 0.42
      );
      centerGlow.addColorStop(0, "rgba(111, 170, 190, 0.09)");
      centerGlow.addColorStop(1, "rgba(111, 170, 190, 0)");
      context.fillStyle = centerGlow;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(207, 223, 224, 0.18)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(left, baseline + 1);
      context.lineTo(width - left, baseline + 1);
      context.stroke();

      for (let i = 0; i < count; i++) {
        const position = i / (count - 1);
        const bin = Math.floor(Math.pow(position, 1.9) * bufferLength * 0.72);
        const energy = Math.pow((frequencyData[bin] || 0) / 255, 0.78);
        const barHeight = 5 + energy * maxHeight;
        const x = left + i * spacing + (spacing - barWidth) / 2;
        const y = baseline - barHeight;
        const gradient = context.createLinearGradient(0, y, 0, baseline);
        gradient.addColorStop(0, "rgba(232, 239, 230, 0.98)");
        gradient.addColorStop(0.28, "rgba(144, 202, 195, 0.88)");
        gradient.addColorStop(1, "rgba(85, 127, 141, 0.46)");

        context.fillStyle = "rgba(198, 215, 219, 0.06)";
        context.beginPath();
        context.roundRect(x, baseline - maxHeight, barWidth, maxHeight, barWidth / 2);
        context.fill();
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        context.fill();

        if (energy > 0.48) {
          context.fillStyle = "rgba(236, 243, 232, 0.85)";
          context.beginPath();
          context.arc(x + barWidth / 2, y - 4, 1.2 + energy, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.fillStyle = "rgba(180, 199, 201, 0.62)";
      context.font = "10px ui-monospace, monospace";
      context.fillText("20 Hz", left, baseline + 23);
      context.textAlign = "right";
      context.fillText("16 kHz", width - left, baseline + 23);
      context.textAlign = "left";
    };

    const drawWave = (
      width: number,
      height: number,
      waveformData: Uint8Array,
      frequencyData: Uint8Array
    ) => {
      const mid = height * 0.52;
      const span = width * 0.76;
      const left = (width - span) / 2;
      const amplitude = height * (0.2 + average(frequencyData, 0, 24) / 1500);
      const points = Math.min(waveformData.length, 220);

      context.strokeStyle = "rgba(199, 216, 216, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(left, mid);
      context.lineTo(width - left, mid);
      context.stroke();

      for (let layer = 2; layer >= 0; layer--) {
        const offset = layer === 0 ? 0 : layer === 1 ? 7 : -9;
        context.beginPath();
        for (let i = 0; i < points; i++) {
          const sample = (i * (waveformData.length - 1)) / (points - 1);
          const index = Math.floor((sample + offset + waveformData.length) % waveformData.length);
          const x = left + (i / (points - 1)) * span;
          const y = mid + ((waveformData[index] - 128) / 128) * amplitude * (layer === 0 ? 1 : 1.12);
          if (i === 0) context.moveTo(x, y);
          else {
            const previousX = left + ((i - 1) / (points - 1)) * span;
            const previousIndex = Math.floor(((sample - (waveformData.length - 1) / (points - 1)) + offset + waveformData.length) % waveformData.length);
            const previousY = mid + ((waveformData[previousIndex] - 128) / 128) * amplitude * (layer === 0 ? 1 : 1.12);
            context.quadraticCurveTo(previousX, previousY, (previousX + x) / 2, (previousY + y) / 2);
          }
        }
        const color = layer === 0 ? "#d9e8e1" : layer === 1 ? "#91b5b4" : "#a689bd";
        context.strokeStyle = layer === 0 ? "rgba(224, 236, 224, 0.94)" : layer === 1 ? "rgba(126, 183, 181, 0.24)" : "rgba(180, 144, 197, 0.16)";
        context.lineWidth = layer === 0 ? 1.8 : 1;
        context.shadowColor = color;
        context.shadowBlur = layer === 0 ? 15 : 7;
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
      const cx = width / 2;
      const cy = height * 0.51;
      const scale = Math.min(width * 0.34, height * 0.43);
      const bass = average(frequencyData, 0, 18) / 255;
      const rotation = time * 0.08;

      const halo = context.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.4);
      halo.addColorStop(0, `rgba(191, 151, 112, ${0.1 + bass * 0.1})`);
      halo.addColorStop(1, "rgba(191, 151, 112, 0)");
      context.fillStyle = halo;
      context.fillRect(cx - scale * 1.4, cy - scale * 1.4, scale * 2.8, scale * 2.8);

      for (let orbit = 0; orbit < 4; orbit++) {
        context.save();
        context.translate(cx, cy);
        context.rotate(rotation * (orbit % 2 ? -1 : 1) + orbit * 0.42);
        context.beginPath();
        context.ellipse(0, 0, scale * (0.58 + orbit * 0.17), scale * (0.2 + orbit * 0.075), 0, 0, Math.PI * 2);
        context.strokeStyle = orbit === 0 ? "rgba(211, 194, 165, 0.5)" : `rgba(142, 165, 165, ${0.2 - orbit * 0.025})`;
        context.lineWidth = orbit === 0 ? 1.2 : 0.8;
        context.stroke();

        const phase = rotation * (orbit % 2 ? -1 : 1) + orbit * 1.9;
        const angle = phase + bass * (orbit % 2 ? -0.26 : 0.26);
        const rx = scale * (0.58 + orbit * 0.17);
        const ry = scale * (0.2 + orbit * 0.075);
        const x = Math.cos(angle) * rx;
        const y = Math.sin(angle) * ry;
        const size = 2.2 + average(frequencyData, orbit * 14, orbit * 14 + 9) / 32;
        context.fillStyle = orbit === 0 ? "#e6d1ad" : "#a8c7bd";
        context.shadowColor = orbit === 0 ? "rgba(230, 209, 173, 0.56)" : "rgba(168, 199, 189, 0.42)";
        context.shadowBlur = 18;
        context.beginPath();
        context.arc(x, y, Math.min(size, 9), 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      context.shadowBlur = 0;
      const planet = context.createRadialGradient(cx - scale * 0.1, cy - scale * 0.1, 2, cx, cy, scale * 0.26);
      planet.addColorStop(0, "#dec7a2");
      planet.addColorStop(0.38, "#8e8581");
      planet.addColorStop(1, "#252931");
      context.fillStyle = planet;
      context.beginPath();
      context.arc(cx, cy, scale * (0.12 + bass * 0.035), 0, Math.PI * 2);
      context.fill();
    };

    const drawGrid = (
      width: number,
      height: number,
      frequencyData: Uint8Array
    ) => {
      const columns = Math.min(48, Math.max(28, Math.floor(width / 25)));
      const rows = 24;
      const left = width * 0.12;
      const right = width * 0.88;
      const horizon = height * 0.27;
      const depth = height * 0.57;
      const time = Date.now() / 1200;

      const floorGlow = context.createLinearGradient(0, horizon, 0, horizon + depth);
      floorGlow.addColorStop(0, "rgba(105, 161, 153, 0.03)");
      floorGlow.addColorStop(1, "rgba(105, 161, 153, 0)");
      context.fillStyle = floorGlow;
      context.fillRect(left, horizon, right - left, depth);

      for (let row = 0; row <= rows; row++) {
        const progress = row / rows;
        const y = horizon + Math.pow(progress, 1.72) * depth;
        context.beginPath();
        for (let col = 0; col <= columns; col++) {
          const xProgress = col / columns;
          const x = left + xProgress * (right - left);
          const source = Math.floor(Math.pow(xProgress, 1.8) * frequencyData.length * 0.72);
          const energy = (frequencyData[source] || 0) / 255;
          const ridge = Math.sin(xProgress * 17 + time - progress * 3.5) * energy * height * 0.16;
          const py = y - ridge * (0.3 + progress);
          if (col === 0) context.moveTo(x, py);
          else context.lineTo(x, py);
        }
        const alpha = 0.1 + progress * 0.36;
        context.strokeStyle = `rgba(147, 191, 170, ${alpha})`;
        context.lineWidth = progress > 0.8 ? 1 : 0.7;
        context.stroke();
      }

      for (let col = 0; col <= columns; col++) {
        const progress = col / columns;
        const bottomX = left + progress * (right - left);
        const source = Math.floor(Math.pow(progress, 1.8) * frequencyData.length * 0.72);
        const energy = (frequencyData[source] || 0) / 255;
        context.beginPath();
        context.moveTo(width * 0.5 + (bottomX - width * 0.5) * 0.04, horizon);
        for (let row = 1; row <= rows; row++) {
          const depthProgress = row / rows;
          const x = width * 0.5 + (bottomX - width * 0.5) * Math.pow(depthProgress, 0.85);
          const y = horizon + Math.pow(depthProgress, 1.72) * depth;
          const sourceRow = Math.floor(depthProgress * (frequencyData.length - 1));
          const ridge = ((frequencyData[sourceRow] || 0) / 255) * energy * height * 0.035;
          context.lineTo(x, y - ridge);
        }
        context.strokeStyle = `rgba(154, 193, 172, ${0.08 + energy * 0.2})`;
        context.lineWidth = 0.7;
        context.stroke();
      }
      context.fillStyle = "rgba(207, 221, 205, 0.62)";
      context.font = "10px ui-monospace, monospace";
      context.fillText("FIELD / 01", left, horizon - 18);
    };

    const drawScope = (
      width: number,
      height: number,
      waveformData: Uint8Array,
      frequencyData: Uint8Array
    ) => {
      const cx = width / 2;
      const cy = height * 0.51;
      const scale = Math.min(width * 0.38, height * 0.46);
      const bass = average(frequencyData, 0, 18) / 255;
      let peak = 0;
      for (let i = 0; i < waveformData.length - 8; i++) {
        peak = Math.max(peak, Math.abs(waveformData[i] - 128) / 128);
      }
      const gain = Math.min(5, 0.88 / Math.max(peak, 0.18));

      context.save();
      context.translate(cx, cy);
      context.strokeStyle = "rgba(182, 201, 201, 0.09)";
      context.lineWidth = 1;
      for (const factor of [0.45, 0.9, 1.35]) {
        context.beginPath();
        context.ellipse(0, 0, scale * factor, scale * factor * 0.72, 0, 0, Math.PI * 2);
        context.stroke();
      }
      context.beginPath();
      context.moveTo(-scale * 1.5, 0);
      context.lineTo(scale * 1.5, 0);
      context.moveTo(0, -scale * 1.1);
      context.lineTo(0, scale * 1.1);
      context.strokeStyle = "rgba(182, 201, 201, 0.12)";
      context.stroke();

      const points = Math.min(240, waveformData.length - 8);
      context.beginPath();
      for (let i = 0; i < points; i++) {
        const xSample = ((waveformData[i] - 128) / 128) * gain;
        const ySample = ((waveformData[i + 8] - 128) / 128) * gain;
        const x = xSample * scale * 1.1;
        const y = ySample * scale * 0.86;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.strokeStyle = "rgba(226, 177, 157, 0.95)";
      context.lineWidth = 1.45;
      context.shadowColor = "rgba(226, 177, 157, 0.54)";
      context.shadowBlur = 13 + bass * 10;
      context.stroke();
      context.restore();
      context.shadowBlur = 0;

      context.fillStyle = "rgba(199, 210, 204, 0.62)";
      context.font = "10px ui-monospace, monospace";
      context.textAlign = "center";
      context.fillText("X / TIME-DELAYED SAMPLE", cx, cy + scale * 0.86 + 22);
      context.textAlign = "left";
    };

    const drawSpectrum = (
      width: number,
      height: number,
      frequencyData: Uint8Array
    ) => {
      const bins = Math.min(128, frequencyData.length);
      if (Date.now() - lastSpectrogramFrameRef.current > 85) {
        const frame = Array.from(frequencyData.slice(0, bins));
        spectrogramHistoryRef.current = [frame, ...spectrogramHistoryRef.current].slice(0, 96);
        lastSpectrogramFrameRef.current = Date.now();
      }

      const left = width * 0.1;
      const right = width * 0.9;
      const top = height * 0.2;
      const bottom = height * 0.78;
      const columns = Math.min(128, Math.max(72, Math.floor((right - left) / 6)));
      const rows = 56;
      const cellWidth = (right - left) / columns;
      const cellHeight = (bottom - top) / rows;
      const history = spectrogramHistoryRef.current;

      for (let row = 0; row < Math.min(rows, history.length); row++) {
        const frame = history[row];
        if (!frame) continue;
        for (let col = 0; col < columns; col++) {
          const position = col / (columns - 1);
          const bin = Math.floor(Math.pow(position, 1.72) * (bins - 1));
          const energy = Math.pow(Math.min(1, (frame[bin] || 0) / 210), 1.08);
          if (energy < 0.12) continue;
          const x = left + col * cellWidth;
          const y = bottom - (row + 1) * cellHeight;
          const hue = 190 + position * 18;
          const age = row / rows;
          const lightness = 12 + energy * 56 - age * 7;
          const opacity = (0.24 + energy * 0.76) * (1 - age * 0.48);
          const color = `hsla(${hue}, ${48 + energy * 36}%, ${lightness}%, ${opacity})`;
          context.fillStyle = color;
          context.fillRect(x, y, Math.max(1, cellWidth - 0.8), Math.max(1, cellHeight - 0.7));
        }
      }

      context.strokeStyle = "rgba(205, 220, 211, 0.13)";
      context.lineWidth = 1;
      for (let tick = 0; tick <= 4; tick++) {
        const x = left + (right - left) * tick / 4;
        context.beginPath();
        context.moveTo(x, top - 7);
        context.lineTo(x, bottom + 8);
        context.stroke();
      }
      context.fillStyle = "rgba(190, 205, 198, 0.62)";
      context.font = "10px ui-monospace, monospace";
      context.fillText("20 Hz", left, bottom + 27);
      context.textAlign = "center";
      context.fillText("FREQUENCY →", (left + right) / 2, bottom + 27);
      context.textAlign = "right";
      context.fillText("16 kHz", right, bottom + 27);
      context.textAlign = "left";
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
        drawWave(width, height, waveformData, frequencyData);
      }

      if (visualizerModeRef.current === "ORBIT") {
        drawOrbit(width, height, frequencyData);
      }

      if (visualizerModeRef.current === "GRID") {
        drawGrid(width, height, frequencyData);
      }

      if (visualizerModeRef.current === "SCOPE") {
        drawScope(width, height, waveformData, frequencyData);
      }

      if (visualizerModeRef.current === "SPECTRUM") {
        drawSpectrum(width, height, frequencyData);
      }

      const mode = visualizerModeRef.current;
      const status = !playing
        ? "PREVIEW"
        : !visualizerReady
          ? "ANALYSIS UNAVAILABLE"
          : audioSignalDetectedRef.current
            ? "LIVE AUDIO"
            : "WAITING FOR AUDIO";
      const modeIndex = ALL_MODES.indexOf(mode) + 1;
      const top = 28;
      const side = Math.max(24, width * 0.055);

      context.fillStyle = "rgba(220, 228, 220, 0.64)";
      context.font = "10px ui-monospace, monospace";
      context.fillText("PHANTOM FM     /     AUDIO STUDY", side, top);
      context.textAlign = "right";
      context.fillText(`${String(modeIndex).padStart(2, "0")}  /  0${ALL_MODES.length}`, width - side, top);
      context.textAlign = "left";

      context.strokeStyle = "rgba(214, 225, 220, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(side, top + 17);
      context.lineTo(width - side, top + 17);
      context.stroke();

      context.beginPath();
      context.arc(side + 3, height - 26, 3, 0, Math.PI * 2);
      context.fillStyle = playing && audioSignalDetectedRef.current ? "#b6d3bc" : "#a89679";
      context.fill();
      context.fillStyle = "rgba(220, 228, 220, 0.68)";
      context.font = "10px ui-monospace, monospace";
      context.fillText(status, side + 14, height - 22);
      context.textAlign = "right";
      context.fillStyle = "rgba(220, 228, 220, 0.5)";
      context.fillText(
        autoRotate
          ? `AUTO  /  ${String(secondsToNextMode).padStart(2, "0")}s`
          : "MANUAL  /  SELECTED",
        width - side,
        height - 22
      );
      context.textAlign = "left";

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
  }, [playing, visualizerReady, autoRotate, secondsToNextMode, isVisualizerFullscreen]);

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

  const toggleVisualizerFullscreen = async () => {
    if (isVisualizerFullscreen) {
      setIsVisualizerFullscreen(false);

      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }

      return;
    }

    setIsVisualizerFullscreen(true);

    try {
      await visualizerStageRef.current?.requestFullscreen?.();
    } catch {
      // The fixed-position visualizer still fills the viewport when native
      // fullscreen is unavailable or denied by the browser.
    }
  };

  return (
    <main className="relative h-screen overflow-hidden bg-[#07080b] text-[#e8e7df]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(107,117,130,0.13),transparent_38%),radial-gradient(ellipse_at_88%_90%,rgba(105,89,118,0.12),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.78)]" />

      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      <section className="relative z-10 mx-auto flex h-screen w-full max-w-[1600px] flex-col gap-3 px-3 py-3 md:px-6 md:py-5">
        <header className={isVisualizerFullscreen ? "hidden" : "shrink-0 border border-white/10 bg-[#0a0c0f]/80 px-4 py-3 md:px-5"}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.28em] text-[#a7bdb3]">
                PHANTOM FM <span className="text-white/30">/</span> NOCTURNAL RADIO
              </p>

              <h1 className="mt-1 truncate text-3xl font-semibold tracking-[0.16em] text-[#f2f1e9] md:text-[2.6rem]">
                NIGHT SIGNAL
              </h1>
            </div>

            <div className="shrink-0 text-right text-[10px] tracking-[0.16em] text-white/45">
              <p className={playing ? "text-[#bdd3bd]" : "text-white/40"}>
                ● {signalMessage}
              </p>
              <p className="mt-1">
                {listeners} LISTENER{listeners === 1 ? "" : "S"}
              </p>
              <p className="mt-1 text-[#b4c9bf]">
                MODE {visualizerMode}{" "}
                {autoRotate ? `// NEXT ${secondsToNextMode}s` : "// MANUAL"}
              </p>
            </div>
          </div>
        </header>

        <div ref={visualizerStageRef} className={isVisualizerFullscreen ? "fixed inset-0 z-[100] grid grid-cols-1 bg-[#07080b] p-2 md:p-5" : "grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_276px]"}>
          <section className={isVisualizerFullscreen ? "grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden border border-white/10 bg-[#080a0d]" : "grid min-h-0 grid-rows-[minmax(0,1fr)_112px] overflow-hidden border border-white/10 bg-[#080a0d]"}>
            <div className="flex min-h-0 flex-col">
              <div className="flex min-h-[50px] flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0b0d10] px-3 py-2 sm:px-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#afc5b8]" />
                  <span className="ml-2 text-[10px] tracking-[0.2em] text-white/55">
                    LIVE VISUALS
                  </span>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {ALL_MODES.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => selectVisualizerMode(mode)}
                      className={[
                        "rounded-full border px-2 py-1 text-[8px] font-medium tracking-[0.08em] transition sm:px-3 sm:text-[9px] sm:tracking-[0.12em]",
                        visualizerMode === mode
                          ? "border-[#d6dfd7] bg-[#d6dfd7] text-[#101412]"
                          : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/30 hover:text-white",
                      ].join(" ")}
                    >
                      {mode}
                    </button>
                  ))}

                  <button
                    onClick={enableAutoRotate}
                    className={[
                      "rounded-full border px-2 py-1 text-[8px] font-medium tracking-[0.08em] transition sm:px-3 sm:text-[9px] sm:tracking-[0.12em]",
                      autoRotate
                        ? "border-[#c7b49d] bg-[#c7b49d] text-[#17130e]"
                        : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/30 hover:text-white",
                    ].join(" ")}
                  >
                    AUTO
                  </button>

                  <button
                    onClick={toggleVisualizerFullscreen}
                    aria-label={isVisualizerFullscreen ? "Exit full-screen visualizer" : "Open full-screen visualizer"}
                    title={isVisualizerFullscreen ? "Exit full-screen visualizer" : "Open full-screen visualizer"}
                    className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium tracking-[0.1em] text-white/75 transition hover:border-white/35 hover:bg-white/[0.08] hover:text-white sm:px-3"
                  >
                    {isVisualizerFullscreen ? "EXIT" : <><span className="sm:hidden">⛶</span><span className="hidden sm:inline">FULLSCREEN</span></>}
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 bg-[#080a0d]">
                <canvas ref={canvasRef} className="h-full w-full" />
              </div>
            </div>

            {!isVisualizerFullscreen ? <div className="border-t border-white/10 bg-[#0a0c0f] px-3 py-2">
              <div className="grid h-full grid-cols-[76px_1fr_126px] items-center gap-3">
                <div className="h-[76px] w-[76px] overflow-hidden border border-white/10 bg-[#111419]">
                  {songArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={songArt}
                      alt={song?.title || "Album Art"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(169,186,173,0.2),transparent_70%)] text-center text-[9px] font-semibold tracking-[0.2em] text-[#c2d1c6]">
                      PHANTOM
                      <br />
                      FM
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] tracking-[0.24em] text-[#a7bdb3]">
                    NOW PLAYING
                  </p>

                  <h2 className="mt-0.5 truncate text-xl font-medium tracking-wide text-[#f2f0e9]">
                    {song?.title || "Awaiting Signal"}
                  </h2>

                  <p className="truncate text-sm text-white/55">
                    {song?.artist || "PHANTOM FM"}
                  </p>

                  <div className="mt-1.5 h-1 overflow-hidden bg-white/10">
                    <div
                      className="h-full bg-[#b7cbbd]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-1 flex justify-between text-[9px] tracking-[0.12em] text-white/40">
                    <span>{formatTime(displayElapsed)}</span>
                    <span>
                      {displayDuration ? formatTime(displayDuration) : "LIVE"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={togglePlay}
                    className="rounded-full border border-[#bdcfc3]/60 bg-[#bdcfc3] px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-[#111411] transition hover:bg-[#d0ded3]"
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
                    className="w-full accent-[#bdcfc3]"
                  />

                  <div className="text-right text-[9px] tracking-[0.12em] text-white/40">
                    {Math.round(volume * 100)}%
                  </div>
                </div>
              </div>
            </div> : null}
          </section>

          {!isVisualizerFullscreen ? <aside className="hidden min-h-0 flex-col gap-3 xl:flex">
            <div className="border border-white/10 bg-[#0a0c0f]/85 p-4">
              <p className="text-[10px] tracking-[0.24em] text-[#a7bdb3]">
                STATUS
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-white/45">STREAM</span>
                  <span
                    className={playing ? "text-[#bdd3bd]" : "text-white/40"}
                  >
                    {playing ? "LIVE" : "READY"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-white/45">LISTENERS</span>
                  <span className="text-[#d4d7c9]">{listeners}</span>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-white/45">VISUAL</span>
                  <span className="text-[#c7b49d]">{visualizerMode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white/45">AUTO</span>
                  <span
                    className={
                      autoRotate ? "text-[#bdd3bd]" : "text-[#c7b49d]"
                    }
                  >
                    {autoRotate ? `${secondsToNextMode}s` : "OFF"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#0a0c0f]/85 p-4">
              <p className="text-[10px] tracking-[0.24em] text-[#a7bdb3]">
                NEXT
              </p>

              <div className="mt-4 flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden border border-white/10 bg-[#111419]">
                  {nextArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nextArt}
                      alt={nextSong?.title || "Next Track"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle,rgba(169,186,173,0.18),transparent_70%)]" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-medium text-[#f2f0e9]">
                    {nextSong?.title || "Unknown"}
                  </h3>

                  <p className="mt-1 truncate text-sm text-white/55">
                    {nextSong?.artist || "Awaiting queue"}
                  </p>

                  <p className="mt-1 truncate text-xs text-white/30">
                    {nextSong?.album || "Queue signal pending."}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#0a0c0f]/85 p-4">
              <p className="text-[10px] tracking-[0.24em] text-[#a7bdb3]">
                LINKS
              </p>

              <a
                href="https://radio.phantomfm.xyz/public/phantomfm"
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-md border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-medium text-white/65 transition hover:border-white/30 hover:text-white"
              >
                PUBLIC PLAYER
              </a>

              <a
                href={STREAM_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-md border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-medium text-white/65 transition hover:border-white/30 hover:text-white"
              >
                DIRECT STREAM
              </a>
            </div>

            <div className="min-h-0 flex-1 border border-white/10 bg-[#0a0c0f]/85 p-4">
              <p className="text-[10px] tracking-[0.24em] text-[#a7bdb3]">
                VISUAL CORE
              </p>

              <div className="mt-5 flex h-[150px] items-center justify-center bg-[radial-gradient(ellipse,rgba(169,186,173,0.08),transparent_68%)]">
                <div className="relative h-24 w-24 rounded-full border border-[#a9baad]/20">
                  <div className="absolute inset-2 rounded-full border border-[#a9baad]/25" />
                  <div className="absolute inset-[38%] rounded-full bg-[#b8c9bc]/75 shadow-[0_0_28px_rgba(184,201,188,0.5)]" />
                  <div className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 rounded-full bg-[#d1bd9e] shadow-[0_0_14px_rgba(209,189,158,0.7)]" />
                </div>
              </div>
            </div>
          </aside> : null}
        </div>
      </section>
    </main>
  );
}
