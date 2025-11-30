import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../services/api', () => ({
  analyzeUrl: jest.fn(),
}));

import { analyzeUrl } from '../../services/api';
import Analyze from '../Analyze';

const sampleResult = {
  url: 'https://example.com',
  title: 'Example Title',
  description: 'A sample description',
  h1: 'Welcome',
  technologies: [{ name: 'React', confidence: 0.9, evidence: 'window.React' }],
  metrics: { taskDuration: '12.34', fcp: '100', load: '200' },
  accessibility: { violations: [] },
  seo: { descriptionLength: 16, hasH1: true, wordCount: 42, robotsTxtStatus: 'found', canonical: { resolved: 'https://example.com' }, sitemap: { urlCount: 2 } },
  screenshot: null,
  lighthouse: { error: null },
};

describe('Analyze page - render, error, loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders analysis result returned from API', async () => {
    analyzeUrl.mockResolvedValueOnce(sampleResult);

    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /analyze/i });

    // submit form
    fireEvent.change(input, { target: { value: sampleResult.url } });
    fireEvent.click(button);

    // wait for result header
    await waitFor(() => expect(screen.getByText(new RegExp(`Results for ${sampleResult.url}`))).toBeInTheDocument());

    // technologies list should show React (may match multiple nodes)
    const techMatches = screen.getAllByText(/React/);
    expect(techMatches.length).toBeGreaterThan(0);

    // SEO checks should show Meta Description Length label
    expect(screen.getByText(/Meta Description Length/i)).toBeInTheDocument();
    expect(screen.getByText(String(sampleResult.seo.descriptionLength))).toBeInTheDocument();
  });

  test('shows error when analyzeUrl rejects', async () => {
    analyzeUrl.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /analyze/i });
    fireEvent.change(input, { target: { value: 'https://does-not-matter' } });
    fireEvent.click(button);

    const err = await screen.findByText(/Network error/);
    expect(err).toBeInTheDocument();
  });

  test('shows loading state while analyzing', async () => {
    // create a controllable promise so we can assert loading state before resolving
    let resolveFn;
    const p = new Promise((res) => { resolveFn = res; });
    analyzeUrl.mockReturnValueOnce(p);

    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /analyze/i });
    fireEvent.change(input, { target: { value: sampleResult.url } });
    fireEvent.click(button);

    // button should show scanning and be disabled
    expect(button).toHaveTextContent(/scanning/i);
    expect(button).toBeDisabled();

    // now resolve promise and wait for UI update
    resolveFn(sampleResult);
    await waitFor(() => expect(screen.getByText(new RegExp(`Results for ${sampleResult.url}`))).toBeInTheDocument());
  });
});
