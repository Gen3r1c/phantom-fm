"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { XMLParser } from "fast-xml-parser";
import Hls from "hls.js";

const channels = [
  {
    number: "02",
    name: "Adult Swim",
    logo: "/adultswim.png",
    stream: "http://localhost:8409/iptv/channel/02.m3u8",
  },

  {
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

  const [currentShows, setCurrentShows] = useState<
    Record<string, string>
  >({});

  // Load XMLTV
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

        const guideMap: Record<string, string> = {};

        programmes.forEach((prog: any) => {
          const channel = prog["@_channel"];

          const title =
            typeof prog.title === "string"
              ? prog.title
              : prog.title["#text"];

          guideMap[channel] = title;
        });

        setCurrentShows(guideMap);
      } catch (err) {
        console.error(err);
      }
    };

    loadGuide();
  }, []);

  // HLS Stream Loader
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

      video.addEventListener("loadedmetadata", () => {
        video.play();
      });
    }
  }, [currentChannel]);

  return (
    <main className="min-h-screen bg-black overflow-hidden relative text-pink-500">

      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* Burger */}
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

      {/* Slideout Guide */}
      <div
        className={`fixed top-0 left-0 h-full w-[340px] bg-black/95 border-r border-pink-900 z-50 transition-transform duration-300 ${
          guideOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="p-6">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">

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

          {/* Channels */}
          <div className="flex flex-col gap-4">

            {channels.map((channel, index) => (
              <button
                key={channel.number}
                onClick={() => {
                  setCurrentChannel(index);
                  setGuideOpen(false);
                }}
                className={`border p-4 text-left transition-all ${
                  currentChannel === index
                    ? "border-pink-500 bg-pink-900/20"
                    : "border-pink-900 hover:bg-pink-900/10"
                }`}
              >

                <div className="flex items-center gap-4">

                  <Image
                    src={channel.logo}
                    alt={channel.name}
                    width={70}
                    height={40}
                    className="object-contain"
                  />

                  <div>

                    <div className="text-pink-400 tracking-[0.2em]">
                      CH {channel.number}
                    </div>

                    <div className="text-white text-lg">
                      {channel.name}
                    </div>

                    <div className="text-xs text-green-500 mt-1">
                      ● LIVE
                    </div>

                  </div>

                </div>

              </button>
            ))}

          </div>

        </div>

      </div>

      {/* Main TV */}
      <div className="flex items-center justify-center min-h-screen px-12">

        <div className="w-full max-w-[1600px]">

          {/* Top Info */}
          <div className="flex justify-between items-center mb-6">

            <div>

              <h1 className="text-5xl tracking-[0.4em] text-red-500">
                {channels[currentChannel].name}
              </h1>

              <p className="mt-2 text-pink-400 tracking-[0.2em]">
                {currentShows[
                  channels[currentChannel].number
                ] || "LIVE TRANSMISSION"}
              </p>

            </div>

            <div className="text-red-500 tracking-[0.3em] animate-pulse">
              ● LIVE
            </div>

          </div>

          {/* Video Player */}
          <div className="relative border border-pink-900 bg-black overflow-hidden shadow-[0_0_40px_rgba(255,0,120,0.18)] flex items-center justify-center">

            <video
              ref={videoRef}
              autoPlay
              controls
              className="w-full max-h-[78vh] bg-black object-contain"
            />

          </div>

          {/* Bottom Telemetry */}
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