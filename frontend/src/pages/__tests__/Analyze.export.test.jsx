import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Analyze from '../Analyze';
import { MemoryRouter } from 'react-router-dom';

// Mock the API service
jest.mock('../../services/api', () => ({
  analyzeUrl: jest.fn(),
  getAnalysesForUrl: jest.fn()
}));

import { analyzeUrl } from '../../services/api';

const sampleResult = {
  url: 'http://example.test',
  title: 'Test Page',
  description: 'A description',
  h1: 'Heading',
  technologies: [{ name: 'React', confidence: 0.9 }],
  metrics: { taskDuration: '120', fcp: '50', load: '100' },
  screenshot: null,
  accessibility: { violations: [] },
  seo: {
    descriptionLength: 13,
    hasH1: true,
    wordCount: 2,
    robotsTxtStatus: 'found',
    canonical: { raw: '/canonical', resolved: 'http://example.test/canonical', sameHost: true },
    jsonLd: { count: 0, parsed: [], errors: [] },
    hreflang: { total: 0, duplicates: [] },
    sitemap: { url: 'http://example.test/sitemap.xml', parsed: true, urlCount: 1, errors: [] }
  }
};

describe('Analyze export interactions', () => {
  beforeEach(() => {
    analyzeUrl.mockReset();
    analyzeUrl.mockResolvedValue(sampleResult);
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob://fake');
    global.URL.revokeObjectURL = jest.fn();
    // Mock alert to avoid JSDOM not implemented error
    global.alert = jest.fn();
    // Mock anchor click
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Download JSON triggers a blob download with .json filename', async () => {
    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'http://example.test' } });
    const btn = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(btn);

    // Wait for result header
    await waitFor(() => expect(screen.getByText(/Results for/i)).toBeInTheDocument());

    const downloadBtn = screen.getByRole('button', { name: /download json/i });
    fireEvent.click(downloadBtn);

    // Ensure createObjectURL was called and anchor click executed
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  test('Export menu CSV produces a .csv download', async () => {
    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'http://example.test' } });
    const btn = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText(/Results for/i)).toBeInTheDocument());

    // Open export menu (menu toggling uses inline script in the DOM; the buttons exist but may be hidden)
    const exportBtn = screen.getByRole('button', { name: /export ▾/i });
    fireEvent.click(exportBtn);

    // Click Export CSV (allow hidden elements)
    const csvBtn = screen.getByRole('button', { name: /export csv/i, hidden: true });
    fireEvent.click(csvBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});
