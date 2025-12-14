import { z } from 'zod';

/**
 * A middleware factory that creates a validation middleware for a given Zod schema.
 * It validates the request's query, body, and params.
 *
 * @param {z.ZodObject<any, any, any>} schema - The Zod schema to validate against.
 * @returns {import('express').RequestHandler} An Express middleware function.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    // For non-Zod errors, pass to the global error handler
    next(error);
  }
};