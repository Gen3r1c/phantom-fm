"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { XMLParser } from "fast-xml-parser";

type Channel = {
  id: string;
  number: string;
  name: string;
  logo: string;
  stream: string;
  guideUrl?: string;
  offline?: boolean;
  manual?: boolean;
};

type GuideShow = {
  channel: string;
  title: string;
  subtitle?: string;
  desc?: string;
  start: string;
  stop: string;
  icon?: string;
};

const defaultGuideUrl = "https://tv.phantomfm.xyz/iptv/xmltv.xml";

const channels: Channel[] = [
  {
    id: "C00.0.ersatztv.org",
    number: "00",
    name: "Null",
    logo: "/null.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/00.m3u8?mode=segmenter",
  },
  {
    id: "C01.145.ersatztv.org",
    number: "01",
    name: "The Room",
    logo: "https://tv.phantomfm.xyz/iptv/logos/B6917CA5D3E9F5725DB0FA5E0AB6CBDC.jpg?v=639175973267742781",
    stream: "https://tv.phantomfm.xyz/iptv/channel/01.m3u8",
  },
  {
    id: "C02.146.ersatztv.org",
    number: "02",
    name: "Adult Swim",
    logo: "/adultswim.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/02.m3u8",
  },
  {
    id: "C03.147.ersatztv.org",
    number: "03",
    name: "How It's Made",
    logo: "/howitsmade.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/03.m3u8",
  },
  {
    id: "C04.148.ersatztv.org",
    number: "04",
    name: "Force TV",
    logo: "/forcetv.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/04.m3u8",
  },
  {
    id: "05.operator.phantomfm.xyz",
    number: "05",
    name: "Operator Signal",
    logo: "/null.png",
    stream: "https://operator.phantomfm.xyz/live/operator/index.m3u8",
    manual: true,
  },
  {
    id: "C8.152.ersatztv.org",
    number: "08",
    name: "DBZ-Kai",
    logo: "https://data.0xfdb.tv/iptv/logos/58EDAB0EE75B5A7CA3BC1341316174E4.jpg",
    stream: "https://data.0xfdb.tv/iptv/channel/8.m3u8?mode=segmenter",
    guideUrl: "https://data.0xfdb.tv/iptv/xmltv.xml",
  },
];

function cleanImageUrl(url?: string | null) {
  if (!url) return "";

  return decodeGuideText(url)
    .trim()
    .replace(/^"+/, "")
    .replace(/"+$/, "")
    .replace(/&amp;/g, "&");
}

function ChannelLogo({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <img
      src={cleanImageUrl(src)}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}

function decodeGuideText(value: string) {
  return value
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function xmlText(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value?.["#text"] === "string") return value["#text"];
  return "";
}

function parseGuideTime(timeString: string) {
  if (!timeString) return new Date();

  if (timeString.includes("T")) {
    return new Date(timeString);
  }

  const [datetime, offset] = timeString.split(" ");

  const iso = `${datetime.slice(0, 4)}-${datetime.slice(4, 6)}-${datetime.slice(
    6,
    8
  )}T${datetime.slice(8, 10)}:${datetime.slice(10, 12)}:${datetime.slice(
    12,
    14
  )}${offset ? offset.slice(0, 3) + ":" + offset.slice(3) : "Z"}`;

  return new Date(iso);
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHour(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
  });
}

async function updatePhantomPresence(channel: Channel) {
  try {
    await fetch("http://localhost:5055/channel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel.number,
        name: channel.name,
      }),
    });
  } catch {
    console.log("PHANTOM Presence bridge not available.");
  }
}

export default function TVPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [guideOpen, setGuideOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(0);
  const [guide, setGuide] = useState<GuideShow[]>([]);
  const [signalError, setSignalError] = useState(false);
  const [hoveredShow, setHoveredShow] = useState<GuideShow | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const current = channels[currentChannel];
  const hasNoSignal = current.offline || signalError;

  const windowStart = new Date(currentTime);
  windowStart.setMinutes(0, 0, 0);

  const windowMinutes = 180;
  const windowEnd = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);

  const currentLinePercent =
    ((currentTime.getTime() - windowStart.getTime()) /
      (windowMinutes * 60 * 1000)) *
    100;

  const timeTicks = Array.from({ length: 4 }).map((_item, index) => {
    const tick = new Date(windowStart.getTime() + index * 60 * 60 * 1000);

    return {
      time: tick,
      left: (index / 3) * 100,
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    updatePhantomPresence(current);
  }, [current]);

  useEffect(() => {
    const loadGuide = async () => {
      try {
        const guideUrls = Array.from(
          new Set(channels.map((channel) => channel.guideUrl || defaultGuideUrl))
        );

        const allShows: GuideShow[] = [];

        for (const guideUrl of guideUrls) {
          const response = await fetch(guideUrl);
          const xml = await response.text();

          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
          });

          const parsed = parser.parse(xml);
          let programmes = parsed?.tv?.programme || [];

          if (!Array.isArray(programmes)) {
            programmes = [programmes];
          }

          const normalized: GuideShow[] = programmes
            .map((prog: any) => {
              const title = xmlText(prog.title);
              const subtitle = xmlText(prog["sub-title"]);
              const desc = xmlText(prog.desc);

              let icon = "";

              if (prog.icon?.src) {
                icon = prog.icon.src;
              } else if (Array.isArray(prog.image)) {
                icon = prog.image[0]?.["#text"] || "";
              } else if (typeof prog.image === "string") {
                icon = prog.image;
              } else if (prog.image?.["#text"]) {
                icon = prog.image["#text"];
              }

              return {
                channel: prog.channel || "",
                title: decodeGuideText(title || "Unknown Show"),
                subtitle: decodeGuideText(subtitle || ""),
                desc: decodeGuideText(desc || ""),
                start: prog.start || "",
                stop: prog.stop || "",
                icon: cleanImageUrl(icon),
              };
            })
            .filter((show: GuideShow) => show.channel && show.start && show.stop);

          allShows.push(...normalized);
        }

        setGuide(allShows);
      } catch (err) {
        console.error("GUIDE ERROR:", err);
      }
    };

    loadGuide();
    const interval = setInterval(loadGuide, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const channel = channels[currentChannel];

    setSignalError(false);
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (channel.offline) return;

    const stream = channel.stream;

    const handleNativeError = () => {
      console.warn("PHANTOM TV stream error:", channel.name);
      setSignalError(true);
    };

    video.addEventListener("error", handleNativeError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: channel.manual ? true : false,
      });

      hls.loadSource(stream);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          console.warn("Autoplay blocked; user interaction required.");
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn("HLS ERROR:", data);

        if (data.fatal) {
          setSignalError(true);
          hls.destroy();
        }
      });

      return () => {
        video.removeEventListener("error", handleNativeError);
        hls.destroy();
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream;
      video.play().catch(() => {
        console.warn("Autoplay blocked; user interaction required.");
      });
    } else {
      setSignalError(true);
    }

    return () => {
      video.removeEventListener("error", handleNativeError);
    };
  }, [currentChannel]);

  const getShowsForChannel = (channelId: string) => {
    return guide
      .filter((show) => show.channel === channelId)
      .filter((show) => {
        const start = parseGuideTime(show.start);
        const stop = parseGuideTime(show.stop);

        return stop > windowStart && start < windowEnd;
      })
      .sort(
        (a, b) =>
          parseGuideTime(a.start).getTime() - parseGuideTime(b.start).getTime()
      );
  };

  const getCurrentShow = (channelId: string) => {
    return guide.find((show) => {
      if (show.channel !== channelId) return false;

      const start = parseGuideTime(show.start);
      const stop = parseGuideTime(show.stop);

      return currentTime >= start && currentTime < stop;
    });
  };

  const selectedShow =
    hoveredShow ||
    getCurrentShow(current.id) ||
    getShowsForChannel(current.id)[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030008] text-purple-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(147,51,234,0.20),transparent_34%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,0.10),transparent_30%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.95)]" />

      <button
        onClick={() => setGuideOpen(true)}
        className="absolute left-5 top-5 z-50 flex h-14 w-14 items-center justify-center border border-purple-700/70 bg-black/75 shadow-[0_0_22px_rgba(168,85,247,0.24)] transition-all hover:scale-105 hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.25)]"
        aria-label="Open channel guide"
      >
        <img
          src="/burger.png"
          alt="Guide"
          width={42}
          height={42}
          className="object-contain"
        />
      </button>

      {/* LEFT PANEL GUIDE */}
      <div
        className={`fixed left-0 top-0 z-50 h-screen w-[78vw] bg-[#050505] text-white shadow-[20px_0_80px_rgba(0,0,0,0.85)] transition-transform duration-300 ${
          guideOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden p-3">
          <div className="mb-2 flex h-12 shrink-0 items-center justify-between border border-purple-900/80 bg-black px-5">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black tracking-[0.16em] text-white">
                Channel Guide
              </h2>
              <span className="text-xs tracking-[0.22em] text-cyan-300">
                PHANTOM FM // LIVE TIMELINE
              </span>
            </div>

            <button
              onClick={() => setGuideOpen(false)}
              className="text-4xl leading-none text-purple-300 transition hover:text-cyan-300"
              aria-label="Close channel guide"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden border border-purple-900/80 bg-[#202020]">
            <div className="flex h-full flex-col">
              <div className="grid h-8 shrink-0 grid-cols-[150px_1fr] bg-[#111]">
                <div className="flex items-center border-b border-r border-black/80 px-4 text-xs font-bold tracking-[0.18em] text-cyan-300">
                  CHANNEL
                </div>

                <div className="relative border-b border-black/80">
                  {timeTicks.map((tick) => (
                    <div
                      key={tick.left}
                      className="absolute top-0 flex h-full items-center border-l border-white/10 px-3 text-sm font-bold text-purple-200"
                      style={{ left: `${tick.left}%` }}
                    >
                      {formatHour(tick.time)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {currentLinePercent >= 0 && currentLinePercent <= 100 ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-[999] w-[3px] bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,1)]"
                    style={{
                      left: `calc(150px + ${currentLinePercent}% * (100% - 150px) / 100)`,
                    }}
                  />
                ) : null}

                {channels.map((channel, index) => {
                  const shows = getShowsForChannel(channel.id);
                  const active = currentChannel === index;

                  return (
                    <div
                      key={channel.number}
                      className={[
                        "grid h-[76px] grid-cols-[150px_1fr] border-b border-black/80",
                        active ? "bg-[#252525]" : "bg-[#2f2f2f]",
                      ].join(" ")}
                    >
                      <button
                        onClick={() => {
                          setCurrentChannel(index);
                          setGuideOpen(false);
                        }}
                        className={[
                          "z-30 flex items-center gap-3 border-r border-black/80 px-3 text-left transition",
                          active ? "bg-[#1a1a1a]" : "bg-[#111] hover:bg-[#1c1c1c]",
                        ].join(" ")}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-black p-1">
                          <ChannelLogo
                            src={channel.logo}
                            alt={channel.name}
                            width={38}
                            height={38}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white">
                            {channel.number}
                          </div>
                          <div className="truncate text-sm font-bold text-white">
                            {channel.name}
                          </div>
                          <div
                            className={[
                              "text-[11px] font-bold",
                              channel.manual ? "text-cyan-300" : "text-green-400",
                            ].join(" ")}
                          >
                            {channel.manual ? "Manual" : "Viewers: 0"}
                          </div>
                        </div>
                      </button>

                      <div className="relative overflow-hidden">
                        {timeTicks.map((tick) => (
                          <div
                            key={`${channel.id}-${tick.left}`}
                            className="absolute bottom-0 top-0 border-l border-white/10"
                            style={{ left: `${tick.left}%` }}
                          />
                        ))}

                        {channel.manual ? (
                          <button
                            onClick={() => {
                              setCurrentChannel(index);
                              setGuideOpen(false);
                            }}
                            onMouseEnter={() =>
                              setHoveredShow({
                                channel: channel.id,
                                title: "Operator Signal",
                                subtitle: "Manual Broadcast Override",
                                desc: "Live manual feed from the PHANTOM FM operator. This channel activates when the operator begins transmission.",
                                start: new Date().toISOString(),
                                stop: new Date(
                                  Date.now() + windowMinutes * 60000
                                ).toISOString(),
                              })
                            }
                            onMouseLeave={() => setHoveredShow(null)}
                            className="absolute bottom-1.5 left-2 right-2 top-1.5 z-20 overflow-hidden border border-cyan-500/80 bg-cyan-950/30 px-3 py-2 text-left"
                          >
                            <div className="text-xs font-bold text-cyan-300">
                              LIVE OVERRIDE
                            </div>
                            <div className="truncate text-base font-black text-white">
                              Operator Signal
                            </div>
                          </button>
                        ) : shows.length === 0 ? (
                          <div className="flex h-full items-center px-4 text-sm text-zinc-300">
                            Guide data syncing...
                          </div>
                        ) : (
                          shows.map((show, showIndex) => {
                            const showStart = parseGuideTime(show.start);
                            const showStop = parseGuideTime(show.stop);

                            const isClippedStart = showStart < windowStart;
                            const isClippedStop = showStop > windowEnd;

                            const clampedStart = isClippedStart
                              ? windowStart
                              : showStart;

                            const clampedStop = isClippedStop ? windowEnd : showStop;

                            const visibleMinutes =
                              (clampedStop.getTime() - clampedStart.getTime()) /
                              60000;

                            if (visibleMinutes < 8) {
                              return null;
                            }

                            const leftPercent =
                              ((clampedStart.getTime() - windowStart.getTime()) /
                                (windowMinutes * 60 * 1000)) *
                              100;

                            const widthPercent =
                              ((clampedStop.getTime() - clampedStart.getTime()) /
                                (windowMinutes * 60 * 1000)) *
                              100;

                            const isLive =
                              currentTime >= showStart && currentTime < showStop;

                            const small = widthPercent < 8 || visibleMinutes < 18;

                            return (
                              <button
                                key={`${channel.id}-${show.start}-${showIndex}`}
                                onClick={() => {
                                  setCurrentChannel(index);
                                  setGuideOpen(false);
                                }}
                                onMouseEnter={() => setHoveredShow(show)}
                                onMouseLeave={() => setHoveredShow(null)}
                                className={[
                                  "absolute bottom-1.5 top-1.5 z-20 overflow-hidden rounded-sm border px-3 py-2 text-left transition",
                                  isLive
                                    ? "border-cyan-400 bg-cyan-950/55 shadow-[0_0_22px_rgba(34,211,238,0.28)]"
                                    : "border-transparent bg-transparent hover:border-cyan-400 hover:bg-cyan-950/35",
                                ].join(" ")}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                title={`${show.title}${
                                  show.subtitle ? ` — ${show.subtitle}` : ""
                                }`}
                              >
                                <div
                                  className="text-sm font-black leading-tight text-white"
                                  style={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {show.title}
                                </div>

                                {!small && show.subtitle ? (
                                  <div className="mt-1 truncate text-xs text-zinc-300">
                                    {show.subtitle}
                                  </div>
                                ) : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-2 flex h-[170px] shrink-0 border border-purple-900/80 bg-[#111]">
            <div className="flex w-full gap-5 p-4">
              <div className="flex h-[138px] w-[98px] shrink-0 items-center justify-center overflow-hidden bg-black">
                {selectedShow?.icon ? (
                  <img
                    src={cleanImageUrl(selectedShow.icon)}
                    alt={selectedShow.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ChannelLogo
                    src={current.logo}
                    alt={current.name}
                    width={70}
                    height={70}
                    className="max-h-[70px] max-w-[70px] object-contain"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-4">
                  <h3 className="truncate text-2xl font-black text-white">
                    {selectedShow?.title || current.name}
                  </h3>

                  {selectedShow ? (
                    <div className="text-sm font-bold tracking-[0.12em] text-cyan-300">
                      {formatClock(parseGuideTime(selectedShow.start))} —{" "}
                      {formatClock(parseGuideTime(selectedShow.stop))}
                    </div>
                  ) : null}
                </div>

                {selectedShow?.subtitle ? (
                  <div className="mt-1 text-base text-purple-200">
                    {selectedShow.subtitle}
                  </div>
                ) : null}

                <p
                  className="mt-3 overflow-hidden text-base leading-relaxed text-zinc-200"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {selectedShow?.desc || "No program selected."}
                </p>

                <div className="mt-3 text-xs font-bold tracking-[0.2em] text-purple-400">
                  PHANTOM FM // CHANNEL {current.number} //{" "}
                  {current.manual ? "MANUAL SIGNAL" : "SCHEDULED SIGNAL"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TV PAGE */}
      <div className="relative z-10 flex min-h-screen items-start justify-center px-5 py-5 md:px-8">
        <div className="w-full max-w-[1600px]">
          <div className="mb-4 flex flex-col gap-3 border border-purple-900/80 bg-black/65 px-5 py-4 shadow-[0_0_35px_rgba(147,51,234,0.18)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs tracking-[0.32em] text-cyan-300">
                PHANTOM TV // LIVE TRANSMISSION
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-[0.24em] text-white drop-shadow-[0_0_16px_rgba(168,85,247,0.75)] md:text-5xl">
                {current.name}
              </h1>
            </div>

            <div className="flex items-center gap-4 text-sm tracking-[0.28em]">
              <span
                className={
                  hasNoSignal
                    ? "animate-pulse text-red-400"
                    : current.manual
                      ? "animate-pulse text-cyan-300"
                      : "animate-pulse text-green-300"
                }
              >
                ● {hasNoSignal ? "NO SIGNAL" : current.manual ? "MANUAL" : "LIVE"}
              </span>

              <span className="hidden text-purple-400 md:inline">
                CH {current.number}
              </span>
            </div>
          </div>

          <div className="overflow-hidden border border-purple-900/80 bg-black shadow-[0_0_50px_rgba(147,51,234,0.22)]">
            <div className="flex items-center justify-between border-b border-purple-900/80 bg-[#0b0315] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
              </div>

              <p className="text-xs tracking-[0.28em] text-purple-300">
                {current.manual
                  ? "/PHANTOM/OPERATOR/05"
                  : `/PHANTOM/TV/CARRIER/${current.number}`}
              </p>
            </div>

            <div className="relative bg-black">
              <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_90px_rgba(0,0,0,0.65)]" />

              {hasNoSignal ? (
                <div className="flex h-[calc(100vh-260px)] min-h-[420px] w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(127,29,29,0.18),transparent_45%),#020006] text-red-400">
                  <div className="mb-5 animate-pulse text-center text-4xl font-black tracking-[0.34em] drop-shadow-[0_0_18px_rgba(248,113,113,0.45)] md:text-6xl">
                    {current.manual ? "OPERATOR SIGNAL DORMANT" : "SIGNAL LOST"}
                  </div>

                  <div className="text-xs tracking-[0.3em] text-pink-400">
                    {current.manual
                      ? "AWAITING MANUAL TRANSMISSION"
                      : "NULL CHANNEL OFFLINE"}
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  controls
                  controlsList="nodownload"
                  className="relative z-10 h-[calc(100vh-260px)] min-h-[420px] w-full bg-black object-contain"
                />
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 text-xs tracking-[0.2em] text-purple-300 md:grid-cols-3">
            <div className="border border-purple-900/80 bg-black/60 px-4 py-3">
              CHANNEL <span className="text-cyan-300">{current.number}</span>
            </div>

            <div className="border border-purple-900/80 bg-black/60 px-4 py-3 text-left md:text-center">
              PHANTOMFM.XYZ
            </div>

            <div className="border border-purple-900/80 bg-black/60 px-4 py-3 text-left md:text-right">
              <span
                className={
                  hasNoSignal
                    ? "text-red-400"
                    : current.manual
                      ? "text-cyan-300"
                      : "text-green-300"
                }
              >
                {hasNoSignal
                  ? "NO SIGNAL"
                  : current.manual
                    ? "OPERATOR SIGNAL ACTIVE"
                    : "SIGNAL STABLE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}