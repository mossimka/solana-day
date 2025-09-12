import Link from 'next/link';
import Image from 'next/image';
import { X, MessageCircle, Github, Home, Info, Cog, Mail } from 'lucide-react';

import Styles from './Footer.module.css'


const Footer = () => {
  return (
    <footer className={Styles.footer}>
      <div className={Styles.container}>
        <div className='flex flex-col items-center'>
          <Image src="/logo.webp" alt="Zephyra Logo" width={200} height={100} className={Styles.logo}/>
          <h1 className={Styles.title}>Sephyra</h1>
        </div>
        <nav className={Styles.navigation}>
          <Link href="#top" className={Styles.navLink}>
            <Home size={18} />
            <span>Home</span>
          </Link>
          <Link href="#about" className={Styles.navLink}>
            <Info size={18} />
            <span>Platform</span>
          </Link>
          <Link href="#about" className={Styles.navLink}>
            <Info size={18} />
            <span>About</span>
          </Link>
          <Link href="#how_it_works" className={Styles.navLink}>
            <Cog size={18} />
            <span>How It Works</span>
          </Link>
          <Link href="#contact" className={Styles.navLink}>
            <Mail size={18} />
            <span>Contact</span>
          </Link>
        </nav>
        <div className={Styles.social}>
          <Link className={Styles.socialLink} href="https://twitter.com/solana" target="_blank" rel="noopener noreferrer">
            <X size={24} />
          </Link>
          <Link className={Styles.socialLink} href="https://discord.com/invite/solana" target="_blank" rel="noopener noreferrer">
            <MessageCircle size={24} />
          </Link>
          <Link className={Styles.socialLink} href="https://github.com/solana-labs" target="_blank" rel="noopener noreferrer">
            <Github size={24} />
          </Link>
        </div>
      </div>
      <p className={Styles.copyright}>All rights reserved 2025</p>
    </footer>
  );
};

export default Footer;