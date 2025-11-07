import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { label: 'Home', to: '/' },
  { label: 'Shops', to: '/shops' },
  { label: 'Services', to: '/services' },
  { label: 'Events', to: '/events' },
  { label: 'Profile', to: '/profile' },
  { label: 'Cart', to: '/cart' },
];

const TopBar: FC = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div className="text-lg font-semibold tracking-tight">Manacity</div>
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const isActive =
              location.pathname === link.to ||
              (link.to !== '/' && location.pathname.startsWith(`${link.to}/`));

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default TopBar;
