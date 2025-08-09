import { describe, it, expect, vi } from 'vitest';
import loader from '../index';

// Mock the @nocojs/core module
vi.mock('@nocojs/core', () => ({
  transform: vi.fn().mockResolvedValue({
    code: 'transformed code',
    map: '{"version":3,"sources":[],"mappings":""}',
    logs: []
  })
}));

// Mock loader-utils
vi.mock('loader-utils', () => ({
  getOptions: vi.fn().mockReturnValue({})
}));

describe('@nocojs/webpack-loader', () => {
  it('should export a function', () => {
    expect(typeof loader).toBe('function');
  });

  it('should handle async transformation', async () => {
    const mockCallback = vi.fn();
    const mockContext = {
      async: () => mockCallback,
      resourcePath: '/test/file.js',
      rootContext: '/test'
    };

    loader.call(mockContext as any, 'test source code');
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      'transformed code',
      { version: 3, sources: [], mappings: '' }
    );
  });
});
