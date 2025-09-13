"use client";

import Link from "next/link";
import { useState } from "react";
import { authService } from "@/services/auth";

import Logo from "@/components/layout/Logo/Logo";
import Globe from "@/components/ui/Globe/Globe";
import GoBack from "@/components/ui/GoBack/GoBack";
import { useRouter } from "next/dist/client/components/navigation";

export default function SignUpPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const user = await authService.register({ username, password });
      console.log("User registered:", user);
      
      // Reset form
      setUsername("");
      setPassword("");

      setTimeout(() => {
        router.push("/platform");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="relative overflow-hidden">
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
          <p className="text-xl font-semibold">Sign Up</p>
          
          {error && (
            <div className="text-red-500 text-sm bg-red-100 p-3 rounded border border-red-300 w-full text-center">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full items-center">
            <label className="gap-2 flex flex-col w-full">
              Username:
              <input 
                type="text" 
                name="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                className="glass h-12 p-4"
                disabled={isLoading}
              />
            </label>
            <label className="gap-2 flex flex-col w-full">
              Password:
              <input 
                type="password" 
                name="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="glass h-12 p-4"
                disabled={isLoading}
              />
            </label>
            <p>Already have an account? <Link href="/sign-in" className="font-bold text-accent">Sign In</Link></p>
            <button 
              type="submit" 
              className="button"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>
        </div>
      </div>
      <div className="absolute top-16 left-16 z-10">
        <GoBack />
      </div>
    </main>
  );
}
