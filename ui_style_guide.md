# UI Style & Design Guide

This document provides a detailed breakdown of the UI design aesthetic, color palette, typography, and component structure used in this project. You can provide this to another LLM to perfectly replicate the style in another codebase.

## 1. Core Philosophy

The design scheme follows a modern, clean, **Tailwind-based** Utility-first aesthetic. It heavily relies on:

- **Subtle borders** to define sections rather than heavy drop shadows.
- **Surface colors** to differentiate nested areas from the main background.
- **Soft rounded corners** and minimal, smooth transitions for interactive elements.
- **Native dark mode support** mapped consistently to CSS variables.

## 2. Color Palette & Theming (CSS Variables & Tailwind)

The styling heavily leverages CSS custom properties connected to Tailwind configuration, making dark mode transitions seamless.

### Base Colors (Tailwind Config)

- **`primary`**: `#6366f1` (Indigo 500)
- **`primary-hover`**: `#4f46e5` (Indigo 600)
- **`secondary`**: `#333333` (Dark Gray)
- **`secondary-hover`**: `#444444`
- **`accent`**: `#818cf8` (Indigo 400)
- **Selection Highlight**: `rgb(37 99 235)` (Blue 600)

### Theme Tokens (Light Mode - Default)

- **`background`**: `#ffffff` (White - Pure white for main areas)
- **`surface`**: `#f8fafc` (Slate 50 - Used for sidebars, headers, less prominent content)
- **[text](file:///Users/michelebanfi/code/research/frontend/src/components/ChatTab.tsx#600-657)**: `#1e293b` (Slate 800 - Deep slate for readability, avoiding pure black)
- **`muted`**: `#64748b` (Slate 500 - For secondary text and icons)
- **`border`**: `#e2e8f0` (Slate 200 - Soft dividers)

### Theme Tokens (Dark Mode)

- **`background`**: `#0f172a` (Slate 900 - Deep, rich slate rather than harsh black)
- **`surface`**: `#1e293b` (Slate 800 - Slightly elevated elements)
- **[text](file:///Users/michelebanfi/code/research/frontend/src/components/ChatTab.tsx#600-657)**: `#f1f5f9` (Slate 50 - Crisp off-white)
- **`muted`**: `#94a3b8` (Slate 400 - Subdued for secondary information)
- **`border`**: `#334155` (Slate 700 - Distinct but subtle dividers)

## 3. Typography

- **Primary Font**: `Inter`, falling back to standard system fonts (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Base Line Height**: `1.5`
- **Weight**: Base text is `400`. Headings generally go up to `600` (semibold) or `700` (bold).
- Custom tweaks apply to markdown/rendered text, with sizes like `1.5rem` for H1, `1.25rem` for H2, and standard margins.
- **Font Smoothing**: `-webkit-font-smoothing: antialiased` applied globally for crisper text.

## 4. Layouts & Structure

- **Overall Container**: A standard desktop dashboard layout using `flex h-screen overflow-hidden` with a fixed sidebar (`w-72`) and a fluid main content area (`flex-1`).
- **Headers/Action Bars**: Typically `px-4 py-2 border-b border-border flex items-center justify-between` to create clean segmentation.
- **Scrollbars**: Custom styled to match the theme. Thumb is `#cbd5e1` in light mode (hover `#94a3b8`) and `#475569` in dark mode (hover `#64748b`). Background track matches `var(--color-surface)`.

## 5. Components & Interactive Elements

### Buttons

- **Shape**: Primarily `rounded-lg` for standard buttons, giving a friendly but structured feel. Small icon buttons sometimes use `rounded`.
- **Primary Action (Secondary Color usually mapped for main actions)**: `bg-secondary text-white hover:bg-secondary-hover shadow-sm transition-all`.
- **Ghost/Icon Buttons**: `hover:bg-slate-100 dark:hover:bg-muted/20 transition-colors`. This translates to a soft gray hover effect that disappears politely.
- **Focus States**: Accessible focus rings customized to `outline: 2px solid #6366f1; outline-offset: 2px`.

### Cards, Modals, and Panels

- **Container Styling**: Often `bg-background rounded-lg border border-border shadow-sm`.
- **Active Selection List Items**: When an item in a list (like a chat or project) is selected, it uses:
  `bg-secondary/10 text-secondary border border-secondary/20`.
- **Hover on List Items**: Unselected items use `hover:bg-slate-100 dark:hover:bg-muted/10 border border-transparent`.

### Inputs & Textareas

- **Styling**: `px-4 py-2.5 bg-background border border-border rounded-lg shadow-sm`.
- **Focus State**: `focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20` (providing a soft outer glow of the secondary color).

### Icons

- **Library**: `lucide-react` forms the icon foundation.
- **Sizing**: Typically 16px to 20px (`size={16}`) sitting inline with text, separated by `gap-2` in flex boxes.
- **Color**: Often inherits text color, or specific meaning colors (`text-muted`, `text-emerald-500`, `text-red-400`).
