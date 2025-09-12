import Link from 'next/link';

const GoBack = () => {
  return (
    <button className='glass p-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-accent text-lg'>
      <Link href="/">Go Back</Link>
    </button>
  )
}

export default GoBack