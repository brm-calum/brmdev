import { isOffline } from './network';

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY = 1000;
const MAX_TIMEOUT = 10000; // 10 seconds

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = DEFAULT_MAX_RETRIES,
  initialDelay = DEFAULT_INITIAL_DELAY,
  timeout = MAX_TIMEOUT
): Promise<T> {
  let retries = 0;
  let lastError: Error | null = null;

  while (true) {
    try {
      // Wrap function call with timeout
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]) as T;
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      retries++;

      // Don't retry if we're offline
      if (isOffline()) {
        throw new Error('No internet connection. Please check your connection and try again.');
      }

      // Don't retry if we've hit the limit
      if (retries >= maxRetries) {
        throw new Error(`Request failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
      }

      // Wait with exponential backoff
      const delay = initialDelay * Math.pow(2, retries - 1);
      console.warn(`Retry attempt ${retries}/${maxRetries}. Waiting ${delay}ms before next attempt.`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}