import React from "react";
import Net from "@/components/ui/Net/Net";

export default function Settings() {
  return (
    <main className="min-h-screen flex items-center justify-center relative pt-40" style={{background: 'var(--color-bg-primary)'}}>
      <Net className="absolute inset-0" />
      <h1 className="text-4xl font-bold relative z-10" style={{color: 'var(--color-text-primary)'}}>Settings</h1>
    </main>
  );
}
