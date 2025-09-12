export default function HowItWorks() {
  return (
    <section className="flex flex-col items-center justify-center text-center px-4 py-12">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">How it works</h1>
      <p className="text-lg md:text-2xl mb-8 max-w-2xl">
        Join us for a day of learning, networking, and fun as we explore the
        Solana ecosystem together. Here’s how you can make the most of Solana
        Day:
      </p>
      <div className="flex flex-col gap-8 w-full max-w-md mx-auto">
        {/* Step 1 */}
        <div className="flex flex-col items-center p-6 bg-white/80 rounded-lg shadow-md">
          <div className="mb-4 text-5xl">📝</div>
          <h2 className="text-xl font-semibold mb-2">1. Register</h2>
          <p className="text-base text-gray-700">
            Sign up for the event and secure your spot. Registration is quick
            and easy!
          </p>
        </div>
        {/* Step 2 */}
        <div className="flex flex-col items-center p-6 bg-white/80 rounded-lg shadow-md">
          <div className="mb-4 text-5xl">🤝</div>
          <h2 className="text-xl font-semibold mb-2">2. Participate</h2>
          <p className="text-base text-gray-700">
            Attend workshops, join discussions, and connect with fellow Solana
            enthusiasts and experts.
          </p>
        </div>
        {/* Step 3 */}
        <div className="flex flex-col items-center p-6 bg-white/80 rounded-lg shadow-md">
          <div className="mb-4 text-5xl">🚀</div>
          <h2 className="text-xl font-semibold mb-2">3. Build & Grow</h2>
          <p className="text-base text-gray-700">
            Apply what you’ve learned, collaborate on projects, and become part
            of the Solana community!
          </p>
        </div>
      </div>
    </section>
  );
}
