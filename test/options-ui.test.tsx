import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/preact';
import Options from '../src/entrypoints/options/Options';

describe('Options UI', () => {
  it('renders Providers tab by default', () => {
    render(<Options />);
    expect(screen.getByText(/Providers/i)).toBeDefined();
  });
});

