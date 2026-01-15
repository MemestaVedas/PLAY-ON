# Creating Themes for PLAY-ON!

## Quick Start

1. **Copy the template**: `_template.theme.css` → `your-theme.theme.css`
2. **Change the selector**: `[data-theme="new-theme"]` → `[data-theme="your-theme"]`
3. **Edit colors** (mainly Section 3 - Accent Colors)
4. **Import & register** in `index.ts`

## File Structure

```
src/themes/
├── _template.theme.css   # ← Copy this to start
├── default-dark.theme.css
├── light.theme.css
├── your-theme.theme.css  # ← Your new theme
├── index.ts              # ← Register here
└── theme.types.ts        # Type definitions
```

## Essential Colors to Change

| Variable | What it affects |
|----------|-----------------|
| `--theme-accent-primary` | Buttons, active items, main accent |
| `--theme-accent-secondary` | Links, info badges |
| `--theme-accent-tertiary` | Tertiary highlights |
| `--theme-bg-main` | App background |
| `--theme-gradient-primary` | Button gradients |

## Registering Your Theme

```typescript
// In src/themes/index.ts

import './your-theme.theme.css';  // Add import

export const AVAILABLE_THEMES = [
    { id: 'default-dark', name: 'Dark', icon: '🌙' },
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'your-theme', name: 'Your Theme', icon: '🎨' },  // Add entry
];
```

## Theme Examples

### Sakura (Pink)
```css
--theme-accent-primary: #FFB7C5;
--theme-accent-secondary: #FFC0CB;
```

### Ocean (Blue)
```css
--theme-accent-primary: #64B5F6;
--theme-accent-secondary: #4FC3F7;
```

### Forest (Green)
```css
--theme-accent-primary: #81C784;
--theme-accent-secondary: #A5D6A7;
```
