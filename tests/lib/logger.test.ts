/**
 * Logger Tests
 */
import { Logger } from '@/lib/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('test-service');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should log info messages', () => {
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    logger.error('Test error');
    expect(console.error).toHaveBeenCalled();
  });

  it('should log warnings', () => {
    logger.warn('Test warning');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should create child logger with correlation ID', () => {
    const childLogger = logger.child('correlation-123');
    childLogger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should include metadata in logs', () => {
    logger.info('Test message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
