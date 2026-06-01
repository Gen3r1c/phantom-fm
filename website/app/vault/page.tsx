import Link from "next/link";

export default function VaultPage() {
  return (
    <main className="min-h-screen bg-black px-8 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm tracking-[0.4em] text-cyan-300">PHANTOM FM</p>

        <h1 className="mt-4 text-5xl font-bold text-purple-300">
          THE VAULT
        </h1>

        <p className="mt-6 max-w-2xl text-zinc-300">
          Preserved fragments from the dead web. Recovered signals, strange
          archives, and internet folklore that almost vanished.
        </p>

        <div className="mt-10 rounded-2xl border border-purple-500/40 bg-purple-950/20 p-6">
          <p className="text-xs tracking-[0.35em] text-cyan-300">
            RECOVERED SIGNAL
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-purple-200">
            Entry 001: The Holders Archive
          </h2>

          <p className="mt-4 text-zinc-400">
            Original Signal: theholders.org
          </p>

          <p className="mt-2 text-zinc-400">
            Status: Original signal unstable. Archive reconstruction in progress.
          </p>

          <Link
            href="/vault/the-holders"
            className="mt-6 inline-block rounded-xl border border-cyan-300/50 px-4 py-2 text-cyan-200 hover:bg-cyan-300/10"
          >
            Open Entry 001
          </Link>
        </div>
      </section>
    </main>
  );
}