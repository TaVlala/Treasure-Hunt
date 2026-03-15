// Sidebar navigation — client component so usePathname() works for active link highlighting.
// Displays nav items, current user email, and a logout button.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, getStoredUser } from '@/lib/auth';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: 'Hunts',
    href: '/hunts',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1v1M8 13v1M1 7h1M13 7h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 10v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Sponsors',
    href: '/sponsors',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path
          d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 3.9L8 10.6l-3.6 1.8.7-3.9L2.2 5.7l4-.6L8 1.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <path d="M2 12l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    setEmail(user?.email ?? '');
  }, []);

  return (
    <aside className="w-60 bg-sidebar flex flex-col border-r border-border h-screen sticky top-0 shrink-0">

      {/* Brand */}
      <div className="px-6 py-7 border-b border-border">
        <p className="text-[10px] tracking-[0.35em] text-accent uppercase font-medium">
          Treasure Hunt
        </p>
        <p className="text-[11px] text-text-muted mt-0.5 tracking-wide">
          Admin Panel
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] text-text-faint uppercase tracking-widest px-3 pb-2 pt-1">
          Navigation
        </p>
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:text-white hover:bg-surface-2'
                }
              `}
            >
              <span className={isActive ? 'text-accent' : 'text-text-faint'}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-border">
        {email && (
          <p className="text-[11px] text-text-muted px-3 pb-3 truncate">{email}</p>
        )}
        <button
          onClick={() => void logout()}
          className="
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted
            hover:text-white hover:bg-surface-2 w-full text-left transition-colors
          "
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
