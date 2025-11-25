import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import Sidebar from './Sidebar';

let mockUser: any = null;

vi.mock('react-redux', async () => {
  const actual = await vi.importActual<typeof import('react-redux')>('react-redux');
  return {
    ...actual,
    useSelector: (selector: any) => selector({ auth: { user: mockUser } }),
  };
});

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );

describe('Sidebar business navigation', () => {
  beforeEach(() => {
    mockUser = { role: 'customer', businessStatus: 'none' };
  });

  it('hides business links for customers', () => {
    renderSidebar();
    expect(screen.queryByText(/manage products/i)).toBeNull();
    expect(screen.queryByText(/orders received/i)).toBeNull();
  });

  it('shows business links for business role', () => {
    mockUser = { role: 'business', businessStatus: 'approved' };
    renderSidebar();
    expect(screen.getByText(/manage products/i)).toBeInTheDocument();
    expect(screen.getByText(/orders received/i)).toBeInTheDocument();
  });

  it('shows business links when business status is approved after role upgrade', () => {
    mockUser = { role: 'customer', businessStatus: 'approved' };
    renderSidebar();
    expect(screen.getByText(/manage products/i)).toBeInTheDocument();
    expect(screen.getByText(/orders received/i)).toBeInTheDocument();
  });
});
