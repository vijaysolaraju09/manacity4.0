import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Store, Calendar, User, ShoppingCart } from 'lucide-react';

const tabs = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Shops', to: '/shops', icon: Store },
  { label: 'Services', to: '/services', icon: ShoppingBag },
  { label: 'Events', to: '/events', icon: Calendar },
  { label: 'Profile', to: '/profile', icon: User },
  { label: 'Cart', to: '/cart', icon: ShoppingCart },
];

const BottomNav: FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            location.pathname === tab.to ||
            (tab.to !== '/' && location.pathname.startsWith(`${tab.to}/`));

          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
