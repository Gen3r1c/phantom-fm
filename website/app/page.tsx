export default function Home() {
  return (
    <main className="min-h-screen bg-black text-pink-600 flex flex-col items-center justify-center overflow-hidden">

      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,0,120,0.15)_1px,transparent_1px)] bg-[size:100%_4px]" />

      <h1 className="text-8xl font-black tracking-widest text-red-600 drop-shadow-[0_0_20px_rgba(255,0,80,0.8)]">
        PHANTOM FM
      </h1>

      <p className="mt-4 text-2xl tracking-[0.4em] text-purple-500">
        THE SIGNAL NEVER DIES
      </p>

      <div className="mt-16 border border-pink-700 bg-black/50 p-6 w-[500px] text-center shadow-[0_0_40px_rgba(255,0,120,0.25)]">
        <p className="text-red-500 text-lg tracking-widest">
          TRANSMISSION STATUS
        </p>

        <p className="mt-4 text-green-400 text-3xl font-bold animate-pulse">
          SIGNAL DETECTED
        </p>
      </div>

    </main>
  );
}