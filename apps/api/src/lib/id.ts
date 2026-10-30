const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

/** Opaque text PK (nanoid-style) for D1 rows. */
export const newId = (size = 21): string => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i]! % 64]!;
  }
  return id;
};
