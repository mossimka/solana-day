import Link from "next/link";

import Logo from "@/components/layout/Logo/Logo";
import Globe from "@/components/ui/Globe/Globe";
import GoBack from "@/components/ui/GoBack/GoBack";

export default function PlatformPage() {
  return (
    <main className="relative overflow-hidden ">
      <div className="absolute inset-0 z-0">
        <Globe className="w-[100%] h-full" /> 
      </div>
      <div className="min-h-screen flex items-center justify-center flex-col z-10 relative">
        <div className="flex items-center space-x-4 mb-8">
          <Logo size={80}/>
          <Link href="/"><h1 className="font-bold text-6xl">Sephyra</h1></Link>
        </div>
        <div className="glass rounded-2xl p-8 
          w-[35vw] border border-white/10 
          flex flex-col space-y-6 items-center
        ">
          <p className="text-xl font-semibold">Sign In</p>
          <form className="flex flex-col space-y-4 w-full items-center">
            <label className="gap-2 flex flex-col w-full">
              Email:
              <input type="email" name="email" required className="glass h-12 p-4"/>
            </label>
            <label className="gap-2 flex flex-col w-full">
              Password:
              <input type="password" name="password" required className="glass h-12 p-4"/>
            </label>
            <p>Already have an acount? <Link href="/sign-in" className="font-bold text-accent">Sign In</Link></p>
            <button type="submit" className="button ">Sign Up</button>
          </form>
        </div>
      </div>
      <div className="absolute top-16 left-16 z-10">
        <GoBack />
      </div>
    </main>
  );
}
