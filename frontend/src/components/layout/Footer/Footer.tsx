import Link from 'next/link';
import Image from 'next/image';

import Styles from './Footer.module.css'


const Footer = () => {
  return (
    <footer className={Styles.footer}>
      <div className={Styles.container}>
        <Image src="/logo_white.svg" alt="Alma Wine Logo" width={200} height={100} className={Styles.logo}/>
        <div className={Styles.social}>
          <Link className={Styles.socialLink} href="https://www.instagram.com/almawine_almaty" target="_blank" rel="noopener noreferrer">
            <Image src="/icons/instagram.webp" alt="Instagram" fill/>
          </Link>
          <Link className={Styles.socialLink} href="https://wa.me/77717621265" target="_blank" rel="noopener noreferrer">
            <Image src="/icons/whatsapp.webp" alt="WhatsApp" fill/>
          </Link>
          <Link className={Styles.socialLink} href="https://www.linkedin.com/company/alma-wine-group/" target="_blank" rel="noopener noreferrer">
            <Image   src="/icons/linkedin.webp" alt="LinkedIn" fill/>
          </Link>
        </div>
      </div>
      <p className={Styles.copyright}>All rights reserved 2025</p>
    </footer>
  );
};

export default Footer;