import Image from 'next/image';

import styles from './Brands.module.css';

const Brands = () => {
  return (
    <div className='flex flex-col items-center justify-center text-center width-[100%]'>
      <h2 className='text-2xl font-bold mb-4'>Thanks for supporting us</h2>
      <div className={styles.brandLogos}>
        <Image src="/kbtu.webp" alt="KBTU" width="150" height="50" />
        <Image src="/decentrathon.webp" alt="Decentrathon" width="150" height="30" />
        <Image src="/solana.svg" alt="Solana" width="150" height="50" />
        <Image src="/ministry.webp" alt="Ministry" width="150" height="50" />
        <Image src="/superteam.webp" alt="Superteam" width="150" height="50" />
        <Image src="/devs.webp" alt="Devs.kz" width="150" height="50" />
      </div>
    </div>
  )
}

export default Brands