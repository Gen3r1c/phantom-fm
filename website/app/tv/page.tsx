export default function TVPage() {
  return (
    <main className="min-h-screen bg-black text-pink-600 overflow-hidden relative flex flex-col items-center justify-center">

      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,120,0.08),transparent_70%)]" />

      {/* Scanlines */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,0,120,0.08)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

      {/* TV Container */}
      <div className="relative z-10 border border-pink-900 bg-black/80 p-8 shadow-[0_0_40px_rgba(255,0,120,0.2)] w-[900px]">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-pink-900 pb-4">

          <h1 className="text-3xl tracking-[0.4em] text-red-500">
            PHANTOM FM TV
          </h1>

          <span className="text-green-400 animate-pulse">
            SIGNAL SEARCHING
          </span>

        </div>

        {/* Fake Screen */}
        <div className="relative mt-8 h-[500px] bg-black border border-pink-900 overflow-hidden">

          {/* Static Effect */}
          <div className="absolute inset-0 opacity-20 animate-pulse bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]" />

          {/* Flicker */}
          <div className="absolute inset-0 animate-pulse bg-pink-900/10" />

          {/* Center Message */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">

            <p className="text-red-500 tracking-[0.3em] text-sm">
              CHANNEL STATUS
            </p>

            <h2 className="mt-6 text-6xl text-white tracking-[0.2em]">
              NO SIGNAL
            </h2>

            <p className="mt-8 text-purple-500 tracking-[0.3em]">
              Awaiting Broadcast Transmission...
            </p>

          </div>

        </div>

        {/* Bottom Telemetry */}
        <div className="mt-6 flex justify-between text-sm tracking-[0.2em] text-pink-500">

          <span>CHANNEL: UNKNOWN</span>

          <span>UPLINK: STANDBY</span>

          <span>FREQUENCY: 88.7</span>

        </div>

      </div>

    </main>
  );
}