/**
 * Visual testing configuration
 * Defines viewports and screenshot options
 */

export const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  desktop: { width: 1200, height: 800, name: 'desktop' },
  widescreen: { width: 1920, height: 1080, name: 'widescreen' },
} as const;

export const SCREENSHOT_OPTIONS = {
  fullPage: true,
  animations: 'disabled',
  caret: 'hide',
} as const;

export const COMPONENT_STATES = {
  form: {
    empty: 'empty-form',
    filled: 'filled-form',
    error: 'error-validation',
    success: 'success-state',
  },
  ui: {
    default: 'default',
    hover: 'hover',
    focus: 'focus',
    disabled: 'disabled',
  },
} as const;

export const STORYBOOK_CATEGORIES = [
  'components',
  'forms',
  'layout',
  'ui',
  'examples',
] as const;