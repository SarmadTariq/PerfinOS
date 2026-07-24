import type { User } from '../models/finance';

export interface ProfileDraft {
  name: string;
  phone?: string;
}

export type ProfileField = keyof ProfileDraft;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export interface ProfileValidationResult {
  errors: ProfileErrors;
  update: Partial<Pick<User, 'name' | 'phone'>>;
  isValid: boolean;
}

const PHONE_PATTERN = /^[+0-9()\-\s]+$/;

export function validateProfileDraft(draft: ProfileDraft): ProfileValidationResult {
  const errors: ProfileErrors = {};
  const update: ProfileValidationResult['update'] = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 80) errors.name = 'Name must be 80 characters or fewer.';
  else update.name = name;

  const phone = (draft.phone ?? '').trim();
  if (phone) {
    if (phone.length < 7 || phone.length > 20 || !PHONE_PATTERN.test(phone)) {
      errors.phone = 'Enter a valid phone number.';
    } else update.phone = phone;
  } else {
    update.phone = '';
  }

  return { errors, update, isValid: Object.keys(errors).length === 0 };
}
