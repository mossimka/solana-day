import Logo from "@/components/layout/Logo/Logo";
import { ChartAreaIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-[100] p-4 md:px-8">
      <nav className="bg-[var(--glass-bg)] backdrop-blur-[var(--glass-backdrop-blur)] border border-[var(--color-border)] rounded-2xl p-4 md:px-8">
        <ul className="flex justify-around items-center w-full list-none m-0 p-0">
          <li className="flex items-center list-none">
            <Link href="/" className="flex items-center space-x-1">
              <Logo />
              <h1 className="font-bold text-4xl cursor-pointer">Sephyra</h1>
            </Link>
          </li>
          <li className="flex items-center list-none ">
            <Link
              href="/platform"
              className="text-[var(--color-text-primary)]  text-base font-medium no-underline transition-all duration-300 ease-in-out px-4 py-2 rounded-md flex items-center gap-2 hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
            >
              <span className="cursor-pointer">Trading</span>
              <ChartAreaIcon
                size={20}
                className="text-[var(--color-primary)]"
              />
            </Link>
          </li>
          <li className="flex items-center list-none">
            <Link
              href="/platform/settings"
              className="text-[var(--color-text-primary)]  text-base font-medium no-underline transition-all duration-300 ease-in-out px-4 py-2 rounded-md flex items-center gap-2 hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
            >
              <span className="cursor-pointer">Settings</span>
              <SettingsIcon size={20} className="text-[var(--color-primary)]" />
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
