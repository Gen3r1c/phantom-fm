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

  const [guideOpen, setGuideOpen] = useState(false);

  const [currentChannel, setCurrentChannel] = useState(0);

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

  // LOAD XMLTV
  useEffect(() => {
    const loadGuide = async () => {
      try {
        const res = await fetch(
          "http://localhost:8409/iptv/xmltv.xml"
        );

        const xml = await res.text();

        const parser = new XMLParser({
          ignoreAttributes: false,
        });

        const data = parser.parse(xml);

        const programmes = data.tv.programme;

        const scheduleMap: Record<
          string,
          {
            title: string;
            start: Date;
            stop: Date;
          }[]
        > = {};

        programmes.forEach((prog: any) => {
          const channel = prog["@_channel"];

          const start = prog["@_start"];
          const stop = prog["@_stop"];

          const cleanStart = start.split(" ")[0];
          const cleanStop = stop.split(" ")[0];

          const startDate = new Date(
            `${cleanStart.slice(0, 4)}-${cleanStart.slice(4, 6)}-${cleanStart.slice(6, 8)}T${cleanStart.slice(8, 10)}:${cleanStart.slice(10, 12)}:${cleanStart.slice(12, 14)}`
          );

          const stopDate = new Date(
            `${cleanStop.slice(0, 4)}-${cleanStop.slice(4, 6)}-${cleanStop.slice(6, 8)}T${cleanStop.slice(8, 10)}:${cleanStop.slice(10, 12)}:${cleanStop.slice(12, 14)}`
          );

          const title =
            typeof prog.title === "string"
              ? prog.title
              : prog.title["#text"];

          if (!scheduleMap[channel]) {
            scheduleMap[channel] = [];
          }

          scheduleMap[channel].push({
            title,
            start: startDate,
            stop: stopDate,
          });
        });

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

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });

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

  const now = new Date();

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
        className={`fixed top-0 left-0 h-full w-[620px] bg-black/95 border-r border-pink-900 z-50 transition-transform duration-300 overflow-hidden ${
          guideOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="p-6 h-full flex flex-col">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">

            <h2 className="text-red-500 text-xl tracking-[0.3em]">
              CHANNEL GUIDE
            </h2>

            <button
              onClick={() => setGuideOpen(false)}
              className="text-3xl hover:text-red-500"
            >
              ×
            </button>

          </div>

          {/* TIME BAR */}
          <div className="flex gap-6 text-xs text-pink-500 mb-6 overflow-x-auto whitespace-nowrap pb-2 border-b border-pink-900">

            {Array.from({ length: 12 }).map(
              (_, i) => {
                const hour =
                  (now.getHours() + i) % 24;

                return (
                  <div
                    key={i}
                    className="min-w-[180px]"
                  >
                    {hour}:00
                  </div>
                );
              }
            )}

          </div>

          {/* CHANNELS */}
          <div className="flex flex-col gap-6 overflow-y-auto pr-2">

            {channels.map((channel, index) => (
              <div
                key={channel.number}
                className={`border ${
                  currentChannel === index
                    ? "border-pink-500"
                    : "border-pink-900"
                } bg-black/60 p-4`}
              >

                {/* CHANNEL HEADER */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => {
                    setCurrentChannel(index);
                    setGuideOpen(false);
                  }}
                >

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

                    <div className="text-white text-lg">
                      {channel.name}
                    </div>

                  </div>

                </div>

                {/* SCHEDULE ROW */}
                <div className="mt-4 overflow-x-auto overflow-y-hidden">

                  <div className="flex flex-row gap-2 min-w-max items-stretch pb-2">

                    {(guideData[channel.id] || [])
                      .slice(0, 12)
                      .map((show, idx) => {
                        const duration =
                          (show.stop.getTime() -
                            show.start.getTime()) /
                          60000;

                        const isLive =
                          now >= show.start &&
                          now <= show.stop;

                        return (
                          <div
                            key={idx}
                            className={`h-[110px] p-3 border text-xs flex-shrink-0 transition-all overflow-hidden ${
                              isLive
                                ? "border-red-500 bg-red-900/30 shadow-[0_0_18px_rgba(255,0,80,0.35)]"
                                : "border-pink-900 bg-pink-900/10"
                            }`}
                            style={{
                              width: `${Math.max(
                                duration * 2,
                                160
                              )}px`,
                            }}
                          >

                            <div className="text-white font-semibold line-clamp-2">
                              {show.title}
                            </div>

                            <div className="text-pink-500 mt-3 text-[10px]">
                              {show.start.toLocaleTimeString(
                                [],
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </div>

                            {isLive && (
                              <div className="text-green-400 mt-3">
                                ● LIVE
                              </div>
                            )}

                          </div>
                        );
                      })}

                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

      {/* MAIN TV */}
      <div className="flex items-center justify-center min-h-screen px-12">

        <div className="w-full max-w-[1600px]">

          {/* TOP BAR */}
          <div className="flex justify-between items-center mb-6">

            <h1 className="text-5xl tracking-[0.4em] text-red-500">
              {channels[currentChannel].name}
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
              CHANNEL {channels[currentChannel].number}
            </span>

            <span>PHANTOMFM.XYZ</span>

            <span>SIGNAL STABLE</span>

          </div>

        </div>

      </div>

    </main>
  );
}