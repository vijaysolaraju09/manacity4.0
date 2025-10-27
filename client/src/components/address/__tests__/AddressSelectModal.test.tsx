import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressSelectModal from '../AddressSelectModal';

const listMyAddresses = vi.fn();
const createAddress = vi.fn();
const setDefaultAddress = vi.fn();

vi.mock('@/api/addresses', () => ({
  listMyAddresses,
  createAddress,
  setDefaultAddress,
}));

vi.mock('@/components/ui/Toast', () => ({
  default: vi.fn(),
}));

describe('AddressSelectModal', () => {
  it('renders saved addresses when opened', async () => {
    listMyAddresses.mockResolvedValueOnce([
      {
        id: 'addr-1',
        label: 'Home',
        line1: '12 Main Street',
        city: 'Indore',
        state: 'MP',
        pincode: '452001',
        phone: '9999999999',
        isDefault: true,
      },
    ]);

    render(
      <AddressSelectModal open onClose={() => undefined} onConfirm={() => undefined} />,
    );

    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /select home/i })).toBeChecked();
  });

  it('requires an address selection before enabling Place order', async () => {
    listMyAddresses.mockResolvedValueOnce([
      {
        id: 'addr-1',
        label: 'Home',
        line1: '12 Main Street',
        city: 'Indore',
        state: 'MP',
        pincode: '452001',
        phone: '9999999999',
        isDefault: false,
      },
      {
        id: 'addr-2',
        label: 'Office',
        line1: 'Suite 5',
        city: 'Indore',
        state: 'MP',
        pincode: '452002',
        phone: '8888888888',
        isDefault: false,
      },
    ]);

    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <AddressSelectModal open onClose={() => undefined} onConfirm={onConfirm} />,
    );

    const action = await screen.findByRole('button', { name: /place order/i });
    expect(action).toBeDisabled();

    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
    await waitFor(() => expect(action).toBeEnabled());

    const officeButton = screen.getByRole('button', { name: /office/i });
    await userEvent.click(officeButton);
    await userEvent.click(action);

    expect(onConfirm).toHaveBeenCalledWith('addr-2');
  });
});
