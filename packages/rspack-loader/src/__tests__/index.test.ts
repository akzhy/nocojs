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

describe('@nocojs/rspack-loader', () => {
  it('should export a function', () => {
    expect(typeof loader).toBe('function');
  });

  it('should handle async transformation', async () => {
    const mockCallback = vi.fn();
    const mockContext = {
      async: () => mockCallback,
      getOptions: () => ({}),
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

  it('should handle Vue files with logging', async () => {
    const mockCallback = vi.fn();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockContext = {
      async: () => mockCallback,
      getOptions: () => ({}),
      resourcePath: '/test/file.vue',
      rootContext: '/test'
    };

    loader.call(mockContext as any, '<template><div>test</div></template>');
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(consoleSpy).toHaveBeenCalledWith('Processing file: /test/file.vue');
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      'transformed code',
      { version: 3, sources: [], mappings: '' }
    );

    consoleSpy.mockRestore();
  });

  it('should handle transformation errors', async () => {
    const { transform } = await import('@nocojs/core');
    vi.mocked(transform).mockRejectedValueOnce(new Error('Transform failed'));

    const mockCallback = vi.fn();
    const mockContext = {
      async: () => mockCallback,
      getOptions: () => ({}),
      resourcePath: '/test/file.js',
      rootContext: '/test'
    };

    loader.call(mockContext as any, 'test source code');
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockCallback).toHaveBeenCalledWith(
      expect.any(Error),
      'test source code',
      undefined
    );
  });
});
