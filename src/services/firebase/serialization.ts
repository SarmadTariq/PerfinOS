export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const removeUndefinedValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (result, [key, entry]) => {
        if (entry !== undefined) {
          result[key] = removeUndefinedValues(entry);
        }

        return result;
      },
      {}
    );
  }

  return value;
};

export const serializeForFirestore = <T>(value: T): T => {
  const withoutUndefined = removeUndefinedValues(value);
  return JSON.parse(JSON.stringify(withoutUndefined)) as T;
};

export const serializeEntityForFirestore = <T>(entity: T): T =>
  serializeForFirestore(entity);

export const serializeEntitiesForFirestore = <T>(entities: T[]): T[] =>
  entities.map(serializeEntityForFirestore);

export const serializeNullableForFirestore = <T>(value: T | null | undefined): T | null =>
  value == null ? null : serializeForFirestore(value);

export const createFirestoreWritePayload = <T>(
  value: T,
  extra?: Record<string, JsonValue>
): T & Record<string, JsonValue> => ({
  ...(serializeForFirestore(value) as T),
  ...(extra || {}),
});
