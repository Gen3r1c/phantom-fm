"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { XMLParser } from "fast-xml-parser";

const channels = [
  {
    id: "02.146.ersatztv.org",
    number: "02",
    name: "Adult Swim",
    logo: "/adultswim.png",
    stream:
      "https://tv.phantomfm.xyz/iptv/channel/02.m3u8",
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

    const stream =
      channels[currentChannel].stream;

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

  // FIXED UTC XMLTV PARSER
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

  // CHANNEL GUIDE
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
      return channelShows.slice(0, 3);
    }

    return channelShows.slice(
      currentIndex,
      currentIndex + 3
    );
  };

  return (
    <main className="min-h-screen bg-black text-pink-500 relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* GUIDE BUTTON */}
      <button
        onClick={() => setGuideOpen(true)}
        className="absolute top-6 left-6 z-50 hover:scale-110 transition-all"
      >
        <Image
          src="/burger.png"
          alt="Guide"
          width={52}
          height={52}
        />
      </button>

      {/* GUIDE PANEL */}
      <div
        className={`fixed top-0 left-0 h-full w-[420px] bg-black/95 border-r border-pink-900 z-50 transition-transform duration-300 ${
          guideOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="p-6 overflow-y-auto h-full">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">

            <h2 className="text-red-500 text-xl tracking-[0.3em]">
              CHANNEL GUIDE
            </h2>

            <button
              onClick={() =>
                setGuideOpen(false)
              }
              className="text-3xl text-pink-500"
            >
              ×
            </button>

          </div>

          {/* CHANNELS */}
          <div className="flex flex-col gap-6">

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
                    className={`border p-5 cursor-pointer transition-all hover:bg-pink-900/10 ${
                      currentChannel ===
                      index
                        ? "border-pink-500"
                        : "border-pink-900"
                    }`}
                  >

                    {/* CHANNEL HEADER */}
                    <div className="flex gap-4 items-center">

                      <Image
                        src={channel.logo}
                        alt={channel.name}
                        width={64}
                        height={40}
                        className="object-contain"
                      />

                      <div>

                        <div className="text-pink-400 text-sm tracking-[0.2em]">
                          CH {channel.number}
                        </div>

                        <div className="text-white text-2xl">
                          {channel.name}
                        </div>

                      </div>

                    </div>

                    {/* SHOWS */}
                    <div className="mt-6 border-t border-pink-900 pt-4">

                      {shows.length > 0 ? (
                        <div className="flex flex-col gap-5">

                          {shows.map(
                            (
                              show,
                              idx
                            ) => (
                              <div
                                key={idx}
                              >

                                <div
                                  className={`text-xs tracking-[0.2em] mb-2 ${
                                    idx === 0
                                      ? "text-green-400"
                                      : "text-pink-400"
                                  }`}
                                >
                                  {idx === 0
                                    ? "● NOW PLAYING"
                                    : idx ===
                                      1
                                    ? "NEXT UP"
                                    : "LATER"}
                                </div>

                                <div className="text-white text-lg">
                                  {
                                    show.title
                                  }
                                </div>

                                {show.subtitle && (
                                  <div className="text-pink-500 text-sm mt-1">
                                    {
                                      show.subtitle
                                    }
                                  </div>
                                )}

                                <div className="text-pink-500 text-xs mt-2">
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
                          )}

                        </div>
                      ) : (
                        <div className="text-white">
                          No guide data
                        </div>
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="flex items-center justify-center min-h-screen px-10">

        <div className="w-full max-w-[1600px] relative z-10">

          {/* TOP BAR */}
          <div className="flex justify-between items-center mb-6">

            <h1 className="text-5xl tracking-[0.4em] text-red-500">
              {
                channels[currentChannel]
                  .name
              }
            </h1>

            <div className="text-red-500 tracking-[0.3em] animate-pulse">
              ● LIVE
            </div>

          </div>

          {/* VIDEO */}
          <div className="relative border border-pink-900 bg-black overflow-hidden shadow-[0_0_40px_rgba(255,0,120,0.18)]">

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              controls
              controlsList="nodownload"
              className="w-full h-[78vh] bg-black object-contain relative z-10"
            />

          </div>

          {/* FOOTER */}
          <div className="flex justify-between mt-4 text-sm tracking-[0.2em] text-pink-500">

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
              SIGNAL STABLE
            </span>

          </div>

        </div>

      </div>

    </main>
  );
}