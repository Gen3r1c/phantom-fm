"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type DesktopApp = {
  name: string;
  label: string;
  status: "ONLINE" | "STANDBY" | "LOCKED";
  href?: string;
  external?: boolean;
  description: string;
};

const apps: DesktopApp[] = [
  {
    name: "TV.exe",
    label: "PHANTOM TV",
    status: "ONLINE",
    href: "/tv",
    external: true,
    description: "Live visual transmission feed.",
  },
  {
    name: "CHAT.exe",
    label: "IRC LOUNGE",
    status: "ONLINE",
    href: "https://irc.phantomfm.xyz/",
    external: true,
    description: "Enter the relay. Autojoins #main.",
  },
  {
    name: "VAULT",
    label: "THE VAULT",
    status: "ONLINE",
    href: "/vault",
    external: true,
    description: "Archived signals and locked files.",
  },
  {
    name: "RADIO.exe",
    label: "PHANTOM RADIO",
    status: "ONLINE",
    href: "/radio",
    external: true,
    description: "Night Signal live radio stream with reactive PHANTOM visualizer.",
  },
];

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<DesktopApp>(apps[0]);

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030008] text-purple-100">
      <audio ref={audioRef} loop>
        <source src="/ambient.mp3" type="audio/mpeg" />
      </audio>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,51,234,0.22),transparent_32%),radial-gradient(circle_at_75%_70%,rgba(34,211,238,0.10),transparent_30%),linear-gradient(180deg,#080012,#030008)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.95)]" />

      <section className="relative z-10 flex min-h-screen flex-col p-5">
        <header className="flex items-center justify-between border border-purple-900/80 bg-black/65 px-5 py-3 shadow-[0_0_35px_rgba(147,51,234,0.22)]">
          <div>
            <h1 className="text-2xl font-black tracking-[0.35em] text-white drop-shadow-[0_0_16px_rgba(168,85,247,0.9)] md:text-4xl">
              PHANTOM OS
            </h1>
            <p className="mt-1 text-xs tracking-[0.35em] text-cyan-300 md:text-sm">
              NULL-01 ONLINE // THE SIGNAL NEVER DIES
            </p>
          </div>

          <div className="hidden text-right text-xs tracking-[0.22em] text-purple-300 md:block">
            <p className="text-green-300">● RELAY ACTIVE</p>
            <p className="mt-1 text-pink-400">PHANTOMFM.XYZ</p>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-5 py-5 lg:grid-cols-[280px_1fr_340px]">
          <aside className="border border-purple-900/80 bg-black/55 p-4 shadow-[0_0_28px_rgba(147,51,234,0.16)]">
            <p className="mb-5 text-xs tracking-[0.3em] text-pink-400">
              DESKTOP
            </p>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              {apps.map((app) => {
                const content = (
                  <div
                    onMouseEnter={() => setSelected(app)}
                    className={[
                      "group cursor-pointer border bg-[#090111]/90 p-4 transition-all",
                      selected.name === app.name
                        ? "border-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.22)]"
                        : "border-purple-900/80 hover:border-purple-400 hover:bg-purple-950/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center border border-purple-500/70 bg-black text-lg font-black text-white shadow-[0_0_14px_rgba(168,85,247,0.25)]">
                        {app.label.charAt(0)}
                      </div>

                      <span
                        className={[
                          "text-[10px] tracking-[0.2em]",
                          app.status === "ONLINE"
                            ? "text-green-300"
                            : app.status === "LOCKED"
                              ? "text-red-400"
                              : "text-yellow-300",
                        ].join(" ")}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-bold tracking-[0.18em] text-purple-100 group-hover:text-white">
                      {app.name}
                    </p>
                    <p className="mt-1 text-[11px] tracking-[0.12em] text-purple-400">
                      {app.label}
                    </p>
                  </div>
                );

                if (!app.href) {
                  return <div key={app.name}>{content}</div>;
                }

                return (
                  <a
                    key={app.name}
                    href={app.href}
                    target={app.external ? "_blank" : undefined}
                    rel={app.external ? "noopener noreferrer" : undefined}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </aside>

          <section className="relative overflow-hidden border border-purple-900/80 bg-black/65 shadow-[0_0_45px_rgba(147,51,234,0.22)]">
            <div className="flex items-center justify-between border-b border-purple-900/80 bg-[#0b0315] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
              </div>

              <p className="text-xs tracking-[0.28em] text-purple-300">
                /SYSTEM/PHANTOMFM
              </p>
            </div>

            <div className="grid min-h-[580px] place-items-center p-8">
              <div className="relative w-full max-w-3xl">
                <div className="absolute inset-0 blur-3xl bg-purple-700/20" />

                <div className="relative border border-pink-900/70 bg-black/50 p-8 shadow-[0_0_45px_rgba(255,0,120,0.16)]">
                  <div className="mx-auto max-w-2xl text-left">
                    <div className="flex items-center gap-4 border border-cyan-400/40 bg-black/70 p-4 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
                      <Image
                        src="/icon.png"
                        alt="PHANTOM FM"
                        width={72}
                        height={72}
                        className="h-16 w-16 border border-purple-500/50 bg-black object-cover shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                        priority
                      />

                      <div>
                        <p className="text-xs tracking-[0.3em] text-cyan-300">
                          PHANTOM OS // NULL-01
                        </p>
                        <h2 className="mt-1 text-3xl font-black tracking-[0.22em] text-white drop-shadow-[0_0_16px_rgba(168,85,247,0.65)] md:text-5xl">
                          PHANTOM FM
                        </h2>
                        <p className="mt-2 text-xs tracking-[0.22em] text-pink-400">
                          THE SIGNAL NEVER DIES
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border border-purple-900/80 bg-[#05010b]/90 p-5 font-mono text-sm text-green-300 shadow-[0_0_30px_rgba(147,51,234,0.14)]">
                      <p>&gt; booting phantom interface...</p>
                      <p>&gt; tv feed mounted</p>
                      <p>&gt; irc relay online</p>
                      <p>&gt; vault node available</p>
                      <p>&gt; radio core broadcasting</p>
                      <p className="mt-3 animate-pulse text-cyan-300">
                        &gt; select a program from desktop
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border border-purple-900/80 bg-[#07010f]/80 p-5 text-left">
                    <p className="text-xs tracking-[0.3em] text-cyan-300">
                      SELECTED PROGRAM
                    </p>

                    <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h2 className="text-4xl font-black tracking-[0.18em] text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.25)]">
                          {selected.label}
                        </h2>
                        <p className="mt-2 text-sm tracking-[0.18em] text-purple-300">
                          {selected.description}
                        </p>
                      </div>

                      <p
                        className={[
                          "text-sm tracking-[0.25em]",
                          selected.status === "ONLINE"
                            ? "text-green-300"
                            : selected.status === "LOCKED"
                              ? "text-red-400"
                              : "text-yellow-300",
                        ].join(" ")}
                      >
                        ● {selected.status}
                      </p>
                    </div>

                    {selected.href ? (
                      <a
                        href={selected.href}
                        target={selected.external ? "_blank" : undefined}
                        rel={selected.external ? "noopener noreferrer" : undefined}
                        className="mt-6 inline-block border border-cyan-400/70 px-5 py-3 text-sm font-bold tracking-[0.22em] text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)] transition-all hover:bg-cyan-400/10 hover:text-white"
                      >
                        OPEN {selected.name}
                      </a>
                    ) : (
                      <div className="mt-6 inline-block border border-yellow-400/50 px-5 py-3 text-sm font-bold tracking-[0.22em] text-yellow-300">
                        MODULE STANDBY
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="border border-purple-900/80 bg-black/55 p-5 shadow-[0_0_28px_rgba(147,51,234,0.16)]">
            <p className="text-xs tracking-[0.3em] text-pink-400">
              NETWORK STATUS
            </p>

            <div className="mt-7 space-y-5">
              <StatusRow name="TV STREAM" status="ONLINE" />
              <StatusRow name="IRC RELAY" status="ONLINE" />
              <StatusRow name="VAULT NODE" status="ONLINE" />
              <StatusRow name="RADIO CORE" status="ONLINE" />
            </div>

            <div className="mt-8 border border-purple-900/80 bg-[#07010f]/80 p-5">
              <p className="text-xs tracking-[0.25em] text-cyan-300">
                TERMINAL
              </p>

              <div className="mt-5 space-y-2 font-mono text-sm text-green-300">
                <p>&gt; boot phantom-os</p>
                <p>&gt; relay handshake: ok</p>
                <p>&gt; tv carrier: online</p>
                <p>&gt; radio stream: live</p>
                <p>&gt; vault index: mounted</p>
                <p className="animate-pulse">&gt; awaiting input...</p>
              </div>
            </div>

            <div className="mt-8 border border-pink-900/70 p-5 text-center">
              <p className="text-xs tracking-[0.28em] text-pink-400">
                SIGNAL STRENGTH
              </p>

              <div className="mt-5 flex justify-center gap-1">
                <div className="h-4 w-2 bg-pink-500" />
                <div className="h-7 w-2 bg-pink-500" />
                <div className="h-10 w-2 bg-pink-500" />
                <div className="h-6 w-2 bg-pink-500" />
                <div className="h-12 w-2 bg-cyan-300" />
              </div>

              <p className="mt-4 tracking-[0.2em] text-green-300">
                SYSTEMS NOMINAL
              </p>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-4 border border-purple-900/80 bg-black/75 px-5 py-4 text-xs tracking-[0.2em] text-purple-300 shadow-[0_0_35px_rgba(147,51,234,0.18)] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={toggleAudio}
              className="border border-pink-800 px-4 py-2 text-pink-300 transition-all hover:bg-pink-900/30 hover:text-white"
            >
              {playing
                ? "● AMBIENT LAYER : ONLINE"
                : "○ AMBIENT LAYER : OFFLINE"}
            </button>

            <div className="flex h-6 items-end gap-1">
              <div className="h-2 w-1 animate-pulse bg-pink-500" />
              <div className="h-4 w-1 animate-pulse bg-pink-500 delay-75" />
              <div className="h-6 w-1 animate-pulse bg-cyan-300 delay-150" />
              <div className="h-3 w-1 animate-pulse bg-pink-500 delay-300" />
              <div className="h-5 w-1 animate-pulse bg-purple-400 delay-500" />
            </div>

            <span className="text-green-300">● RADIO TRANSMISSION : LIVE</span>
            <span>PHANTOM FM</span>
          </div>

          <div className="flex flex-wrap gap-4">
            <span>LOCATION: UNKNOWN</span>
            <span className="text-cyan-300">NULL-01</span>
          </div>
        </footer>
      </section>
    </main>
  );
}

function StatusRow({
  name,
  status,
}: {
  name: string;
  status: "ONLINE" | "STANDBY" | "LOCKED";
}) {
  return (
    <div className="flex items-center justify-between border-b border-purple-900/60 pb-3">
      <span className="text-purple-300">{name}</span>
      <span
        className={[
          "text-xs tracking-[0.22em]",
          status === "ONLINE"
            ? "text-green-300"
            : status === "LOCKED"
              ? "text-red-400"
              : "text-yellow-300",
        ].join(" ")}
      >
        {status}
      </span>
    </div>
  );
}