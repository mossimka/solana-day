import Image from "next/image";

export default function Home() {
  return (  
    <main className="m-[13vh]">
      <h1>Welcome to the Home Page</h1>
      <Image src="/logo.svg" alt="Logo" width={200} height={200} />
    </main>
  );
}
