/**
 * FPL API Error Detection & Message Utility (K-61)
 *
 * Provides specific, helpful error messages for different FPL API failure scenarios.
 * Instead of generic "Unable to load league" messages, users get context about what went wrong.
 */

export type FPLErrorType =
  | 'fpl_updating'
  | 'invalid_league'
  | 'classic_league'
  | 'rate_limited'
  | 'network_error'
  | 'sync_stuck'
  | 'timeout'
  | 'unknown';

export interface FPLError {
  type: FPLErrorType;
  message: string;
  icon: string;
  retryable: boolean;
}

export const FPL_ERRORS: Record<FPLErrorType, FPLError> = {
  fpl_updating: {
    type: 'fpl_updating',
    message: 'FPL is updating. Please try again in a few minutes.',
    icon: '⏳',
    retryable: true,
  },
  invalid_league: {
    type: 'invalid_league',
    message: 'League not found. Please check the ID.',
    icon: '❌',
    retryable: false,
  },
  classic_league: {
    type: 'classic_league',
    message: 'This is a Classic league. Only H2H leagues are supported.',
    icon: '⚠️',
    retryable: false,
  },
  rate_limited: {
    type: 'rate_limited',
    message: 'Too many requests. Please wait a moment.',
    icon: '⏱️',
    retryable: true,
  },
  network_error: {
    type: 'network_error',
    message: 'Network error. Please check your connection.',
    icon: '🌐',
    retryable: true,
  },
  sync_stuck: {
    type: 'sync_stuck',
    message: 'Sync appears stuck. Try Force Reset in Settings.',
    icon: '🔄',
    retryable: false,
  },
  timeout: {
    type: 'timeout',
    message: 'Request timed out. FPL may be slow - try again.',
    icon: '⏰',
    retryable: true,
  },
  unknown: {
    type: 'unknown',
    message: 'Unable to load league. Please try again.',
    icon: '❌',
    retryable: true,
  },
};

/**
 * Detect FPL error type from HTTP status code or error object
 *
 * @param error - Error object (optional)
 * @param statusCode - HTTP status code (optional)
 * @returns FPLError with specific message and metadata
 */
export function detectFPLError(error: any, statusCode?: number): FPLError {
  // HTTP status code detection
  if (statusCode === 503) return FPL_ERRORS.fpl_updating;
  if (statusCode === 429) return FPL_ERRORS.rate_limited;
  if (statusCode === 404) return FPL_ERRORS.invalid_league;

  // Error message detection
  if (error?.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('fetch') || msg.includes('econnrefused')) return FPL_ERRORS.network_error;
    if (msg.includes('timeout') || msg.includes('etimedout')) return FPL_ERRORS.timeout;
    if (msg.includes('classic')) return FPL_ERRORS.classic_league;
  }

  // Error name detection
  if (error?.name === 'AbortError') return FPL_ERRORS.timeout;
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) return FPL_ERRORS.network_error;

  return FPL_ERRORS.unknown;
}
