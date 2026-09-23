# Viable Brand Assets

This directory is the canonical repository home for Viable brand artwork used by README surfaces, GitHub metadata, documentation, release materials, and future product-facing presentation.

## Canonical assets

| Asset | Purpose | Notes |
|---|---|---|
| `viable-banner.png` | Primary full-width repository and documentation banner | Use for the root README and other wide presentation surfaces. |
| `viable-banner-compact.png` | Compact horizontal banner | Use where the primary banner is too large or visually dominant. |
| `viable-banner-social-preview.png` | GitHub/social preview asset | Currently a compact-banner derivative. The checked-in file is under 1 MB and is the canonical upload source until a purpose-built social composition replaces it. |
| `viable-icon.png` | Primary dark-background square icon | Canonical product mark for dark or neutral presentation. |
| `viable-icon-light.png` | Light-background icon variant | Use when the primary dark tile would conflict with the surrounding surface. |

## Source-of-truth rule

These files are product-level brand assets. Runtime-specific copies, generated icon sizes, installer artwork, favicons, or platform resources may be derived from them, but those generated copies do not become the canonical brand source.

For the desktop application, platform-specific generated icons belong under `apps/desktop/src-tauri/icons/` or the runtime path required by Tauri. Do not move those generated files back into this directory as competing originals.

## Repository usage

The root README should reference the primary banner with a repository-relative path:

```html
<p align="center">
  <img src="assets/brand/viable-banner.png" alt="Viable — Local Intelligence. Real Opportunities. Tangible Impact.">
</p>
```

GitHub social preview images are uploaded through repository settings, but the exact asset used should remain versioned here so the public metadata can be reproduced.

## Social preview constraint

`viable-banner-social-preview.png` is intentionally kept below GitHub's 1 MB upload limit. If it is replaced, preserve that constraint and verify the final encoded file size rather than assuming dimensions alone determine size.

## Change discipline

When changing the Viable visual identity:

1. update the canonical asset here first;
2. preserve filenames where practical so README and documentation references do not break;
3. regenerate runtime/platform variants from the canonical source;
4. verify the social-preview file remains within GitHub's upload constraints;
5. update this index when a new canonical asset or usage rule is introduced.

Avoid duplicate files named `final`, `new`, `v2`, or similarly optimistic declarations of human confidence. Version control already performs that job more reliably.
