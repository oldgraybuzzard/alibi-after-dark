---
name: frontend-design
description: "Create distinctive, production-grade frontend interfaces. Use when building or styling web pages, components, dashboards, applications, landing pages, games, or other user-facing UI in React, Next.js, HTML, CSS, or Tailwind. Produces polished, intentional code that avoids generic AI aesthetics."
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the audience, purpose, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these for inspiration but design one that is true to the context.
- **Constraints**: Technical requirements such as framework, performance, and accessibility.
- **Differentiation**: What makes this UNFORGETTABLE? What is the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work; the key is intentionality, not intensity.

Then implement working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use a motion library in React when one is already available. Focus on high-impact moments: one well-orchestrated page-load with staggered reveals creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space or controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic, such as gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should look the same. Vary between light and dark themes, different fonts, and different aesthetics. Do not converge on common choices across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: the agent is capable of extraordinary creative work. Do not hold back; show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Build With Empathy

- If working with an existing design or framework, study its conventions first and extend the established visual language.
- Design for the actual audience and repeated workflows. Operational tools should be quiet, dense, and scannable; games and expressive experiences can be more theatrical.
- Make common workflows ergonomic and complete, including loading, empty, success, error, disabled, and permission-denied states.
- Write concise interface copy. Do not use visible text to explain styling, implementation, keyboard shortcuts, or obvious controls.

## Interaction And Layout Rules

- Use icons for tools, swatches for color, segmented controls for modes, toggles or checkboxes for binary settings, sliders or numeric inputs for values, menus for option sets, and tabs for views.
- Prefer familiar symbols over rounded text pills when a standard icon communicates the action. Use Lucide icons when available and add tooltips or accessible names for unfamiliar icon-only controls.
- Keep cards at an 8px radius or less unless the existing design system specifies otherwise. Do not nest cards or turn every section into a floating panel.
- Keep fixed-format controls stable with explicit dimensions, grid tracks, aspect ratios, or min/max constraints so content and hover states do not shift layout.
- Do not scale font size continuously with viewport width. Use stable type sizes and breakpoint overrides.
- Ensure text wraps inside its container and never overlaps adjacent content. Test long labels and narrow screens.
- Use visual assets when the experience depends on a product, place, person, object, or game world. Show the real subject clearly rather than relying on vague atmospheric imagery.
- Respect `prefers-reduced-motion`; motion must clarify hierarchy or state and must not block interaction.

## React And Next.js

- Follow the repository's installed framework version and local documentation. For Next.js, inspect `node_modules/next/dist/docs/` before relying on remembered APIs.
- Prefer Server Components in the App Router. Add `"use client"` only at the narrow interactive boundary that needs browser state, event handlers, or client hooks.
- Use Server Actions for trusted mutations when they match the existing architecture. Validate all `FormData` values and derive identity or ownership on the server.
- In Next.js 16 App Router pages, treat `params` and `searchParams` as promises and await them.
- Use `next/image` for raster images when optimization is useful. Supply meaningful `alt`, explicit dimensions or `fill`, and an accurate `sizes` value.
- Keep secrets, private records, and answer keys out of Client Components and serialized props. Project server data into the minimum player-facing or user-facing view.
- Prefer native React state and form primitives. Use `useFormStatus` for form pending feedback and add `useDeferredValue`, `startTransition`, or `useEffectEvent` only when the interaction benefits from them.
- Do not add `useMemo` or `useCallback` by default. Follow the repository's React Compiler conventions.

```tsx
"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SearchButton() {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} disabled={pending} type="submit">
      {pending ? <LoaderCircle aria-hidden="true" className="spin" /> : <Search aria-hidden="true" />}
      <span>{pending ? "Searching" : "Search records"}</span>
    </button>
  );
}
```

## Tailwind And CSS

- Reuse the repository's tokens, utilities, layers, and component conventions before introducing new abstractions.
- Define a small set of semantic CSS custom properties for color, spacing, borders, and shadows. Name tokens by purpose rather than raw hue.
- With Tailwind, build mobile-first, group related utilities consistently, and extract a component only when repetition or complexity warrants it.
- Avoid long runs of arbitrary values that conceal the visual system. Promote repeated values into theme tokens or CSS variables.
- Use Grid for two-dimensional composition and Flexbox for one-dimensional alignment. Prefer `minmax(0, 1fr)` where content could otherwise force overflow.
- Avoid broad transitions such as `transition-all`; transition only properties that should animate.
- Preserve visible focus states and ensure hover is never the only way to reveal required information.

```css
:root {
  --surface: #f7f3ea;
  --ink: #191816;
  --accent: #a33b2d;
  --line: #d3ccc0;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  border: 1px solid var(--line);
  background: var(--line);
}

@media (max-width: 48rem) {
  .record-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility

- Start with semantic HTML and a logical heading hierarchy. Use ARIA only when native semantics are insufficient.
- Every control needs an accessible name. Decorative icons use `aria-hidden="true"`; informative images use useful alternative text.
- Support keyboard navigation, visible focus, logical tab order, and escape behavior for dismissible overlays.
- Maintain WCAG AA contrast for text and meaningful controls. Do not encode status with color alone.
- Announce asynchronous errors and status changes with appropriate live regions, and move focus when opening modal or route-level error experiences when needed.
- Keep touch targets at least 44 by 44 CSS pixels where practical.

## Responsive Design

- Design and test from narrow mobile through wide desktop; do not treat mobile as a scaled-down desktop.
- Establish stable responsive constraints for boards, toolbars, tables, media, and fixed-format controls.
- Check horizontal overflow at representative widths such as 390px, 768px, 1440px, and a wide desktop viewport.
- Reflow dense controls, tables, and split layouts deliberately. Do not hide essential actions merely to make a screenshot fit.
- Ensure primary content leaves a hint of the next section visible when creating a landing-page hero.

## Validation Checklist

Before finishing:

1. Run the repository's focused tests, typecheck, lint, and production build.
2. Start the real development server when the experience requires one.
3. Use Playwright to inspect desktop and mobile viewports, assert there is no horizontal overflow, and capture screenshots of the changed states.
4. Exercise loading, empty, error, disabled, and success states where applicable.
5. Verify images, fonts, icons, and network-backed content render without console errors.
6. Confirm keyboard access, focus visibility, accessible names, reduced motion, and color contrast.
7. For canvas or 3D work, verify nonblank rendered pixels, framing, resize behavior, and interaction at desktop and mobile sizes.