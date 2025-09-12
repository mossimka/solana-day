'use client';

import Styles from './BurgerMenu.module.css'
import Link from 'next/link';

const BurgerMenu = () => {

  return (
    <nav className={Styles.burgerMenu}>
      <ul>
        <li><Link href="#about" className={Styles.link}>About</Link></li>
        <li><Link href="#how_it_works" className={Styles.link}>How It Works</Link></li>
        <li><Link href="#contact" className={Styles.link}>Contact</Link></li>
      </ul>
    </nav>
  );
};

export default BurgerMenu;