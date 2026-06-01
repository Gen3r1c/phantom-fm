import Link from "next/link";

export default function HoldersArchivePage() {
  return (
    <main className="min-h-screen bg-black px-8 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/vault" className="text-sm text-cyan-300 hover:underline">
          ← Return to The Vault
        </Link>

        <p className="mt-10 text-sm tracking-[0.4em] text-cyan-300">
          VAULT ENTRY 001
        </p>

        <h1 className="mt-4 text-5xl font-bold text-purple-300">
          THE HOLDERS ARCHIVE
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-300">
          A preservation index for The Holders: early internet ritual horror,
          recovered from surviving mirrors, archive traces, and dead-web memory.
        </p>

        <div className="mt-10 rounded-2xl border border-purple-500/40 bg-purple-950/20 p-6">
          <p className="text-xs tracking-[0.35em] text-cyan-300">
            ORIGINAL SIGNAL
          </p>

          <p className="mt-3 text-2xl text-zinc-100">theholders.org</p>

          <p className="mt-4 text-zinc-400">
            Status: Original signal unstable. Archive reconstruction in progress.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-purple-200">
            Recovered Index
          </h2>

          <div className="mt-5 grid gap-4">
            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-5">
              <p className="text-xs tracking-[0.3em] text-cyan-300">
                VAULT ENTRY 001.001
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                The Holder of the End
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Archive Status: Source trail pending
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-5">
              <p className="text-xs tracking-[0.3em] text-cyan-300">
                VAULT ENTRY 001.002
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                The Holder of the Beginning
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Archive Status: Source trail pending
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}