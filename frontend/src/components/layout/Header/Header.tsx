"use client";
import React from "react";
import Link from "next/link";
import BurgerMenu from "./BurgerMenu/BurgerMenu";
import { ExternalLinkIcon, Link2Icon, LinkIcon, LogInIcon } from "lucide-react";
import Logo from "../Logo/Logo";
const Header = () => {
  return (
    <header>
      <nav className="desktop-header glass">
        <ul>
          <li>
            <Logo />
          </li>
          <li>
            <Link href="#how-it-works">How It Works</Link>
          </li>
          <li>
            <Link href="#features">Features</Link>
          </li>
          <li>
            <Link href="#try-now" className="flex items-center gap-5">
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
