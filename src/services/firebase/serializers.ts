import type {
  UserEntityCollectionKey,
  UserEntityForCollection,
  UserSingletonForKey,
  UserSingletonKey,
} from './schema';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export const toJsonSafeValue = <TValue>(value: TValue): TValue =>
  JSON.parse(JSON.stringify(value)) as TValue;

export const fromJsonSafeValue = <TValue>(value: unknown): TValue =>
  value as TValue;

export const serializeUserEntity = <TCollection extends UserEntityCollectionKey>(
  entity: UserEntityForCollection<TCollection>
): UserEntityForCollection<TCollection> => toJsonSafeValue(entity);

export const deserializeUserEntity = <TCollection extends UserEntityCollectionKey>(
  value: unknown
): UserEntityForCollection<TCollection> =>
  fromJsonSafeValue<UserEntityForCollection<TCollection>>(value);

export const serializeUserEntities = <TCollection extends UserEntityCollectionKey>(
  entities: UserEntityForCollection<TCollection>[]
): UserEntityForCollection<TCollection>[] =>
  entities.map((entity) => serializeUserEntity<TCollection>(entity));

export const deserializeUserEntities = <TCollection extends UserEntityCollectionKey>(
  values: unknown[]
): UserEntityForCollection<TCollection>[] =>
  values.map((value) => deserializeUserEntity<TCollection>(value));

export const serializeUserSingleton = <TSingleton extends UserSingletonKey>(
  _singletonKey: TSingleton,
  value: UserSingletonForKey<TSingleton>
): UserSingletonForKey<TSingleton> => toJsonSafeValue(value);

export const deserializeUserSingleton = <TSingleton extends UserSingletonKey>(
  _singletonKey: TSingleton,
  value: unknown
): UserSingletonForKey<TSingleton> =>
  fromJsonSafeValue<UserSingletonForKey<TSingleton>>(value);
