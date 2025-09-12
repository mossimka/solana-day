import Brands from "@/components/sections/BrandsSection/Brands";
import HeroSection from "@/components/sections/HeroSection/HeroSection";
import HowItWorks from "@/components/sections/HowItWorks/HowItWorks";

export default function page() {
  return (
    <main>
      <HeroSection />
      <HowItWorks />
      <Brands />
    </main>
  );
}
