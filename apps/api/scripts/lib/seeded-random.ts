/**
 * Deterministic `crypto.getRandomValues` (mulberry32) for offline asserts, so `newId()` and
 * everything keyed on ids repeat run to run. Test-only: never imported by `src/`.
 */
export const seedCryptoRandom = (seed: number): void => {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  Object.defineProperty(globalThis.crypto, "getRandomValues", {
    configurable: true,
    writable: true,
    value: <T extends ArrayBufferView>(arr: T): T => {
      const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
      for (let i = 0; i < bytes.length; i++) bytes[i] = next() & 0xff;
      return arr;
    },
  });
};
