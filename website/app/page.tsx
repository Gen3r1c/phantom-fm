"use client";

import { useRef, useState } from "react";

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080b] text-[#e8e7df] selection:bg-[#bdd3bd] selection:text-[#101411]">
      <audio ref={audioRef} loop preload="none">
        <source src="/ambient.mp3" type="audio/mpeg" />
      </audio>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_3%,rgba(125,143,133,0.13),transparent_34%),radial-gradient(ellipse_at_84%_46%,rgba(111,96,111,0.10),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:74px_74px] [mask-image:linear-gradient(to_bottom,black,transparent_76%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 py-5 sm:py-6">
          <a href="/" className="group inline-flex items-center gap-3" aria-label="PHANTOM FM home">
            <span className="grid h-10 w-10 place-items-center border border-[#bdd3bd]/30 bg-[#bdd3bd]/[0.06] text-[11px] font-semibold tracking-[0.12em] text-[#d7e1d6] transition group-hover:border-[#bdd3bd]/70">PF</span>
            <span>
              <span className="block text-[12px] font-semibold tracking-[0.24em] text-[#f2f1e9]">PHANTOM FM</span>
              <span className="mt-1 block text-[9px] tracking-[0.2em] text-white/40">INDEPENDENT AFTER DARK</span>
            </span>
          </a>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[10px] tracking-[0.16em] text-white/55 sm:flex">
            <a className="transition hover:text-[#d7e1d6]" href="https://irc.phantomfm.xyz/" target="_blank" rel="noopener noreferrer">CHAT</a>
            <a className="transition hover:text-[#d7e1d6]" href="/radio">RADIO</a>
            <a className="transition hover:text-[#d7e1d6]" href="/vault">VAULT</a>
          </nav>

          <a href="https://irc.phantomfm.xyz/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 border border-white/10 bg-white/[0.025] px-3 py-2 text-[9px] tracking-[0.15em] text-white/65 transition hover:border-[#bdd3bd]/40 hover:text-white sm:px-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b8d0be] shadow-[0_0_12px_rgba(184,208,190,0.65)]" />
            RELAY OPEN
          </a>
        </header>

        <section className="grid flex-1 content-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,0.92fr)] lg:gap-16 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="flex items-center gap-3 text-[10px] tracking-[0.25em] text-[#a9bdb1]">
              <span className="h-px w-8 bg-[#a9bdb1]/60" />
              A SIGNAL FROM SOMEWHERE
            </p>

            <h1 className="mt-7 max-w-3xl text-[clamp(3.6rem,8vw,7.8rem)] font-medium leading-[0.88] tracking-[-0.075em] text-[#f1f0e9]">
              The night
              <br />
              has a <span className="font-serif italic font-normal text-[#b8c9bc]">place</span>
              <br />
              to go.
            </h1>

            <p className="mt-7 max-w-md text-sm leading-7 text-white/50 sm:text-[15px]">
              Independent radio, an open room, and a cabinet of things worth keeping. Stay a while.
            </p>

            <a href="https://irc.phantomfm.xyz/" target="_blank" rel="noopener noreferrer" className="group mt-9 flex w-full max-w-[470px] items-center justify-between border border-[#b8c9bc]/35 bg-[#b8c9bc]/[0.07] p-4 transition duration-300 hover:border-[#b8c9bc]/75 hover:bg-[#b8c9bc]/[0.11] sm:p-5">
              <span className="flex items-center gap-4">
                <span className="grid h-11 w-11 place-items-center border border-[#b8c9bc]/25 bg-[#b8c9bc]/[0.08] text-[#d5e0d7]" aria-hidden="true">
                  <ChatIcon />
                </span>
                <span>
                  <span className="block text-[9px] tracking-[0.19em] text-[#b8c9bc]">THE LOUNGE · #MAIN</span>
                  <span className="mt-1.5 block text-sm font-medium tracking-wide text-[#f0f0e9]">Come talk with us</span>
                </span>
              </span>
              <span className="pr-1 text-lg text-white/45 transition group-hover:translate-x-1 group-hover:text-white" aria-hidden="true">↗</span>
            </a>

            <div className="mt-5 flex items-center gap-2 text-[9px] tracking-[0.13em] text-white/35">
              <span className="h-1 w-1 rounded-full bg-[#c7b49d]" />
              OPENS IN A NEW WINDOW · NO ACCOUNT NEEDED
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 lg:pl-2">
            <a href="/radio" className="group relative isolate min-h-[330px] overflow-hidden border border-white/10 bg-[#0b0e11] p-6 transition duration-300 hover:border-[#b8c9bc]/35 sm:min-h-[370px] sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_51%_55%,rgba(170,190,177,0.12),transparent_54%),linear-gradient(145deg,transparent_30%,rgba(255,255,255,0.025)_100%)]" />
              <div className="pointer-events-none absolute -right-8 -top-12 h-64 w-64 rounded-full border border-white/[0.055] sm:h-80 sm:w-80" />
              <div className="pointer-events-none absolute -right-1 -top-5 h-52 w-52 rounded-full border border-white/[0.07] sm:h-64 sm:w-64" />
              <div className="pointer-events-none absolute right-8 top-9 h-36 w-36 rounded-full border border-[#c7b49d]/15 sm:right-14 sm:top-12 sm:h-44 sm:w-44" />
              <div className="pointer-events-none absolute right-[5.8rem] top-[6.4rem] h-3 w-3 rounded-full bg-[#d5c3a6] shadow-[0_0_22px_rgba(213,195,166,0.7)] sm:right-[7.2rem] sm:top-[7.7rem]" />
              <div className="pointer-events-none absolute bottom-[5.2rem] left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b8c9bc]/20 to-transparent" />
              <div className="pointer-events-none absolute bottom-[5.3rem] left-0 right-0 h-24 bg-[linear-gradient(180deg,rgba(137,165,148,0.07),transparent)]" />

              <div className="relative flex h-full min-h-[280px] flex-col justify-between sm:min-h-[310px]">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] tracking-[0.22em] text-[#a9bdb1]">PHANTOM RADIO</span>
                  <span className="inline-flex items-center gap-2 text-[9px] tracking-[0.14em] text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-[#b8c9bc]" /> ON AIR</span>
                </div>

                <div className="relative mt-24 flex h-12 items-center gap-[5px] opacity-70" aria-hidden="true">
                  {[12, 19, 9, 29, 17, 36, 23, 45, 30, 18, 39, 25, 47, 21, 34, 15, 42, 27, 11, 32, 18, 39, 23, 12, 31, 17, 43, 24, 11, 35, 19, 8].map((height, index) => (
                    <span key={index} className="w-[2px] rounded-full bg-[#b8c9bc]/80" style={{ height: `${height}px` }} />
                  ))}
                </div>

                <div className="relative mt-auto flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-medium tracking-[-0.04em] text-[#f0efe8] sm:text-3xl">Night Signal</h2>
                    <p className="mt-1.5 text-[10px] tracking-[0.14em] text-white/40">SIX VISUAL WORLDS · LIVE RADIO</p>
                  </div>
                  <span className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-[#c7d3c8] transition group-hover:border-[#c7d3c8]/60 group-hover:bg-[#c7d3c8]/10" aria-hidden="true"><ArrowIcon /></span>
                </div>
              </div>
            </a>

            <a href="/vault" className="group flex items-center justify-between border border-white/10 bg-[#0a0c0f]/85 p-5 transition duration-300 hover:border-[#c7b49d]/40 hover:bg-[#0d0f12] sm:px-6">
              <span className="flex items-center gap-4">
                <span className="grid h-10 w-10 place-items-center border border-white/10 bg-white/[0.025] text-[#c7b49d]" aria-hidden="true"><ArchiveIcon /></span>
                <span>
                  <span className="block text-[9px] tracking-[0.19em] text-[#c7b49d]">THE VAULT</span>
                  <span className="mt-1.5 block text-sm text-white/75">Lost files, recovered signals.</span>
                </span>
              </span>
              <span className="text-base text-white/35 transition group-hover:translate-x-1 group-hover:text-white/75" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/10 py-5 text-[9px] tracking-[0.14em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span>PHANTOM FM</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span>THE SIGNAL NEVER DIES</span>
          </div>

          <button type="button" onClick={toggleAudio} aria-pressed={playing} className="inline-flex w-fit items-center gap-2.5 text-left transition hover:text-[#d7e1d6]">
            <span className={playing ? "h-1.5 w-1.5 rounded-full bg-[#bdd3bd] shadow-[0_0_10px_rgba(189,211,189,0.65)]" : "h-1.5 w-1.5 rounded-full bg-white/25"} />
            {playing ? "AMBIENT SOUND ON" : "ENABLE AMBIENT SOUND"}
          </button>
        </footer>
      </div>
    </main>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6.5A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M10 4l6 6-6 6" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.5h16v13H4zM3 3.5h18v4H3zM9 11.5h6" />
    </svg>
  );
}
