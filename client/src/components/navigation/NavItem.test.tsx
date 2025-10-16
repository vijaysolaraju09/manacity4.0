import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ShoppingCart } from 'lucide-react';
import NavItem from './NavItem';

describe('NavItem', () => {
  it('renders an icon variant with an accessible label', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/profile']}>
        <NavItem to="/orders/mine" icon={ShoppingCart} label="My Orders" ariaLabel="My Orders" />
      </MemoryRouter>,
    );

    const link = screen.getByLabelText('My Orders');
    expect(link).toHaveAttribute('href', '/orders/mine');

    const srOnly = container.querySelector('.sr-only');
    expect(srOnly?.textContent).toBe('My Orders');
  });

  it('marks the link as active when the route matches', () => {
    render(
      <MemoryRouter initialEntries={['/orders/mine']}>
        <NavItem to="/orders/mine" icon={ShoppingCart} label="My Orders" ariaLabel="My Orders" />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('My Orders')).toHaveAttribute('aria-current', 'page');
  });

  it('renders the default variant with a visible label', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <NavItem
          to="/settings"
          icon={ShoppingCart}
          label="Settings"
          ariaLabel="Settings"
          variant="default"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Settings')).toBeVisible();
  });
});
