import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Logo.module.css";
export default function Logo() {
  return (
    <Link href="/" className={styles.logo}>
      <Image width={40} height={40} src={"/logo.webp"} alt="Logo" />
    </Link>
  );
}
