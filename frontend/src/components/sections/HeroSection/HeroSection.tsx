import Image from 'next/image';

import Globe from '@/components/ui/Globe/Globe';
import Typewriter from '@/components/ui/Typewriter/Typewriter';

export default function HeroSection() {
  const typewriterWords = [
    'simplest',
    'most secure',
    'fastest',
    'innovative',
    'revolutionary',
    'safest'
  ];

  return (
    <section className="relative flex flex-col items-center justify-center text-center min-h-screen">
      <div className="absolute inset-0 z-0">
        <Globe className="w-[99%] h-full" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 bg-black/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
          Sephyra is here!
        </h1>
        <p className="text-2xl md:text-2xl mb-8 max-w-3xl text-white/90">
          Join the{' '}
          <Typewriter 
            words={typewriterWords}
            className="text-accent font-bold"
            typingSpeed={100}
            deletingSpeed={80}
            pauseDuration={2500}
          />{' '}
          way to manage your money on Solana.
        </p>
        <button className="bg-gradient-to-r from-pink-500 text-white to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg">
          Get Started
        </button>

        <div className='flex flex-col items-center w-full gap-3 mt-8'>
          <div className='flex items-center gap-3'>
            <Image className='filter' src="/solana-coin.webp" alt="Solana Day" width="50" height="50" />
            <h3 className="text-white/80 text-md md:text-base">Developed during Solana Day</h3>
          </div>
          <div className='flex gap-3 text-white/80'>
            <p>powered by</p>
            <Image className='filter2' src="/decentrathon.webp" alt="Decentrathor Logo" width="150" height="50" />
          </div>
        </div>
      </div>
    </section>
  );
}
