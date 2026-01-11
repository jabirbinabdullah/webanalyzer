import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../services/api', () => ({
  analyzeUrl: jest.fn(),
  getAnalysisStatus: jest.fn(),
  getAnalysis: jest.fn(),
}));

import { analyzeUrl, getAnalysisStatus, getAnalysis } from '../../services/api';
import Analyze from '../Analyze';

const sampleResult = {
  _id: '12345',
  url: 'https://example.com',
  title: 'Example Title',
  description: 'A sample description',
  h1: 'Welcome',
  technologies: [{ name: 'React', confidence: 0.9, evidence: 'window.React' }],
  metrics: { taskDuration: '12.34', fcp: '100', load: '200' },
  accessibility: { violations: [] },
  seo: {
    descriptionLength: 16,
    hasH1: true,
    wordCount: 42,
    robotsTxtStatus: 'found',
    canonical: { resolved: 'https://example.com' },
    sitemap: { urlCount: 2 },
  },
  screenshot: null,
  lighthouse: { error: null },
};

describe('Analyze page - render, error, loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders analysis result returned from API', async () => {
    analyzeUrl.mockResolvedValueOnce({ _id: '12345' });
    getAnalysisStatus
      .mockResolvedValueOnce({ status: 'in-progress' })
      .mockResolvedValueOnce({ status: 'completed' });
    getAnalysis.mockResolvedValueOnce(sampleResult);

    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /analyze/i });

    // submit form
    await act(async () => {
      fireEvent.change(input, { target: { value: sampleResult.url } });
      fireEvent.click(button);
    });

    // Advance timers to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // wait for result header
    await waitFor(() =>
      expect(
        screen.getByText(new RegExp(`Results for ${sampleResult.url}`))
      ).toBeInTheDocument()
    );

    // technologies list should show React (may match multiple nodes)
    const techMatches = screen.getAllByText(/React/);
    expect(techMatches.length).toBeGreaterThan(0);

    // SEO checks should show Meta Description Length label
    expect(screen.getByText(/Meta Description Length/i)).toBeInTheDocument();
    expect(
      screen.getByText(String(sampleResult.seo.descriptionLength))
    ).toBeInTheDocument();
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
    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://does-not-matter' } });
      fireEvent.click(button);
    });

    const err = await screen.findByText(/Network error/);
    expect(err).toBeInTheDocument();
  });

  test('shows loading state while analyzing', async () => {
    analyzeUrl.mockResolvedValueOnce({ _id: '12345' });
    getAnalysisStatus.mockResolvedValueOnce({ status: 'in-progress' });

    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /analyze/i });
    await act(async () => {
      fireEvent.change(input, { target: { value: sampleResult.url } });
      fireEvent.click(button);
    });

    // button should show scanning and be disabled
    expect(button).toHaveTextContent(/scanning/i);
    expect(button).toBeDisabled();

    // Advance timers to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    getAnalysisStatus.mockResolvedValueOnce({ status: 'completed' });
    getAnalysis.mockResolvedValueOnce(sampleResult);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() =>
      expect(
        screen.getByText(new RegExp(`Results for ${sampleResult.url}`))
      ).toBeInTheDocument()
    );
  });
});
