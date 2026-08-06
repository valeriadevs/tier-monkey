import { Buffer } from 'node:buffer';

// Polyfill FileReader for Node so FileReader-based encoding works in tests.
if (typeof (globalThis as Record<string, unknown>).FileReader === 'undefined') {
  (globalThis as Record<string, unknown>).FileReader = class FileReader {
    result: string | null = null;
    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    private error: unknown = null;

    readAsDataURL(blob: Blob): void {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
          this.onload?.(new Event('load'));
        })
        .catch((err) => {
          this.error = err;
          this.onerror?.(new Event('error'));
        });
    }

    getError(): unknown {
      return this.error;
    }
  };
}
