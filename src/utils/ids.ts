export const createClientEntityId = (
  prefix: string
): string => {
  const randomId =
    globalThis.crypto
      ?.randomUUID?.();

  return `${prefix}-${
    randomId ??
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`
  }`;
};
