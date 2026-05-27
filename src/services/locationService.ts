import * as Location from 'expo-location';
import { appConfig } from './configService';

export const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number; address: string; name: string; formattedAddress: string }> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    const address = await reverseGeocode(latitude, longitude);

    return { latitude, longitude, address, name: address || 'Current location', formattedAddress: address };
  } catch (error) {
    throw new Error('Failed to get current location');
  }
};

const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (reverseGeocode.length > 0) {
      const { street, city, region, country } = reverseGeocode[0];
      return `${street || ''} ${city || ''} ${region || ''} ${country || ''}`.trim();
    }
    return 'Unknown location';
  } catch (error) {
    return 'Unknown location';
  }
};

export const geocodeLocation = async (address: string): Promise<{ latitude: number; longitude: number; address: string } | null> => {
  try {
    const geocoded = await Location.geocodeAsync(address);
    if (geocoded.length > 0) {
      const { latitude, longitude } = geocoded[0];
      const humanAddress = await reverseGeocode(latitude, longitude);
      return { latitude, longitude, address: humanAddress };
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const getLocationSuggestions = async (query: string): Promise<Array<{ latitude: number; longitude: number; address: string; name: string; formattedAddress: string; placeId?: string; placeType?: string }>> => {
  if (!query.trim()) return [];

  if (appConfig.apiBaseUrl) {
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/places/search?query=${encodeURIComponent(query.trim())}`);
      if (response.ok) return await response.json();
    } catch {
      return [];
    }
  }
  
  try {
    const results = await Location.geocodeAsync(query);
    const suggestions: Array<{ latitude: number; longitude: number; address: string; name: string; formattedAddress: string }> = [];
    
    for (const result of results.slice(0, 5)) {
      const { latitude, longitude } = result;
      const address = await reverseGeocode(latitude, longitude);
      suggestions.push({ latitude, longitude, address, name: address.split(',')[0] || address, formattedAddress: address });
    }
    
    return suggestions;
  } catch (error) {
    return [];
  }
};
