/**
 * Component test: GlobalSearch
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalSearch from '@/components/GlobalSearch';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GlobalSearch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders search input with placeholder', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText(/Search incidents, packets, decisions/i)).toBeInTheDocument();
  });

  it('shows loading state when searching', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<GlobalSearch />);
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText(/Search incidents/i), 'flood');
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/search?q=flood'));
    });
  });

  it('displays results when search succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: true,
        results: [
          { type: 'incident', id: 'inc_1', title: 'Flood Event', subtitle: 'Region 07', url: '/simulation?incident=inc_1' },
        ],
      }),
    });
    render(<GlobalSearch />);
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText(/Search incidents/i), 'flood');
    });
    await waitFor(() => {
      expect(screen.getByText('Flood Event')).toBeInTheDocument();
    });
  });

  it('displays no results when search returns empty', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, results: [] }),
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search incidents/i);
    await act(async () => {
      await userEvent.type(input, 'xyz');
      input.focus();
    });
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
    await waitFor(
      () => {
        expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
