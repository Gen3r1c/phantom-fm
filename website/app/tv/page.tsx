"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { XMLParser } from "fast-xml-parser";

type Channel = {
  id: string;
  number: string;
  name: string;
  logo: string;
  stream: string;
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

const channels: Channel[] = [
  {
    id: "C00.0.ersatztv.org",
    number: "00",
    name: "Null",
    logo: "/null.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/00.m3u8?mode=segmenter",
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
];

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

  const iso = `${datetime.slice(0, 4)}-${datetime.slice(
    4,
    6
  )}-${datetime.slice(6, 8)}T${datetime.slice(8, 10)}:${datetime.slice(
    10,
    12
  )}:${datetime.slice(12, 14)}${
    offset ? offset.slice(0, 3) + ":" + offset.slice(3) : "Z"
  }`;

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

  const windowMinutes = 240;
  const windowEnd = new Date(
    windowStart.getTime() + windowMinutes * 60 * 1000
  );

  const currentLinePercent =
    ((currentTime.getTime() - windowStart.getTime()) /
      (windowMinutes * 60 * 1000)) *
    100;

  const timeTicks = Array.from({ length: 5 }).map((_item, index) => {
    const tick = new Date(windowStart.getTime() + index * 60 * 60 * 1000);

    return {
      time: tick,
      left: (index / 4) * 100,
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
        const response = await fetch(
          "https://tv.phantomfm.xyz/iptv/xmltv.xml"
        );

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
              icon,
            };
          })
          .filter((show: GuideShow) => show.channel && show.start && show.stop);

        setGuide(normalized);
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

    if (channel.offline) {
      return;
    }

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
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
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
          parseGuideTime(a.start).getTime() -
          parseGuideTime(b.start).getTime()
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
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(147,51,234,0.20),transparent_34%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,0.10),transparent_30%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.95)]" />

      {/* GUIDE BUTTON */}
      <button
        onClick={() => setGuideOpen(true)}
        className="absolute left-5 top-5 z-50 flex h-14 w-14 items-center justify-center border border-purple-700/70 bg-black/75 shadow-[0_0_22px_rgba(168,85,247,0.24)] transition-all hover:scale-105 hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.25)]"
        aria-label="Open channel guide"
      >
        <Image
          src="/burger.png"
          alt="Guide"
          width={42}
          height={42}
          className="object-contain"
        />
      </button>

      {/* GUIDE PANEL */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-[96vw] border-r border-purple-700/70 bg-[#05010b]/98 shadow-[20px_0_80px_rgba(0,0,0,0.65)] backdrop-blur-md transition-transform duration-300 ${
          guideOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between border border-purple-900/80 bg-black/70 px-5 py-4 shadow-[0_0_28px_rgba(147,51,234,0.14)]">
            <div>
              <h2 className="text-base font-black tracking-[0.35em] text-white drop-shadow-[0_0_14px_rgba(168,85,247,0.65)]">
                PHANTOM TV GUIDE
              </h2>

              <p className="mt-1 text-[10px] tracking-[0.28em] text-cyan-300">
                LIVE CARRIER INDEX // TIMELINE MODE
              </p>
            </div>

            <button
              onClick={() => setGuideOpen(false)}
              className="text-3xl text-purple-300 transition-all hover:text-cyan-300"
              aria-label="Close channel guide"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden border border-purple-900/80 bg-black/65">
            <div className="flex h-full flex-col">
              {/* TIMELINE GUIDE */}
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="grid h-full grid-cols-[165px_1fr]">
                  {/* LEFT CHANNEL HEADER */}
                  <div className="border-b border-r border-purple-900/80 bg-[#09020f] px-4 py-3 text-[10px] tracking-[0.24em] text-cyan-300">
                    CHANNEL
                  </div>

                  {/* TIME HEADER */}
                  <div className="relative border-b border-purple-900/80 bg-[#09020f]">
                    {timeTicks.map((tick) => (
                      <div
                        key={tick.left}
                        className="absolute top-0 h-full border-l border-purple-900/70 px-2 py-3 text-[10px] tracking-[0.18em] text-purple-300"
                        style={{ left: `${tick.left}%` }}
                      >
                        {formatHour(tick.time)}
                      </div>
                    ))}
                  </div>

                  {/* CHANNELS */}
                  <div className="col-span-2 min-h-0 overflow-hidden">
                    <div className="relative">
                      {currentLinePercent >= 0 && currentLinePercent <= 100 ? (
                        <div
                          className="pointer-events-none absolute bottom-0 top-0 z-[25] w-[2px] bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.9)]"
                          style={{
                            left: `calc(165px + ${currentLinePercent}% * (100% - 165px) / 100)`,
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
                              "grid h-[76px] grid-cols-[165px_1fr] border-b border-purple-900/70",
                              active ? "bg-cyan-950/10" : "bg-black/20",
                            ].join(" ")}
                          >
                            {/* CHANNEL CELL */}
                            <button
                              onClick={() => {
                                setCurrentChannel(index);
                                setGuideOpen(false);
                              }}
                              className={[
                                "z-30 flex items-center gap-2 border-r px-3 text-left transition-all",
                                active
                                  ? "border-cyan-300 bg-[#071018] shadow-[0_0_22px_rgba(34,211,238,0.15)]"
                                  : "border-purple-900/80 bg-[#05010b] hover:bg-purple-950/30",
                              ].join(" ")}
                            >
                              <div className="flex h-10 w-12 shrink-0 items-center justify-center border border-purple-900/70 bg-black/70 px-1">
                                <Image
                                  src={channel.logo}
                                  alt={channel.name}
                                  width={42}
                                  height={28}
                                  className="object-contain"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="text-[9px] tracking-[0.18em] text-cyan-300">
                                  CH {channel.number}
                                </div>

                                <div className="truncate text-[13px] leading-tight text-white">
                                  {channel.name}
                                </div>

                                <div
                                  className={[
                                    "mt-1 text-[9px] tracking-[0.16em]",
                                    channel.manual
                                      ? "text-cyan-300"
                                      : active
                                        ? "text-green-300"
                                        : "text-purple-400",
                                  ].join(" ")}
                                >
                                  {channel.manual
                                    ? "MANUAL"
                                    : active
                                      ? "ACTIVE"
                                      : "READY"}
                                </div>
                              </div>
                            </button>

                            {/* TIMELINE ROW */}
                            <div className="relative overflow-hidden">
                              {/* hour grid */}
                              {timeTicks.map((tick) => (
                                <div
                                  key={`${channel.id}-${tick.left}`}
                                  className="absolute bottom-0 top-0 border-l border-purple-900/40"
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
                                  className="absolute bottom-2 left-2 right-2 top-2 z-20 overflow-hidden border border-cyan-400/80 bg-cyan-950/20 px-3 py-2 text-left shadow-[0_0_20px_rgba(34,211,238,0.12)] transition-all hover:bg-cyan-900/30"
                                >
                                  <div className="text-[9px] tracking-[0.2em] text-cyan-300">
                                    LIVE OVERRIDE
                                  </div>

                                  <div className="mt-1 truncate text-sm font-bold text-white">
                                    Operator Signal
                                  </div>

                                  <div className="mt-1 truncate text-[9px] tracking-[0.16em] text-purple-300">
                                    AWAITING MANUAL TRANSMISSION
                                  </div>
                                </button>
                              ) : shows.length === 0 ? (
                                <div className="flex h-full items-center px-4 text-xs tracking-[0.22em] text-purple-400">
                                  GUIDE DATA SYNCING
                                </div>
                              ) : (
                                shows.map((show, showIndex) => {
                                  const showStart = parseGuideTime(show.start);
                                  const showStop = parseGuideTime(show.stop);

                                  const isClippedStart =
                                    showStart < windowStart;
                                  const isClippedStop = showStop > windowEnd;

                                  const clampedStart = isClippedStart
                                    ? windowStart
                                    : showStart;

                                  const clampedStop = isClippedStop
                                    ? windowEnd
                                    : showStop;

                                  const leftPercent =
                                    ((clampedStart.getTime() -
                                      windowStart.getTime()) /
                                      (windowMinutes * 60 * 1000)) *
                                    100;

                                  const widthPercent =
                                    ((clampedStop.getTime() -
                                      clampedStart.getTime()) /
                                      (windowMinutes * 60 * 1000)) *
                                    100;

                                  const isLive =
                                    currentTime >= showStart &&
                                    currentTime < showStop;

                                  const durationMinutes =
                                    (showStop.getTime() -
                                      showStart.getTime()) /
                                    60000;

                                  const verySmall =
                                    widthPercent < 5 || durationMinutes < 12;

                                  const small =
                                    widthPercent < 9 || durationMinutes < 22;

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
                                        "absolute bottom-2 top-2 z-20 overflow-hidden border px-2 py-2 text-left transition-all",
                                        isLive
                                          ? "border-green-400/90 bg-green-950/20 shadow-[0_0_18px_rgba(74,222,128,0.12)]"
                                          : "border-purple-800/80 bg-purple-950/20 hover:border-cyan-300 hover:bg-cyan-950/20",
                                      ].join(" ")}
                                      style={{
                                        left: `${leftPercent}%`,
                                        width: `${Math.max(
                                          widthPercent,
                                          2.8
                                        )}%`,
                                      }}
                                      title={`${show.title}${
                                        show.subtitle
                                          ? ` — ${show.subtitle}`
                                          : ""
                                      }`}
                                    >
                                      {!verySmall ? (
                                        <div
                                          className={[
                                            "mb-1 text-[9px] tracking-[0.14em]",
                                            isLive || isClippedStart
                                              ? "text-green-300"
                                              : "text-purple-300",
                                          ].join(" ")}
                                        >
                                          {isLive || isClippedStart
                                            ? "LIVE"
                                            : formatClock(showStart)}
                                        </div>
                                      ) : null}

                                      <div
                                        className={[
                                          "font-bold leading-tight text-white",
                                          small ? "text-[11px]" : "text-xs",
                                        ].join(" ")}
                                        style={{
                                          display: "-webkit-box",
                                          WebkitLineClamp: small ? 2 : 1,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {show.title}
                                      </div>

                                      {!small && show.subtitle ? (
                                        <div className="mt-1 truncate text-[9px] text-cyan-300/80">
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
              </div>

              {/* DETAILS PANEL */}
              <div className="flex h-[178px] border-t border-purple-900/80 bg-[#08020d]">
                <div className="flex w-full gap-4 p-4">
                  <div className="flex h-[146px] w-[104px] shrink-0 items-center justify-center overflow-hidden border border-purple-900/80 bg-black/70">
                    {selectedShow?.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedShow.icon}
                        alt={selectedShow.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={current.logo}
                        alt={current.name}
                        width={72}
                        height={72}
                        className="object-contain"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="truncate text-xl font-black text-white">
                        {selectedShow?.title || current.name}
                      </h3>

                      {selectedShow ? (
                        <div className="text-[10px] tracking-[0.22em] text-cyan-300">
                          {formatClock(parseGuideTime(selectedShow.start))} —{" "}
                          {formatClock(parseGuideTime(selectedShow.stop))}
                        </div>
                      ) : null}
                    </div>

                    {selectedShow?.subtitle ? (
                      <div className="mt-1 text-sm text-purple-300">
                        {selectedShow.subtitle}
                      </div>
                    ) : null}

                    <p
                      className="mt-3 overflow-hidden text-sm leading-relaxed text-purple-100/85"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {selectedShow?.desc ||
                        "No guide description available for this transmission."}
                    </p>

                    <div className="mt-3 text-[10px] tracking-[0.24em] text-purple-400">
                      PHANTOM FM // CHANNEL {current.number} //{" "}
                      {current.manual ? "MANUAL SIGNAL" : "SCHEDULED SIGNAL"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex min-h-screen items-start justify-center px-5 py-5 md:px-8">
        <div className="w-full max-w-[1600px]">
          {/* TOP BAR */}
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
                ●{" "}
                {hasNoSignal
                  ? "NO SIGNAL"
                  : current.manual
                    ? "MANUAL"
                    : "LIVE"}
              </span>

              <span className="hidden text-purple-400 md:inline">
                CH {current.number}
              </span>
            </div>
          </div>

          {/* VIDEO WINDOW */}
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

          {/* FOOTER / TELEMETRY */}
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