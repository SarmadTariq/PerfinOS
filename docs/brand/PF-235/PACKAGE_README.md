# PerFin OS PF-235 App Icon Assets

This package contains the approved Personal Ledger Loop app-icon family.

## Canonical rules

- Exactly two ledger slits
- One central circular point
- One rounded blue terminal
- One shared geometry across dark, light, monochrome, adaptive, splash, favicon, and notification variants
- No added symbols, gradients, arrows, charts, or feature-specific modifications

## Repo placement

Copy the files from `assets/` into the repository `assets/` directory.

Primary mappings:

- `assets/icon.png` → Expo `icon`
- `assets/adaptive-icon.png` → Android adaptive foreground on dark background
- `assets/adaptive-icon-monochrome.png` → Android themed monochrome icon
- `assets/favicon.png` → Expo web favicon
- `assets/splash-icon.png` → dark splash-screen symbol
- `assets/notification-icon.png` → Android notification artwork

Optional light variants are included but should not replace the primary dark icon unless the product decision changes.

The files under `src/assets/brand/` are consumed by the in-app brand components.

## Scope boundary

The original PF-235 asset package does not include wordmarks, horizontal logos, stacked logos, design-system tokens, or component code.
