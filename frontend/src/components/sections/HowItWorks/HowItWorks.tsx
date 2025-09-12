import Image from "next/image";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    image: "/blockchain.png",
    title: "Register",
    text: "Create your account in just a few easy steps to reserve your spot on the platform. Registration is free, quick, and designed to get you started without delays.",
  },
  {
    image: "/wallet.png",
    title: "Import your wallet",
    text: "Connect your crypto wallet securely and gain instant access to your funds. This step also unlocks all key features you’ll need to explore the platform with confidence.",
  },
  {
    image: "/coin.png",
    title: "Put your assets",
    text: "Deposit your digital assets safely and manage them from one place. Track, optimize, and grow your portfolio while keeping everything secure and accessible anytime.",
  },
];

export default function HowItWorks() {
  return (
    <div className="relative">
      <section className="relative z-10 flex flex-col items-center gap-12 px-4 py-16">
        <h1 className="text-4xl font-bold text-center">How It Works</h1>
        <p className="max-w-2xl mx-auto text-center text-lg text-gray-400">
          Getting started with Sephyra is simple and straightforward. Follow these
          three easy steps to set up your account and begin managing your assets:
        </p>

        <div className="flex flex-col gap-24 w-full max-w-4xl mx-auto">
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className={`flex flex-col md:flex-row justify-between items-center ${
                idx % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Image block */}
              <div
                className={`flex-[0.45] flex ${
                  idx % 2 === 1 ? "md:justify-end" : "md:justify-start"
                }`}
              >
                <div className={`relative w-72 h-72 rounded-lg overflow-hidden shadow ${styles.imageContainer} ${
                  idx % 2 === 0 
                    ? `${styles.floatingImage} ${styles[`floatingDelay${idx + 1}`]}` 
                    : `${styles.floatingImage2} ${styles[`floatingDelay${idx + 1}`]}`
                }`}>
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Text block */}
              <div className="flex-[0.45] text-center md:text-left">
                <h2 className="text-2xl font-semibold text-primary mb-2">{step.title}</h2>
                <p className="text-gray-400 leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
