import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Logo.module.css";

interface LogoProps {
  width?: number;
  height?: number;
  size?: number;
  className?: string;
}

export default function Logo({ width, height, size = 50, className }: LogoProps) {
  const logoWidth = width || size;
  const logoHeight = height || size;

  return (
    <Link href="/" className={`${styles.logo} ${className || ''}`}>
      <Image 
        width={logoWidth} 
        height={logoHeight} 
        src={"/logo.webp"} 
        alt="Sephyra Logo" 
      />
    </Link>
  );
}
