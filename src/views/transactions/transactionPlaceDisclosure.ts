import type {
  ExpenseLocation,
  LocationSource,
} from '../../models/finance';
import { isNoPlaceCompatibilityLocation } from '../../utils/validation';

export type PlaceSelection = {
  latitude: number;
  longitude: number;
  address: string;
  formattedAddress: string;
  name: string;
  neighborhood?: string;
  placeId?: string;
  placeType?: string;
  source?: LocationSource;
};

const NO_PLACE_NAME = 'No place';

export const isNoPlaceLocation =
  isNoPlaceCompatibilityLocation;

export const hasMeaningfulPlace = (
  location?: ExpenseLocation | null
) => Boolean(location && !isNoPlaceLocation(location));

export const initialPlaceDisclosureOpen = (
  mode: 'add' | 'edit',
  location?: ExpenseLocation | null
) => mode === 'edit' && hasMeaningfulPlace(location);

export const toPlaceSelection = (
  location?: ExpenseLocation | null
): PlaceSelection | null => {
  if (!hasMeaningfulPlace(location) || !location) {
    return null;
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address,
    formattedAddress:
      location.formattedAddress ||
      location.address,
    name:
      location.name ||
      location.formattedAddress ||
      location.address,
    neighborhood: location.neighborhood,
    placeId: location.placeId,
    placeType: location.placeType,
    source: location.source,
  };
};

export const shouldSearchPlaceSuggestions = ({
  isDisclosureOpen,
  hasActiveSelection,
  hasEditedQuery,
  query,
}: {
  isDisclosureOpen: boolean;
  hasActiveSelection: boolean;
  hasEditedQuery: boolean;
  query: string;
}) =>
  isDisclosureOpen &&
  !hasActiveSelection &&
  hasEditedQuery &&
  query.trim().length >= 3;

export const limitPlaceSuggestions = <T>(
  suggestions: T[]
) => suggestions.slice(0, 3);

const normalizedPlaceIdentity = (
  location?: ExpenseLocation | PlaceSelection | null
) => {
  if (!location) {
    return '';
  }

  if (
    'source' in location &&
    isNoPlaceLocation(location as ExpenseLocation)
  ) {
    return '';
  }

  return [
    location.placeId || '',
    location.formattedAddress ||
      location.address ||
      '',
    location.name || '',
    String(location.latitude),
    String(location.longitude),
  ]
    .map((value) => value.trim().toLowerCase())
    .join('|');
};

export const hasPlaceChanged = (
  initialLocation: ExpenseLocation | undefined,
  selectedPlace: PlaceSelection | null
) =>
  normalizedPlaceIdentity(initialLocation) !==
  normalizedPlaceIdentity(selectedPlace);

export const toLocationPayload = (
  selectedPlace: PlaceSelection | null
): ExpenseLocation => {
  if (!selectedPlace) {
    return {
      name: NO_PLACE_NAME,
      formattedAddress: '',
      latitude: 0,
      longitude: 0,
      address: '',
      neighborhood: undefined,
      source: 'imported',
    };
  }

  return {
    placeId: selectedPlace.placeId,
    name:
      selectedPlace.name ||
      selectedPlace.formattedAddress ||
      selectedPlace.address,
    formattedAddress:
      selectedPlace.formattedAddress ||
      selectedPlace.address,
    latitude: selectedPlace.latitude,
    longitude: selectedPlace.longitude,
    address:
      selectedPlace.formattedAddress ||
      selectedPlace.address,
    neighborhood:
      selectedPlace.neighborhood ||
      selectedPlace.name,
    source:
      selectedPlace.source ||
      (selectedPlace.placeId
        ? 'google_place'
        : 'current_location'),
    placeType: selectedPlace.placeType,
  };
};
