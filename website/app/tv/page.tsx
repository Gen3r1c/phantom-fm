"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { XMLParser } from "fast-xml-parser";

const channels = [
  {
    id: "00.ersatztv.org",
    number: "00",
    name: "Null",
    logo: "/null.png",
    stream:
      "https://tv.phantomfm.xyz/iptv/channel/00.m3u8",
    offline: true,
  },

  {
    id: "02.146.ersatztv.org",
    number: "02",
    name: "Adult Swim",
    logo: "/adultswim.png",
    stream:
      "https://tv.phantomfm.xyz/iptv/channel/02.m3u8",
  },

  {
    id: "03.147.ersatztv.org",
    number: "03",
    name: "How It's Made",
    logo: "/howitsmade.png",
    stream:
      "https://tv.phantomfm.xyz/iptv/channel/03.m3u8",
  },

  {
    id: "04.148.ersatztv.org",
    number: "04",
    name: "Force TV",
    logo: "/forcetv.png",
    stream:
      "https://tv.phantomfm.xyz/iptv/channel/04.m3u8",
  },
];

type GuideShow = {
  channel: string;
  title: string;
  subtitle?: string;
  start: string;
};

export default function TVPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [guideOpen, setGuideOpen] =
    useState(false);

  const [currentChannel, setCurrentChannel] =
    useState(0);

  const [guide, setGuide] = useState<
    GuideShow[]
  >([]);

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

        let programmes =
          parsed?.tv?.programme || [];

        if (!Array.isArray(programmes)) {
          programmes = [programmes];
        }

        const normalized: GuideShow[] =
          programmes
            .map((prog: any) => {
              const title =
                typeof prog.title ===
                "string"
                  ? prog.title
                  : prog.title?.["#text"];

              const subtitle =
                typeof prog["sub-title"] ===
                "string"
                  ? prog["sub-title"]
                  : prog["sub-title"]?.[
                      "#text"
                    ];

              return {
                channel:
                  prog.channel ||
                  prog["@_channel"] ||
                  "",

                title:
                  title || "Unknown Show",

                subtitle:
                  subtitle || "",

                start:
                  prog.start ||
                  prog["@_start"] ||
                  "",
              };
            })
            .filter(
              (show: GuideShow) =>
                show.channel
            );

        setGuide(normalized);
      } catch (err) {
        console.error(
          "GUIDE ERROR:",
          err
        );
      }
    };

    loadGuide();
  }, []);

  // VIDEO PLAYER
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const current =
      channels[currentChannel];

    if (current.offline) {
      video.pause();
      video.removeAttribute("src");
      return;
    }

    const stream = current.stream;

    if (Hls.isSupported()) {
      const hls = new Hls();

      hls.loadSource(stream);

      hls.attachMedia(video);

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          video.play();
        }
      );

      return () => {
        hls.destroy();
      };
    } else {
      video.src = stream;
    }
  }, [currentChannel]);

  // XMLTV TIME PARSER
  const parseGuideTime = (
    timeString: string
  ) => {
    const [datetime, offset] =
      timeString.split(" ");

    const iso =
      `${datetime.slice(0, 4)}-${datetime.slice(
        4,
        6
      )}-${datetime.slice(
        6,
        8
      )}T${datetime.slice(
        8,
        10
      )}:${datetime.slice(
        10,
        12
      )}:${datetime.slice(
        12,
        14
      )}${
        offset
          ? offset.slice(0, 3) +
            ":" +
            offset.slice(3)
          : "Z"
      }`;

    return new Date(iso);
  };

  // GUIDE DATA
  const getChannelShows = (
    channelId: string
  ) => {
    const now = new Date();

    const channelShows = guide
      .filter((show) =>
        show.channel
          ?.toLowerCase()
          .includes(
            channelId.toLowerCase()
          )
      )
      .sort(
        (a, b) =>
          parseGuideTime(
            a.start
          ).getTime() -
          parseGuideTime(
            b.start
          ).getTime()
      );

    const currentIndex =
      channelShows.findIndex(
        (show, index) => {
          const start =
            parseGuideTime(
              show.start
            );

          const next =
            channelShows[index + 1];

          const end = next
            ? parseGuideTime(
                next.start
              )
            : new Date(
                start.getTime() +
                  30 * 60000
              );

          return (
            now >= start &&
            now < end
          );
        }
      );

    if (currentIndex === -1) {
      return channelShows.slice(0, 4);
    }

    return channelShows.slice(
      currentIndex,
      currentIndex + 4
    );
  };

  return (
    <main className="min-h-screen bg-black text-pink-500 relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.06),transparent_70%)]" />

      {/* GUIDE BUTTON */}
      <button
        onClick={() => setGuideOpen(true)}
        className="absolute top-5 left-5 z-50 hover:scale-110 transition-all"
      >
        <Image
          src="/burger.png"
          alt="Guide"
          width={48}
          height={48}
        />
      </button>

      {/* GUIDE PANEL */}
      <div
        className={`fixed top-0 left-0 h-full w-[58vw] bg-black/95 border-r border-pink-900 z-50 transition-transform duration-300 ${
          guideOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="p-5 h-full flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-5">

            <h2 className="text-red-500 text-base tracking-[0.35em]">
              PHANTOM FM GUIDE
            </h2>

            <button
              onClick={() =>
                setGuideOpen(false)
              }
              className="text-2xl text-pink-500 hover:text-red-500 transition-all"
            >
              ×
            </button>

          </div>

          {/* CHANNELS */}
          <div className="flex flex-col gap-3 overflow-hidden">

            {channels.map(
              (channel, index) => {
                const shows =
                  getChannelShows(
                    channel.id
                  );

                return (
                  <div
                    key={channel.number}
                    onClick={() => {
                      setCurrentChannel(
                        index
                      );

                      setGuideOpen(false);
                    }}
                    className={`border px-4 py-3 cursor-pointer transition-all hover:bg-pink-900/10 ${
                      channel.offline
                        ? "border-red-900 bg-red-950/10"
                        : currentChannel ===
                          index
                        ? "border-pink-500"
                        : "border-pink-900"
                    }`}
                  >

                    <div className="flex items-center gap-4">

                      {/* LOGO */}
                      <div className="w-[72px] flex justify-center flex-shrink-0">
                        <Image
                          src={channel.logo}
                          alt={channel.name}
                          width={60}
                          height={34}
                          className="object-contain"
                        />
                      </div>

                      {/* CHANNEL INFO */}
                      <div className="w-[140px] flex-shrink-0">

                        <div className="text-pink-500 text-xs tracking-[0.2em]">
                          CH {channel.number}
                        </div>

                        <div className="text-white text-base leading-tight">
                          {channel.name}
                        </div>

                        {channel.offline && (
                          <div className="text-red-500 text-[10px] tracking-[0.25em] mt-1 animate-pulse">
                            SIGNAL LOST
                          </div>
                        )}

                      </div>

                      {/* GUIDE ROW */}
                      <div className="flex gap-2 flex-1 min-w-0">

                        {channel.offline ? (
                          <div className="flex items-center text-red-500 text-xs tracking-[0.2em]">
                            NO ACTIVE BROADCAST
                          </div>
                        ) : (
                          shows.map(
                            (
                              show,
                              idx
                            ) => (
                              <div
                                key={idx}
                                className={`flex-1 min-w-0 border px-3 py-2 overflow-hidden ${
                                  idx === 0
                                    ? "border-green-500 bg-green-950/20"
                                    : "border-pink-900 bg-black/70"
                                }`}
                              >

                                <div
                                  className={`text-[10px] tracking-[0.2em] mb-1 ${
                                    idx === 0
                                      ? "text-green-400"
                                      : "text-pink-500"
                                  }`}
                                >
                                  {idx === 0
                                    ? "LIVE"
                                    : "NEXT"}
                                </div>

                                <div className="text-white text-sm leading-tight truncate">
                                  {
                                    show.title
                                  }
                                </div>

                                <div className="text-pink-500 text-[10px] mt-2">
                                  {parseGuideTime(
                                    show.start
                                  ).toLocaleTimeString(
                                    [],
                                    {
                                      hour:
                                        "numeric",
                                      minute:
                                        "2-digit",
                                    }
                                  )}
                                </div>

                              </div>
                            )
                          )
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="flex items-center justify-center min-h-screen px-8">

        <div className="w-full max-w-[1600px] relative z-10">

          {/* TOP BAR */}
          <div className="flex justify-between items-center mb-5">

            <h1 className="text-5xl tracking-[0.35em] text-red-500">
              {
                channels[currentChannel]
                  .name
              }
            </h1>

            <div className="text-red-500 text-sm tracking-[0.3em] animate-pulse">
              ● LIVE
            </div>

          </div>

          {/* VIDEO */}
          <div className="relative border border-pink-900 bg-black overflow-hidden shadow-[0_0_40px_rgba(255,0,120,0.16)]">

            {channels[currentChannel]
              .offline ? (
              <div className="w-full h-[78vh] flex flex-col items-center justify-center bg-black text-red-500">

                <div className="text-6xl tracking-[0.4em] mb-5 animate-pulse">
                  SIGNAL LOST
                </div>

                <div className="text-xs tracking-[0.3em] text-pink-500">
                  NULL CHANNEL OFFLINE
                </div>

              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                controls
                controlsList="nodownload"
                className="w-full h-[78vh] bg-black object-contain relative z-10"
              />
            )}

          </div>

          {/* FOOTER */}
          <div className="flex justify-between mt-4 text-xs tracking-[0.2em] text-pink-500">

            <span>
              CHANNEL{" "}
              {
                channels[currentChannel]
                  .number
              }
            </span>

            <span>
              PHANTOMFM.XYZ
            </span>

            <span>
              {channels[currentChannel]
                .offline
                ? "NO SIGNAL"
                : "SIGNAL STABLE"}
            </span>

          </div>

        </div>

      </div>

    </main>
  );
}