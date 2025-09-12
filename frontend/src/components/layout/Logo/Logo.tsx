import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Logo.module.css";
export default function Logo() {
  return (
    <Link href="/" className={styles.logo}>
      <Image width={50} height={50} src={"/logo.webp"} alt="Logo" />
    </Link>
  );
}
