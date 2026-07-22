import { Category } from "../../models/finance";
import {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  updateUserEntity,
  subscribeUserEntities
} from "./entityRepository";

export const createCategory = (
  userId: string,
  category: Category
) => createUserEntity(userId, "categories", category);

export const getCategory = (
  userId: string,
  categoryId: string
) => getUserEntity(userId, "categories", categoryId);

export const listCategories = (
  userId: string
) => listUserEntities(userId, "categories");

export const updateCategory = (
  userId: string,
  categoryId: string,
  updates: Partial<Category>
) => updateUserEntity(userId, "categories", categoryId, updates);

export const deleteCategory = (
  userId: string,
  categoryId: string
) => deleteUserEntity(userId, "categories", categoryId);

export const subscribeToCategories = (
  userId: string,
  onData: (categories: Category[]) => void,
  onError?: (error: Error) => void
) => subscribeUserEntities(userId, "categories", onData, onError);