'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import Styles from './Header.module.css';
import BurgerMenu from './BurgerMenu/BurgerMenu';
import useMobileMenuStore from '@/stores/mobileMenu';

const Header = () => {
  const { isMobileMenuOpen, toggleMobileMenu } = useMobileMenuStore();
  const [shouldRender, setShouldRender] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setShouldAnimate(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className={`${Styles.header} glass`} id="top">
        <div className={Styles.headerDiv}>
          <div className={Styles.logo}>
            <Image src="/logo.svg" alt="Logo" fill />
          </div>
          <nav className={Styles.nav}>
            <Link href="#about" className={Styles.link}>About</Link>
            <Link href="#how_it_works" className={Styles.link}>How It Works</Link>
            <Link href="#contact" className={Styles.link}>Contact</Link>
          </nav>
          <div className={Styles.mobile}>
            <button
              className={`${Styles.burgerButton} ${isMobileMenuOpen ? Styles.burgerButtonActive : ''}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>
      {shouldRender && (
        <div className={`${Styles.mobileMenu} ${shouldAnimate ? Styles.mobileMenuOpen : ''}`}>
          <BurgerMenu />
        </div>
      )}
    </>
  )
}

export default Header