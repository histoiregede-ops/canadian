---
name: Professional Messenger
colors:
  surface: '#fafafa'
  surface-dim: '#ede7e0'
  surface-bright: '#fffbfe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f0'
  surface-container: '#f1ebe8'
  surface-container-high: '#ebe5e2'
  surface-container-highest: '#e5dfdc'
  on-surface: '#1c1b1f'
  on-surface-variant: '#49454f'
  inverse-surface: '#313033'
  inverse-on-surface: '#f5eff7'
  outline: '#79747e'
  outline-variant: '#cac7d0'
  surface-tint: '#d97706'
  primary: '#d97706'
  on-primary: '#ffffff'
  primary-container: '#ea8c35'
  on-primary-container: '#fff4e9'
  inverse-primary: '#ffb74d'
  secondary: '#e8944f'
  on-secondary: '#ffffff'
  secondary-container: '#ffe0cc'
  on-secondary-container: '#7f4a23'
  tertiary: '#cc6633'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffdbcc'
  on-tertiary-container: '#663300'
  error: '#b3261e'
  on-error: '#ffffff'
  error-container: '#f9dedc'
  on-error-container: '#410e0b'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb74d'
  on-primary-fixed: '#3a1a00'
  on-primary-fixed-variant: '#754100'
  secondary-fixed: '#ffe0cc'
  secondary-fixed-dim: '#ffb74d'
  on-secondary-fixed: '#3a1a00'
  on-secondary-fixed-variant: '#754100'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb74d'
  on-tertiary-fixed: '#3a1a00'
  on-tertiary-fixed-variant: '#663300'
  background: '#fafafa'
  on-background: '#1c1b1f'
  surface-variant: '#e5dfdc'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  max-width: 1440px
---

## Brand & Style
The brand personality reflects a professional, efficient communication platform optimized for business conversations. Like WhatsApp, the interface prioritizes simplicity and speed, removing friction between intent and action.

The style is **Minimalist & Functional** with an emphasis on conversation-centric design. Orange accents signal action, warmth, and reliability while maintaining corporate professionalism. The interface fades away, allowing the conversation to dominate.

## Colors
The palette uses warm, professional orange tones for interactive elements.

- **Primary Orange (#D97706):** Main brand color for buttons, headers, and key interactive elements.
- **Secondary Orange (#EA8C35):** Lighter variant for hover states and secondary actions.
- **Light Orange (#FFB74D):** For accent elements and active states.
- **Message Distinction:** Outgoing messages use a light orange background (#FFF3E0); incoming messages use white with subtle grey border.
- **Neutral White (#FAFAFA):** Application background, mimicking WhatsApp's clean aesthetic.
- **System States:** Standard reds for errors and warnings.

## Typography
**Inter** is used consistently for legibility and modernity.

- **Headlines:** SemiBold (600) for clear hierarchy.
- **Body:** 16px for desktop conversations, 14px for mobile message text.
- **Labels:** Medium (500) weight for timestamps, names, and metadata.
- **Scaling:** Professional cap at 28px for largest headlines.

## Layout & Spacing
A **WhatsApp-inspired layout** with instant messaging focus.

- **Layout Model:** Single conversation view with sidebar contact list (collapsible on mobile).
- **Spacing:** 8px base unit (4px, 8px, 16px, 24px, 32px).
- **Message Flow:** Outgoing messages right-aligned in light orange; incoming messages left-aligned in white.
- **Input Zone:** Always visible at the bottom with text input + send button (no separate creation form).
- **Mobile:** Full-screen conversation view with contact list as navigation.

## Elevation & Depth
**Minimal shadows** for a clean, WhatsApp-like feel.

- **Level 0 (Floor):** White background (#FAFAFA).
- **Level 1 (Surface):** Message bubbles, conversation items (1px subtle shadow).
- **Level 2 (Navigation):** Header with orange accent (2px shadow).
- **Level 3 (Interactive):** Send button with orange gradient (pronounced shadow on tap).

## Shapes
**Rounded corners** balanced with professional appearance.

- **Message Bubbles:** 8px rounding with no "tail" (square delivery).
- **Input Field:** Pill-shaped (1rem radius) for inviting interaction.
- **Buttons:** Rounded rectangles (0.5rem) for send button; circular avatars (48px).

## Components

- **Message Bubbles:** Outgoing (light orange #FFF3E0 background, right-aligned); Incoming (white #FFFFFF with 1px grey border, left-aligned). Timestamps appear in small grey text bottom-right.
- **Input Field:** Full-width pill-shaped text area at bottom. Send button is compact orange circle on the right.
- **Send Button:** Circular FAB with orange gradient (#D97706 → #EA8C35), white icon, always visible.
- **Contact List:** 48px avatars, contact name (bold), last message preview, timestamp.
- **Header:** Orange background (#D97706), white text, contact name + status.
- **Conversation Auto-Creation:** First message automatically creates a conversation (no pre-creation step).

## UX Flow

1. User clicks "Messaging"
2. Empty state or last conversation displays
3. Input field is immediately visible and focused
4. User types message
5. On send: if no conversation exists, creates one automatically
6. Message appears in chat (right-aligned, light orange)
7. Message stored in database and synced to admin in real-time

This design eliminates friction and matches modern messaging expectations.
