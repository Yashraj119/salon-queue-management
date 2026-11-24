import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export function isValidStaffPin(candidate: unknown): candidate is string {
  if (typeof candidate !== 'string') return false;
  const expectedPin = process.env.STAFF_PIN || '1234';
  const expected = Buffer.from(expectedPin);
  const provided = Buffer.from(candidate);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export const requireStaffPin: RequestHandler = (request, response, next) => {
  const provided = request.header('X-Staff-Pin');
  if (!isValidStaffPin(provided)) {
    response.status(401).json({ error: 'staff_pin_invalid' });
    return;
  }
  next();
};
