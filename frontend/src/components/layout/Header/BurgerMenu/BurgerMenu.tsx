"use client";
import { useState } from "react";
import { LogInIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import Logo from "../../Logo/Logo";
export default function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="mobile-header glass">
      <ul>
        <li>
          <Logo />
        </li>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <li>
            <button
              style={{ padding: "0.6rem", borderRadius: "10px" }}
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size="20" /> : <Menu size="20" />}
            </button>
          </li>
        </div>
      </ul>
      {isOpen && (
        <ul className="burger-menu">
          <li>
            <Link href="#how-it-works">How It Works</Link>
          </li>
          <li>
            <Link href="#features">Features</Link>
          </li>
          <li>
            <Link href="/sign-in">
              <LogInIcon size="20" />
            </Link>
          </li>
        </ul>
      )}
    </nav>
  );
}
