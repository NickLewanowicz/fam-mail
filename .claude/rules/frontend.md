---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
  - "frontend/**/*.css"
---

# Frontend rules — fam-mail

## Stack

- **React 18**, **Vite**, **React Router v7**
- **Tailwind CSS** + **DaisyUI 5** — prefer Daisy components over bespoke form markup
- **Controlled inputs** in the postcard wizard (this codebase does not use react-hook-form)

## Layout conventions

- **Pages**: `frontend/src/pages/` (e.g. dashboard, create flow)
- **Wizard steps**: `frontend/src/components/wizard/` (`PhotoStep`, `MessageStep`, `AddressStep`, `ReviewStep`, etc.)
- **Postcard preview / flip UI**: `frontend/src/components/postcard/` (e.g. `PostcardPreview`)

## Patterns

- Keep step components **self-contained**; share state via props or small context modules already used in the feature.
- Match existing **spacing, typography, and DaisyUI** patterns before introducing new primitives.
- When adding visual polish, verify **accessibility** (labels, focus order, contrast) in code or tests.
