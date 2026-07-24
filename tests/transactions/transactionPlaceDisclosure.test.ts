import {
  describe,
  expect,
  it,
} from 'vitest';
import type { ExpenseLocation } from '../../src/models/finance';
import {
  validateLocation,
  validateTransactionInput,
} from '../../src/utils/validation';
import {
  hasMeaningfulPlace,
  hasPlaceChanged,
  initialPlaceDisclosureOpen,
  isNoPlaceLocation,
  limitPlaceSuggestions,
  shouldSearchPlaceSuggestions,
  toLocationPayload,
  toPlaceSelection,
} from '../../src/views/transactions/transactionPlaceDisclosure';

const savedPlace: ExpenseLocation = {
  placeId: 'place-1',
  name: 'Market',
  formattedAddress: '1 Main Street',
  latitude: 43.65,
  longitude: -79.38,
  address: '1 Main Street',
  neighborhood: 'Downtown',
  source: 'google_place',
  placeType: 'store',
};

const noPlace: ExpenseLocation = {
  name: 'No place',
  formattedAddress: '',
  latitude: 0,
  longitude: 0,
  address: '',
  neighborhood: undefined,
  source: 'imported',
};

describe('Transaction Place disclosure', () => {
  it('keeps Add collapsed and opens Edit only for a meaningful saved place', () => {
    expect(
      initialPlaceDisclosureOpen(
        'add',
        savedPlace
      )
    ).toBe(false);
    expect(
      initialPlaceDisclosureOpen(
        'edit',
        savedPlace
      )
    ).toBe(true);
    expect(
      initialPlaceDisclosureOpen(
        'edit',
        noPlace
      )
    ).toBe(false);
  });

  it('recognizes the exact No place compatibility record', () => {
    expect(isNoPlaceLocation(noPlace)).toBe(true);
    expect(hasMeaningfulPlace(noPlace)).toBe(false);
    expect(hasMeaningfulPlace(savedPlace)).toBe(true);
  });

  it('converts only meaningful saved locations into selections', () => {
    expect(toPlaceSelection(noPlace)).toBeNull();
    expect(toPlaceSelection(savedPlace)).toEqual({
      latitude: 43.65,
      longitude: -79.38,
      address: '1 Main Street',
      formattedAddress: '1 Main Street',
      name: 'Market',
      neighborhood: 'Downtown',
      placeId: 'place-1',
      placeType: 'store',
      source: 'google_place',
    });
  });

  it.each([
    {
      reason: 'collapsed disclosure',
      isDisclosureOpen: false,
      hasActiveSelection: false,
      hasEditedQuery: true,
      query: 'Market',
    },
    {
      reason: 'query shorter than three characters',
      isDisclosureOpen: true,
      hasActiveSelection: false,
      hasEditedQuery: true,
      query: 'Ma',
    },
    {
      reason: 'active selection',
      isDisclosureOpen: true,
      hasActiveSelection: true,
      hasEditedQuery: true,
      query: 'Market',
    },
    {
      reason: 'prefilled query not edited',
      isDisclosureOpen: true,
      hasActiveSelection: false,
      hasEditedQuery: false,
      query: 'Market',
    },
  ])(
    'blocks search for $reason',
    ({
      isDisclosureOpen,
      hasActiveSelection,
      hasEditedQuery,
      query,
    }) => {
      expect(
        shouldSearchPlaceSuggestions({
          isDisclosureOpen,
          hasActiveSelection,
          hasEditedQuery,
          query,
        })
      ).toBe(false);
    }
  );

  it('allows search after an explicit edit with at least three characters', () => {
    expect(
      shouldSearchPlaceSuggestions({
        isDisclosureOpen: true,
        hasActiveSelection: false,
        hasEditedQuery: true,
        query: '  Mar ',
      })
    ).toBe(true);
  });

  it('limits visible suggestions to three', () => {
    expect(
      limitPlaceSuggestions([
        1,
        2,
        3,
        4,
        5,
      ])
    ).toEqual([
      1,
      2,
      3,
    ]);
  });

  it('does not mark compatible empty Place state as changed', () => {
    expect(
      hasPlaceChanged(
        noPlace,
        null
      )
    ).toBe(false);
    expect(
      hasPlaceChanged(
        undefined,
        null
      )
    ).toBe(false);
  });

  it('does not mark an unchanged meaningful Place as changed', () => {
    expect(
      hasPlaceChanged(
        savedPlace,
        toPlaceSelection(savedPlace)
      )
    ).toBe(false);
  });

  it('marks selecting, replacing, and removing a meaningful Place as changed', () => {
    const selection =
      toPlaceSelection(savedPlace);

    expect(
      hasPlaceChanged(
        undefined,
        selection
      )
    ).toBe(true);
    expect(
      hasPlaceChanged(
        savedPlace,
        null
      )
    ).toBe(true);
    expect(
      hasPlaceChanged(
        {
          ...savedPlace,
          placeId: 'place-2',
        },
        selection
      )
    ).toBe(true);
  });

  it('preserves the compatibility payload when no Place is selected', () => {
    expect(
      toLocationPayload(null)
    ).toEqual(noPlace);
  });

  it('accepts the No place compatibility payload at the transaction validation boundary', () => {
    expect(() =>
      validateLocation(noPlace)
    ).not.toThrow();

    expect(() =>
      validateTransactionInput({
        type: 'expense',
        amount: 12.34,
        categoryId: 'category-1',
        categoryName: 'Food & Dining',
        merchant: 'Market',
        date: '2026-07-23',
        notes: '',
        location: noPlace,
        paymentMethod: 'Debit card',
        isRecurring: false,
        receipts: [],
      })
    ).not.toThrow();
  });

  it('does not treat other empty locations as the compatibility payload', () => {
    expect(() =>
      validateLocation({
        ...noPlace,
        name: 'Unknown place',
      })
    ).toThrow(
      'Location address is required'
    );
  });

  it('preserves a selected Place source and location fields', () => {
    expect(
      toLocationPayload(
        toPlaceSelection(savedPlace)
      )
    ).toEqual(savedPlace);
  });

  it('infers the existing source fallback for new Place results', () => {
    expect(
      toLocationPayload({
        ...toPlaceSelection(savedPlace)!,
        source: undefined,
      }).source
    ).toBe('google_place');

    expect(
      toLocationPayload({
        ...toPlaceSelection(savedPlace)!,
        placeId: undefined,
        source: undefined,
      }).source
    ).toBe('current_location');
  });
});
