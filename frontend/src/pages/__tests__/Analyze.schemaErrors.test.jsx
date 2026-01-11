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

const sampleWithSchemaErrors = {
  _id: '12345',
  url: 'https://example.com',
  title: 'Example',
  description: 'desc',
  h1: 'H1',
  technologies: [],
  metrics: {},
  accessibility: { violations: [] },
  seo: {
    descriptionLength: 10,
    hasH1: true,
    wordCount: 100,
    robotsTxtStatus: 'found',
    canonical: { resolved: 'https://example.com' },
    jsonLd: {
      count: 2,
      parsed: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          image: '/p.jpg',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Recipe',
          name: 'Pancakes',
          recipeIngredient: ['a'],
        },
      ],
      errors: [],
      schemaValidation: [
        {
          index: 0,
          matches: ['Product'],
          errors: [
            {
              type: 'Product',
              errors: [
                {
                  instancePath: '/name',
                  message: "must have required property 'name'",
                  keyword: 'required',
                },
              ],
            },
          ],
        },
        {
          index: 1,
          matches: ['Recipe'],
          errors: [],
        },
      ],
    },
  },
  screenshot: null,
  lighthouse: { error: null },
};

describe('Analyze page - JSON-LD AJV error rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders formatted AJV validation errors for JSON-LD blocks', async () => {
    analyzeUrl.mockResolvedValueOnce({ _id: '12345' });
    getAnalysisStatus
      .mockResolvedValueOnce({ status: 'in-progress' })
      .mockResolvedValueOnce({ status: 'completed' });
    getAnalysis.mockResolvedValueOnce(sampleWithSchemaErrors);

    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /analyze/i });

    await act(async () => {
      fireEvent.change(input, {
        target: { value: sampleWithSchemaErrors.url },
      });
      fireEvent.click(button);
    });

    // Advance timers to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // Wait for results section
    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(`Results for ${sampleWithSchemaErrors.url}`)
        )
      ).toBeInTheDocument()
    );

    // JSON-LD Schema Validation header should be present
    expect(screen.getByText(/JSON-LD Schema Validation/i)).toBeInTheDocument();

    // The formatted Type label for Product should appear
    expect(screen.getByText(/Type:\s*Product/)).toBeInTheDocument();

    // The AJV error details should show the instancePath and message and keyword
    expect(screen.getByText(/path: \/name/)).toBeInTheDocument();
    expect(
      screen.getByText(/must have required property 'name'/)
    ).toBeInTheDocument();
    expect(screen.getByText(/keyword: required/)).toBeInTheDocument();
  });
});
