import type React from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
export type MCIIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const KNOWN_MATERIAL_ICONS = new Set<string>([
  'add',
  'add-location-alt',
  'arrow-back',
  'bar-chart',
  'category',
  'check',
  'directions-car',
  'edit',
  'error-outline',
  'event',
  'expand-less',
  'expand-more',
  'explore-off',
  'grid-view',
  'help-outline',
  'home',
  'inbox',
  'insights',
  'layers',
  'local-hospital',
  'map',
  'my-location',
  'payments',
  'person',
  'place',
  'query-stats',
  'receipt',
  'remove',
  'restaurant',
  'savings',
  'school',
  'settings',
  'shopping-bag',
  'speed',
  'subscriptions',
  'summarize',
  'tips-and-updates',
  'trending-down',
  'trending-up',
  'verified',
]);

export const materialIconName = (icon?: string, fallback: MaterialIconName = 'category'): MaterialIconName =>
  icon && KNOWN_MATERIAL_ICONS.has(icon) ? (icon as MaterialIconName) : fallback;

const KNOWN_MCI_ICONS = new Set<string>([
  'car',
  'cash-plus',
  'cog',
  'food',
  'home',
  'hospital-box',
  'map-marker',
  'school',
  'shopping',
  'television-play',
]);

export const mcIconName = (icon?: string, fallback: MCIIconName = 'food'): MCIIconName =>
  icon && KNOWN_MCI_ICONS.has(icon) ? (icon as MCIIconName) : fallback;
