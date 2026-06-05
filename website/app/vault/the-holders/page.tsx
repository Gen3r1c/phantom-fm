import fs from "fs";
import path from "path";
import Link from "next/link";

type HolderEntry = {
  number: string;
  title: string;
  slug: string;
  originalUrl: string;
  waybackTimestamp: string;
  storyMarkdownFile: string;
  archiveStatus: string;
};

function getHolders(): HolderEntry[] {
  const filePath = path.join(
    process.cwd(),
    "data",
    "vault",
    "the-holders",
    "holders.json"
  );

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export default function HoldersArchivePage() {
  const holders = getHolders();

  return (
    <main className="min-h-screen bg-black px-8 py-12 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/vault"
            className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-300/10"
          >
            ← Return to The Vault
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-purple-400/40 px-4 py-2 text-sm text-purple-200 hover:bg-purple-400/10"
          >
            ← Return to PHANTOM FM
          </Link>
        </div>

        <div className="mt-10 border-b border-purple-500/30 pb-8">
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">
            Vault Entry 001
          </p>

          <h1 className="mt-4 text-5xl font-bold text-purple-300">
            THE HOLDERS ARCHIVE
          </h1>

          <p className="mt-6 max-w-3xl text-zinc-300">
            A recovered index of ritual horror fragments from the dead web.
            Original signal traced to{" "}
            <span className="text-zinc-100">theholders.org</span>.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-400 sm:grid-cols-4">
            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Original Signal</p>
              <p>theholders.org</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Archive Status</p>
              <p>Recovered</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Entries</p>
              <p>{holders.length}</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Classification</p>
              <p>Internet Folklore</p>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-purple-200">
            Recovered Index
          </h2>

          <p className="mt-3 max-w-3xl text-sm text-zinc-400">
            Select an entry to open the preserved fragment. Some signals may be
            incomplete, corrupted, or recovered from alternate captures.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {holders.map((holder) => {
              const isLost = holder.archiveStatus === "signal-lost";

              return (
                <Link
                  key={`${holder.number}-${holder.slug}`}
                  href={`/vault/the-holders/${holder.slug}`}
                  className="group rounded-2xl border border-purple-500/30 bg-zinc-950 p-5 transition hover:border-cyan-300/60 hover:bg-purple-950/20"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                    Entry {holder.number}
                  </p>

                  <h3 className="mt-3 text-xl font-semibold text-zinc-100 group-hover:text-purple-200">
                    {holder.title}
                  </h3>

                  <p
                    className={`mt-3 text-sm ${
                      isLost ? "text-red-300" : "text-zinc-400"
                    }`}
                  >
                    Status: {isLost ? "Signal Lost" : "Preserved"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}