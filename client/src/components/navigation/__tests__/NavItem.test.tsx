import { render, screen } from '@testing-library/react';
import { Home } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NavItem from '../NavItem';

describe('NavItem', () => {
  it('renders icon and accessible label', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavItem icon={Home} to="/dashboard" label="Dashboard" ariaLabel="Dashboard" />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('applies active styles when route matches', () => {
    render(
      <MemoryRouter initialEntries={["/orders"]}>
        <NavItem icon={Home} to="/orders" label="Orders" ariaLabel="Orders" />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /orders/i });
    expect(link.className).toContain('bg-blue-50');
  });

  it('renders badge content when provided', () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <NavItem icon={Home} to="/profile" label="Profile" ariaLabel="Profile" badge="3" />
      </MemoryRouter>,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
