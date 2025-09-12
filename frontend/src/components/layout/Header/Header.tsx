"use client";
import React from "react";
import Link from "next/link";
import BurgerMenu from "./BurgerMenu/BurgerMenu";
import { LogInIcon } from "lucide-react";
import Logo from "../Logo/Logo";
import Styles from "./Header.module.css";

const Header = () => {
  return (
    <header className={Styles.header}>
      <nav className={`${Styles.desktopHeader} glass`}>
        <ul className={Styles.nav}>
          <li className={Styles.navItem}>
            <Logo />
            <h1 className="font-bold text-4xl">Sephyra</h1>
          </li>
          <li className={Styles.navItem}>
            <Link href="/platform" className={Styles.navLink}>
              Platform
            </Link>
          </li>
          <li className={Styles.navItem}>
            <Link href="#how-it-works" className={Styles.navLink}>
              How It Works
            </Link>
          </li>
          <li className={Styles.navItem}>
            <Link href="#features" className={Styles.navLink}>
              Features
            </Link>
          </li>
          <li className={Styles.navItem}>
            <Link href="#try-now" className={`${Styles.navLink} ${Styles.signInButton}`}>
              <span>Sign in</span>
              <LogInIcon size={20} />
            </Link>
          </li>
        </ul>
      </nav>
      <BurgerMenu />
    </header>
  );
};

export default Header;
