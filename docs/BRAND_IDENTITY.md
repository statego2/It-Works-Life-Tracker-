# It Works — Official visual identity

The product owner selected the **blue rounded-square archway, ascending illuminated steps, and four-point golden star** image as the official app icon on 2026-11-04.

## Canonical source of truth
- `icons/itworks-brand.jpg` — approved image asset, committed to the repository.
- This image must be used for the iOS home-screen icon and PWA icon. The HTML `apple-touch-icon`, favicon, and `manifest.webmanifest` refer to this asset.
- The existing `icons/icon.svg` is a legacy design and **must not be reused** as the app identity.
- This image is a **brand asset**, not a user's vision-board entry or personal goal.

## Instructions for AI developers
- Reuse the approved visual for app icon, splash/launch artwork and brand-related screens where appropriate; avoid adding it decoratively to the core compact dashboard without a product requirement.
- Do not redraw, replace, recolor, or reinterpret the icon without the owner's approval.
- For future native iOS/Android builds, derive required PNG icon sizes from the canonical asset while preserving the artwork and aspect ratio. Avoid additional masks or padding that would make the image too small.
- If a larger resolution or higher-quality master is needed, request the original user-supplied image; do not upscale a small asset and pretend it is a high-resolution original.
- Preserve this contract in future changes to the manifest, service worker, icon pipeline and app branding.
