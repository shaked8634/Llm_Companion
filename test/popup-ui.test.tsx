import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/preact';
import App from '../src/entrypoints/popup/App';

describe('Popup UI', () => {
  it('renders LLM Companion header', () => {
    render(<App />);
    expect(screen.getByText(/LLM Companion/i)).toBeDefined();
  });
});

