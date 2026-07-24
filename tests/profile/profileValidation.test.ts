import { describe, expect, it } from 'vitest';
import { validateProfileDraft } from '../../src/profile';

const valid = {
  name: ' Yash Kanadhia ',
  phone: '+1 (416) 555-0100',
};

describe('PF-200 profile validation', () => {
  it('normalizes a valid draft without coercing presentation strings', () => {
    const result = validateProfileDraft(valid);
    expect(result).toEqual({
      errors: {},
      isValid: true,
      update: {
        name: 'Yash Kanadhia',
        phone: '+1 (416) 555-0100',
      },
    });
  });

  it('reports field-level errors and leaves invalid fields out of the payload', () => {
    const result = validateProfileDraft({
      name: ' '.repeat(81),
      phone: 'abc',
    });
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual([
      'name', 'phone',
    ]);
    expect(result.update).toEqual({});
  });

  it('accepts a blank optional phone and clears it in the payload', () => {
    expect(validateProfileDraft({ ...valid, phone: ' ' })).toEqual({
      errors: {},
      isValid: true,
      update: {
        name: 'Yash Kanadhia',
        phone: '',
      },
    });
  });
});
