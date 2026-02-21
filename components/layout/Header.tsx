'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { MdHome, MdPerson, MdMenuBook, MdSettings } from 'react-icons/md';

export default function Header() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/', label: 'Room', icon: MdHome },
    { href: '/agent/me', label: 'Agent', icon: MdPerson },
    { href: '/guide', label: 'Guide', icon: MdMenuBook },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🌍</span>
            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              AI Life Room
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
            <Link
              href="/?settings=1"
              className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <MdSettings className="w-4 h-4" />
            </Link>
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
