'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutGrid,
  PlusCircle,
  Home,
  Images,
  Layers,
  LayoutTemplate,
  Frame,
  Flame,
  Library,
} from 'lucide-react';
import { ToastProvider } from '../ui/Toast';

// Pulls the event id out of /events/:id/* or /owner/event/:id/*
function eventIdFrom(pathname) {
  const m = pathname.match(/^\/(?:events|owner\/event)\/([^/]+)/);
  return m ? m[1] : null;
}

function NavItem({ href, icon: Icon, label, active }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`host-nav-item ${active ? 'is-active' : ''}`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
      <span className="host-nav-label">{label}</span>
    </Link>
  );
}

export function HostShell({ children }) {
  const pathname = usePathname() || '';
  const eventId = eventIdFrom(pathname);

  const global = [
    { href: '/owner/dashboard', icon: LayoutGrid, label: 'Events' },
    { href: '/create', icon: PlusCircle, label: 'New event' },
  ];
  const scoped = eventId
    ? [
        { href: `/events/${eventId}`, icon: Library, label: 'Workspace', exact: true },
        { href: `/events/${eventId}/moderate`, icon: Layers, label: 'Moderate' },
        { href: `/owner/event/${eventId}/gallery`, icon: Images, label: 'Gallery' },
        { href: `/owner/event/${eventId}/select-style`, icon: LayoutTemplate, label: 'Wall style' },
        { href: `/events/${eventId}/tapestry`, icon: Frame, label: 'Finalise' },
        { href: `/events/${eventId}/disposal`, icon: Flame, label: 'Dispose' },
      ]
    : [];

  const isActive = (it) =>
    it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);

  return (
    <ToastProvider>
      <div className="theme-owner min-h-screen text-ink">
        <aside className="host-sidebar" aria-label="Host navigation">
          <Link href="/" className="host-brand" aria-label="Ephemera home">
            <span className="font-editorial text-[22px] leading-none">E</span>
            <span className="host-nav-label font-editorial text-xl">phemera</span>
          </Link>

          <nav className="host-nav">
            {global.map((it) => (
              <NavItem key={it.href} {...it} active={isActive(it)} />
            ))}
            {scoped.length > 0 && <div className="host-nav-divider" role="separator" />}
            {scoped.map((it) => (
              <NavItem key={it.href} {...it} active={isActive(it)} />
            ))}
          </nav>

          <div className="host-nav-foot">
            <NavItem href="/" icon={Home} label="Public site" active={false} />
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (
              <div className="host-user">
                <UserButton />
              </div>
            )}
          </div>
        </aside>

        <div className="host-content">{children}</div>
      </div>
    </ToastProvider>
  );
}
