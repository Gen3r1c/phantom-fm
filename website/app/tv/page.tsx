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

type GuideShow = {
  channel: string;
  title: string;
  subtitle?: string;
  start: string;
  stop: string;
};

export default function TVPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [guideOpen, setGuideOpen] = useState(false);

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
          "http://localhost:8409/iptv/xmltv.xml"
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

                stop:
                  prog.stop ||
                  prog["@_stop"] ||
                  "",
              };
            })
            .filter(
              (show: GuideShow) =>
                show.channel
            );

        console.log(
          "GUIDE LOADED:",
          normalized
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

  // GET SHOWS FOR CHANNEL
  const getChannelShows = (
    channelId: string
  ) => {
    return guide
      .filter(
        (show) =>
          show.channel === channelId
      )
      .slice(0, 3);
  };

  return (
    <main className="min-h-screen bg-black text-pink-500 relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* BURGER */}
      <button
        onClick={() => setGuideOpen(true)}
        className="absolute top-6 left-6 z-50"
      >
        <Image
          src="/burger.png"
          alt="Guide"
          width={52}
          height={52}
        />
      </button>

      {/* GUIDE */}
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
                    className={`border p-5 cursor-pointer transition-all ${
                      currentChannel ===
                      index
                        ? "border-pink-500"
                        : "border-pink-900"
                    }`}
                  >

                    {/* HEADER */}
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
                                  {
                                    show.start
                                  }
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

          {/* TOP */}
          <div className="flex justify-between items-center mb-6">

            <h1 className="text-5xl tracking-[0.4em] text-red-500">
              {
                channels[currentChannel]
                  .name
              }
            </h1>

            <div className="text-red-500 animate-pulse tracking-[0.3em]">
              ● LIVE
            </div>

          </div>

          {/* VIDEO */}
          <div className="border border-pink-900 bg-black overflow-hidden shadow-[0_0_40px_rgba(255,0,120,0.18)]">

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