"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { XMLParser } from "fast-xml-parser";
import Hls from "hls.js";

const channels = [
  {
    id: "02.146.ersatztv.org",
    number: "02",
    name: "Adult Swim",
    logo: "/adultswim.png",
    stream: "http://localhost:8409/iptv/channel/02.m3u8",
  },

  {
    id: "04.148.ersatztv.org",
    number: "04",
    name: "Force TV",
    logo: "/forcetv.png",
    stream: "http://localhost:8409/iptv/channel/04.m3u8",
  },
];

export default function TVPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [guideOpen, setGuideOpen] =
    useState(false);

  const [currentChannel, setCurrentChannel] =
    useState(0);

  const [guideData, setGuideData] = useState<
    Record<
      string,
      {
        title: string;
        start: Date;
        stop: Date;
      }[]
    >
  >({});

  // LOAD GUIDE
  useEffect(() => {
    const loadGuide = async () => {
      try {
        const res = await fetch(
          "http://localhost:8409/iptv/xmltv.xml"
        );

        const xml = await res.text();

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "",
        });

        const data = parser.parse(xml);

        const programmes = Array.isArray(
          data.tv.programme
        )
          ? data.tv.programme
          : [data.tv.programme];

        const scheduleMap: Record<
          string,
          {
            title: string;
            start: Date;
            stop: Date;
          }[]
        > = {};

        programmes.forEach((prog: any) => {
          const channel =
            prog.channel || prog["@_channel"];

          const start =
            prog.start || prog["@_start"];

          const stop =
            prog.stop || prog["@_stop"];

          if (!channel || !start || !stop)
            return;

          const cleanStart =
            start.split(" ")[0];

          const cleanStop =
            stop.split(" ")[0];

          const startDate = new Date(
            `${cleanStart.slice(
              0,
              4
            )}-${cleanStart.slice(
              4,
              6
            )}-${cleanStart.slice(
              6,
              8
            )}T${cleanStart.slice(
              8,
              10
            )}:${cleanStart.slice(
              10,
              12
            )}:${cleanStart.slice(12, 14)}`
          );

          const stopDate = new Date(
            `${cleanStop.slice(
              0,
              4
            )}-${cleanStop.slice(
              4,
              6
            )}-${cleanStop.slice(
              6,
              8
            )}T${cleanStop.slice(
              8,
              10
            )}:${cleanStop.slice(
              10,
              12
            )}:${cleanStop.slice(12, 14)}`
          );

          const title =
            typeof prog.title === "string"
              ? prog.title
              : prog.title?.["#text"] ||
                "Unknown Show";

          if (!scheduleMap[channel]) {
            scheduleMap[channel] = [];
          }

          scheduleMap[channel].push({
            title,
            start: startDate,
            stop: stopDate,
          });
        });

        console.log(
          "GUIDE DATA:",
          scheduleMap
        );

        setGuideData(scheduleMap);
      } catch (err) {
        console.error(err);
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
    } else if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = stream;

      video.addEventListener(
        "loadedmetadata",
        () => {
          video.play();
        }
      );
    }
  }, [currentChannel]);

  const getShows = (
    channelId: string
  ) => {
    const shows =
      guideData[channelId] || [];

    return shows.slice(0, 3);
  };

  return (
    <main className="min-h-screen bg-black overflow-hidden relative text-pink-500">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* BURGER */}
      <button
        onClick={() => setGuideOpen(true)}
        className="absolute top-6 left-6 z-50 hover:scale-110 transition-all"
      >
        <Image
          src="/burger.png"
          alt="Guide"
          width={52}
          height={52}
          className="drop-shadow-[0_0_12px_rgba(255,0,120,0.8)]"
        />
      </button>

      {/* GUIDE */}
      <div
        className={`fixed top-0 left-0 h-full w-[420px] bg-black/95 border-r border-pink-900 z-50 transition-transform duration-300 overflow-hidden ${
          guideOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">

            <h2 className="text-red-500 text-xl tracking-[0.3em]">
              CHANNEL GUIDE
            </h2>

            <button
              onClick={() =>
                setGuideOpen(false)
              }
              className="text-3xl hover:text-red-500"
            >
              ×
            </button>

          </div>

          {/* CHANNELS */}
          <div className="flex flex-col gap-6">

            {channels.map(
              (channel, index) => {
                const shows =
                  getShows(channel.id);

                return (
                  <div
                    key={channel.number}
                    onClick={() => {
                      setCurrentChannel(
                        index
                      );
                      setGuideOpen(false);
                    }}
                    className={`border cursor-pointer transition-all hover:bg-pink-900/10 ${
                      currentChannel ===
                      index
                        ? "border-pink-500"
                        : "border-pink-900"
                    } bg-black/60 p-5`}
                  >

                    {/* CHANNEL HEADER */}
                    <div className="flex items-center gap-4">

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

                        <div className="text-white text-xl">
                          {channel.name}
                        </div>

                      </div>

                    </div>

                    {/* SHOWS */}
                    <div className="mt-6 border-t border-pink-900 pt-4">

                      {shows.length > 0 ? (
                        <div className="flex flex-col gap-5">

                          {shows.map(
                            (show, idx) => (
                              <div key={idx}>

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

                                <div className="text-pink-500 text-xs mt-2">
                                  {show.start.toLocaleTimeString(
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

      {/* MAIN TV */}
      <div className="flex items-center justify-center min-h-screen px-12">

        <div className="w-full max-w-[1600px]">

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
          <div className="relative border border-pink-900 bg-black overflow-hidden shadow-[0_0_40px_rgba(255,0,120,0.18)] flex items-center justify-center">

            <video
              ref={videoRef}
              autoPlay
              controls
              className="w-full max-h-[78vh] bg-black object-contain"
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