import Image from 'next/image';

import styles from './Brands.module.css';

const Brands = () => {
  return (
    <div className='flex flex-col items-center justify-center text-center width-[100%]'>
      <h2 className='text-4xl font-bold text-primary mb-4'>Thanks for supporting us</h2>
      <div className="w-full overflow-hidden mt-20 mb-40">
        <div className={styles.brandLogos}>
          <Image src="/kbtu.webp" alt="KBTU" width="150" height="50" />
          <Image src="/decentrathon.webp" alt="Decentrathon" width="300" height="50" />
          <Image src="/solana.svg" alt="Solana" width="150" height="50" />
          <Image src="/nfactorial.webp" alt="NFactorial" width="150" height="50" />
          <Image src="/ministry.webp" alt="Ministry" width="200" height="50" />
          <Image src="/superteam.webp" alt="Superteam" width="300" height="50" />
          <Image src="/devs.webp" alt="Devs.kz" width="150" height="50" />
          <Image src="/kbtu.webp" alt="KBTU" width="150" height="50" />
          <Image src="/decentrathon.webp" alt="Decentrathon" width="300" height="50" />
          <Image src="/solana.svg" alt="Solana" width="150" height="50" />
        </div>
      </div>
    </div>
  )
}

export default Brands