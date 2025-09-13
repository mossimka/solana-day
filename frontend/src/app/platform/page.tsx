import Net from "@/components/ui/Net/Net";

export default function PlatformPage() {
  return (
    <main className="min-h-screen flex items-center justify-center relative">
      <Net />
      <section className="info z-20">
        <div className="glass p-4 rounded-lg shadow-md w-[400px] h-[300px] text-center flex flex-col items-center justify-around">
          <h1 className="text-4xl font-bold">Platform Page</h1>
          <p className="mt-4 text-lg">Welcome to the <span className="text-accent font-bold text-xl">Sephyra</span> platform page!</p>
          <button className="button">
            Start now!
          </button>
        </div>
      </section>
    </main>
  );
}
1