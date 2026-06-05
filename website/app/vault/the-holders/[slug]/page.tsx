import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";

type HolderEntry = {
  number: string;
  title: string;
  slug: string;
  originalUrl: string;
  waybackTimestamp: string;
  storyMarkdownFile: string;
  archiveStatus: string;
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
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

function getStoryText(storyMarkdownFile: string) {
  const filePath = path.join(
    process.cwd(),
    "data",
    "vault",
    "the-holders",
    storyMarkdownFile
  );

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return raw.replace(/^---[\s\S]*?---/, "").trim();
}

export default async function HolderStoryPage({ params }: PageProps) {
  const { slug } = await params;

  const holders = getHolders();
  const currentIndex = holders.findIndex((holder) => holder.slug === slug);

  if (currentIndex === -1) {
    notFound();
  }

  const holder = holders[currentIndex];
  const previous = holders[currentIndex - 1];
  const next = holders[currentIndex + 1];
  const storyText = getStoryText(holder.storyMarkdownFile);
  const isLost = holder.archiveStatus === "signal-lost";

  return (
    <main className="min-h-screen bg-black px-8 py-12 text-white">
      <article className="mx-auto max-w-4xl">
        <nav className="flex flex-wrap gap-3">
          <Link
            href="/vault/the-holders"
            className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-300/10"
          >
            ← Return to Holders Index
          </Link>

          <Link
            href="/vault"
            className="rounded-xl border border-purple-400/40 px-4 py-2 text-sm text-purple-200 hover:bg-purple-400/10"
          >
            ← Return to The Vault
          </Link>
        </nav>

        <header className="mt-10 border-b border-purple-500/30 pb-8">
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">
            Entry {holder.number}
          </p>

          <h1 className="mt-4 text-5xl font-bold text-purple-300">
            {holder.title}
          </h1>

          <div className="mt-8 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Classification</p>
              <p>Internet Folklore / Ritual Horror</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Archive Status</p>
              <p className={isLost ? "text-red-300" : "text-zinc-100"}>
                {isLost ? "Signal Lost" : "Preserved"}
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Original Signal</p>
              <p>theholders.org</p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-zinc-950 p-4">
              <p className="text-cyan-300">Wayback Timestamp</p>
              <p>{holder.waybackTimestamp}</p>
            </div>
          </div>
        </header>

        <section
          className={`mt-10 rounded-2xl border p-6 leading-8 ${
            isLost
              ? "border-red-500/30 bg-red-950/10 text-red-100"
              : "border-purple-500/30 bg-zinc-950 text-zinc-200"
          }`}
        >
          {storyText.split(/\n{2,}/).map((paragraph, index) => {
            if (paragraph.startsWith(">")) {
              return (
                <pre
                  key={index}
                  className="mb-6 overflow-x-auto rounded-xl border border-cyan-300/30 bg-black p-4 text-sm leading-6 text-cyan-200"
                >
                  {paragraph.replace(/^>\s?/gm, "")}
                </pre>
              );
            }

            return (
              <p key={index} className="mb-6 whitespace-pre-wrap">
                {paragraph}
              </p>
            );
          })}
        </section>

        <nav className="mt-10 grid gap-4 sm:grid-cols-3">
          <div>
            {previous ? (
              <Link
                href={`/vault/the-holders/${previous.slug}`}
                className="block rounded-xl border border-purple-500/30 bg-zinc-950 p-4 text-sm text-zinc-300 hover:border-cyan-300/60"
              >
                <span className="text-cyan-300">← Previous</span>
                <br />
                {previous.number} — {previous.title}
              </Link>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-600">
                No previous entry
              </div>
            )}
          </div>

          <Link
            href="/vault/the-holders"
            className="block rounded-xl border border-cyan-300/40 bg-zinc-950 p-4 text-center text-sm text-cyan-200 hover:bg-cyan-300/10"
          >
            Return to Index
          </Link>

          <div>
            {next ? (
              <Link
                href={`/vault/the-holders/${next.slug}`}
                className="block rounded-xl border border-purple-500/30 bg-zinc-950 p-4 text-sm text-zinc-300 hover:border-cyan-300/60"
              >
                <span className="text-cyan-300">Next →</span>
                <br />
                {next.number} — {next.title}
              </Link>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-600">
                No next entry
              </div>
            )}
          </div>
        </nav>
      </article>
    </main>
  );
}