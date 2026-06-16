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

const channels: Channel[] = [
  {
    id: "00.ersatztv.org",
    number: "00",
    name: "Null",
    logo: "/null.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/00.m3u8",
  },
  {
    id: "02.146.ersatztv.org",
    number: "02",
    name: "Adult Swim",
    logo: "/adultswim.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/02.m3u8",
  },
  {
    id: "03.147.ersatztv.org",
    number: "03",
    name: "How It's Made",
    logo: "/howitsmade.png",
    stream: "https://tv.phantomfm.xyz/iptv/channel/03.m3u8",
  },
  {
    id: "04.148.ersatztv.org",
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

type GuideShow = {
  channel: string;
  title: string;
  subtitle?: string;
  start: string;
};

async function updatePhantomPresence(channel: {
  number: string;
  name: string;
}) {
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

  const current = channels[currentChannel];
  const hasNoSignal = "offline" in current && current.offline ? true : signalError;

  // DISCORD RICH PRESENCE BRIDGE
  useEffect(() => {
    updatePhantomPresence(current);
  }, [current]);

  // LOAD XMLTV
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
            const title =
              typeof prog.title === "string" ? prog.title : prog.title?.["#text"];

            const subtitle =
              typeof prog["sub-title"] === "string"
                ? prog["sub-title"]
                : prog["sub-title"]?.["#text"];

            return {
              channel: prog.channel || prog["@_channel"] || "",
              title: title || "Unknown Show",
              subtitle: subtitle || "",
              start: prog.start || prog["@_start"] || "",
            };
          })
          .filter((show: GuideShow) => show.channel);

        setGuide(normalized);
      } catch (err) {
        console.error("GUIDE ERROR:", err);
      }
    };

    loadGuide();
  }, []);

  // VIDEO PLAYER
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const current = channels[currentChannel];

    setSignalError(false);

    video.pause();
    video.removeAttribute("src");
    video.load();

   if ("offline" in current && current.offline) {
  return;
    }

    const stream = current.stream;

    const handleNativeError = () => {
      console.warn("PHANTOM TV stream error:", current.name);
      setSignalError(true);
    };

    video.addEventListener("error", handleNativeError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: current.manual ? true : false,
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

  // XMLTV TIME PARSER
  const parseGuideTime = (timeString: string) => {
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
  };

  // GUIDE DATA
  const getChannelShows = (channelId: string) => {
    const now = new Date();

    const channelShows = guide
      .filter((show) =>
        show.channel?.toLowerCase().includes(channelId.toLowerCase())
      )
      .sort(
        (a, b) =>
          parseGuideTime(a.start).getTime() -
          parseGuideTime(b.start).getTime()
      );

    const currentIndex = channelShows.findIndex((show, index) => {
      const start = parseGuideTime(show.start);
      const next = channelShows[index + 1];

      const end = next
        ? parseGuideTime(next.start)
        : new Date(start.getTime() + 30 * 60000);

      return now >= start && now < end;
    });

    if (currentIndex === -1) {
      return channelShows.slice(0, 4);
    }

    return channelShows.slice(currentIndex, currentIndex + 4);
  };

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
        className={`fixed left-0 top-0 z-50 h-full w-[92vw] border-r border-purple-700/70 bg-[#05010b]/98 shadow-[20px_0_80px_rgba(0,0,0,0.65)] backdrop-blur-md transition-transform duration-300 md:w-[72vw] xl:w-[58vw] ${
          guideOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden p-5">
          <div className="mb-5 flex items-center justify-between border border-purple-900/80 bg-black/70 px-5 py-4 shadow-[0_0_28px_rgba(147,51,234,0.14)]">
            <div>
              <h2 className="text-base font-black tracking-[0.35em] text-white drop-shadow-[0_0_14px_rgba(168,85,247,0.65)]">
                PHANTOM TV GUIDE
              </h2>
              <p className="mt-1 text-[10px] tracking-[0.28em] text-cyan-300">
                LIVE CARRIER INDEX // NULL-01
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

          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {channels.map((channel, index) => {
              const shows = getChannelShows(channel.id);
              const active = currentChannel === index;

              return (
                <div
                  key={channel.number}
                  onClick={() => {
                    setCurrentChannel(index);
                    setGuideOpen(false);
                  }}
                  className={[
                    "cursor-pointer border px-4 py-3 transition-all",
                    channel.offline
                      ? "border-red-900/70 bg-red-950/10 hover:bg-red-950/20"
                      : active
                        ? "border-cyan-300 bg-cyan-950/10 shadow-[0_0_22px_rgba(34,211,238,0.18)]"
                        : "border-purple-900/80 bg-black/55 hover:border-purple-400 hover:bg-purple-950/20",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex w-[72px] flex-shrink-0 justify-center">
                      <div className="flex h-12 w-[72px] items-center justify-center border border-purple-900/70 bg-black/70 px-2">
                        <Image
                          src={channel.logo}
                          alt={channel.name}
                          width={60}
                          height={34}
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="w-[150px] flex-shrink-0">
                      <div className="text-xs tracking-[0.22em] text-cyan-300">
                        CH {channel.number}
                      </div>

                      <div className="text-base leading-tight text-white">
                        {channel.name}
                      </div>

                      {channel.offline ? (
                        <div className="mt-1 animate-pulse text-[10px] tracking-[0.25em] text-red-400">
                          SIGNAL LOST
                        </div>
                      ) : channel.manual ? (
                        <div className="mt-1 text-[10px] tracking-[0.25em] text-cyan-300">
                          MANUAL FEED
                        </div>
                      ) : active ? (
                        <div className="mt-1 text-[10px] tracking-[0.25em] text-green-300">
                          ACTIVE FEED
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] tracking-[0.25em] text-purple-400">
                          AVAILABLE
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 gap-2">
                      {channel.offline ? (
                        <div className="flex items-center text-xs tracking-[0.2em] text-red-400">
                          NO ACTIVE BROADCAST
                        </div>
                      ) : channel.manual ? (
                        <div className="flex min-w-0 flex-1 overflow-hidden border border-cyan-400/70 bg-cyan-950/10 px-3 py-2 shadow-[0_0_14px_rgba(34,211,238,0.10)]">
                          <div>
                            <div className="mb-1 text-[10px] tracking-[0.2em] text-cyan-300">
                              LIVE OVERRIDE
                            </div>

                            <div className="truncate text-sm leading-tight text-white">
                              Operator Signal
                            </div>

                            <div className="mt-2 text-[10px] tracking-[0.2em] text-purple-300">
                              AWAITING MANUAL TRANSMISSION
                            </div>
                          </div>
                        </div>
                      ) : shows.length === 0 ? (
                        <div className="flex items-center text-xs tracking-[0.2em] text-purple-400">
                          GUIDE DATA SYNCING
                        </div>
                      ) : (
                        shows.map((show, idx) => (
                          <div
                            key={idx}
                            className={[
                              "min-w-0 flex-1 overflow-hidden border px-3 py-2",
                              idx === 0
                                ? "border-green-400/80 bg-green-950/20 shadow-[0_0_14px_rgba(74,222,128,0.10)]"
                                : "border-purple-900/80 bg-black/70",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "mb-1 text-[10px] tracking-[0.2em]",
                                idx === 0 ? "text-green-300" : "text-purple-300",
                              ].join(" ")}
                            >
                              {idx === 0 ? "LIVE" : "NEXT"}
                            </div>

                            <div className="truncate text-sm leading-tight text-white">
                              {show.title}
                            </div>

                            <div className="mt-2 text-[10px] text-cyan-300">
                              {parseGuideTime(show.start).toLocaleTimeString(
                                [],
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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