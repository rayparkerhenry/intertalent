# Admin UI style guide

## How to use this guide

When building new admin pages or components:

1. Follow every pattern in this document exactly
2. Do not introduce new Tailwind color classes not already listed here
3. Do not introduce new border radius values not already listed here
4. Reuse existing button variants — do not create new button styles
5. All modals follow the same overlay and panel pattern defined in section 8
6. All cards follow the pattern in section 4
7. All form fields follow section 6
8. Reference this file in every admin UI prompt

---

This document records **only** Tailwind classes and patterns found in these files:

- `src/components/admin/AdminLayout.tsx`
- `src/components/admin/ClientSidebar.tsx`
- `src/components/admin/ClientBrandingCard.tsx`
- `src/components/admin/CreateClientModal.tsx`
- `src/components/admin/EditClientModal.tsx`
- `src/components/admin/DeleteClientModal.tsx`
- `src/components/admin/Toast.tsx`
- `src/components/admin/ColorPickerInput.tsx`

If something is listed as “not present,” no matching usage exists in those eight files.

---

## 1. Layout

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Root flex shell** | `flex w-full h-screen overflow-hidden` | `AdminLayout` |
| **Sidebar (`aside`)** | `w-[220px] shrink-0 h-full border-r border-neutral-200 bg-[#F9F8F3] shadow-[1px_0_0_0_#e5e7eb] overflow-hidden` | `AdminLayout` |
| **Sidebar inner padding** | `px-3 py-4` | `ClientSidebar` root `div` |
| **Sidebar column** | `flex h-full flex-col` | `ClientSidebar` root |
| **Main panel (right)** | `min-w-0 flex-1 overflow-y-auto bg-white h-full` | `AdminLayout` (main content wrapper; no padding on this wrapper) |
| **Main content padding (branding view)** | `p-6 md:p-8` | `ClientBrandingCard` outer wrapper |
| **Admin portal min-width (desktop-only)** | The admin portal is a desktop-only tool. **Rule:** admin wrapper min-width **768px**. On viewports narrower than 768px, the page scrolls horizontally rather than compressing the layout. **Implementation:** add `min-w-[768px]` to the wrapper `div` in `src/app/admin/layout.tsx`. | Style guide rule (layout file) |

---

## 2. Colors

Documented as Tailwind tokens / arbitrary values **as written in code**.

| Role | Classes / values | Source |
|------|------------------|--------|
| **Sidebar background** | `bg-[#F9F8F3]` | `AdminLayout` `aside` |
| **Main panel background** | `bg-white` | `AdminLayout` main column; card sections often `bg-white` |
| **Borders (neutral)** | `border-neutral-200`, `border-gray-100`, `border-gray-200`, `border-gray-300`, `border-gray-400` (dashed new-client), `border-transparent` | Various |
| **Error red (borders / text / fills)** | `border-red-500`, `border-red-600`, `text-red-500`, `text-red-600`, `text-red-800`, `text-red-900`, `bg-red-50`, `hover:bg-red-50`, `border-t-transparent` with `border-red-400` (spinner) | Sidebar search, modals, toasts, delete confirm, branding delete button |
| **Success green (toast)** | `border-green-600`, `bg-green-50`, `text-green-900`, `text-green-800` | `Toast.tsx` `success` |
| **Success / uploaded (branding badges)** | `bg-emerald-100`, `text-emerald-900` | `ClientBrandingCard` logo/hero uploaded |
| **Warning orange (toast)** | `border-orange-600`, `bg-orange-50`, `text-orange-900`, `text-orange-800` | `Toast.tsx` `warning` |
| **Warning / accent orange (actions)** | `border-orange-500`, `text-orange-600`, `hover:bg-orange-50` | `ClientBrandingCard` Edit button |
| **Info blue (toast)** | `border-blue-600`, `bg-blue-50`, `text-blue-900`, `text-blue-800` | `Toast.tsx` `info` |
| **Sky / URL emphasis** | `bg-sky-100`, `text-sky-900`, `text-sky-800` | Branding slug pill; modals portal URL span; edit modal “Current file” chip |
| **Overlay** | `bg-black/40` | Create / Edit / Delete modal backdrops |
| **Muted / gray text** | `text-gray-400`, `text-gray-500`, `text-gray-600`, `text-gray-700`, `text-gray-800`, `text-gray-900` | Throughout |
| **Highlight (search match)** | `bg-[#FFF3B0] text-inherit` on `<mark>` | `ClientSidebar` `HighlightMatch` |

---

## 3. Typography

| Element | Classes | Source |
|---------|---------|--------|
| **Sidebar app title** | `text-base font-bold tracking-tight text-gray-900` | `ClientSidebar` `h2` |
| **Sidebar subtitle** | `text-xs text-gray-400` | `ClientSidebar` |
| **Section label (uppercase)** | `text-xs font-medium uppercase tracking-wide text-gray-500` | `ClientSidebar` “Client portals” row; `ClientBrandingCard` “Quick navigation” |
| **Page title (main)** | `text-2xl font-bold text-gray-900 md:text-3xl` | `ClientBrandingCard` client name `h1` |
| **Card section title** | `text-base font-semibold text-gray-900` | `ClientBrandingCard` branding `h2` |
| **Modal title (default)** | `text-lg font-bold text-gray-900` | Create / Edit / Delete modals (`h2`) |
| **Modal title (delete, centered)** | `mb-2 text-center text-lg font-bold text-gray-900` | `DeleteClientModal` |
| **Body / description** | `text-sm text-gray-600` | Delete modal body; various |
| **Label (form)** | `text-sm font-medium text-gray-700`; with `mb-1 block` on modals | Modals + `ColorPickerInput` (`mb-1` only on modal labels) |
| **Color picker label** | `text-sm font-medium text-gray-700` | `ColorPickerInput` (no `mb-1 block`) |
| **Definition list label (`dt`)** | `text-sm text-gray-500` | `ClientBrandingCard` |
| **Definition list value (`dd`)** | `text-sm font-medium text-gray-900` or `text-sm text-gray-900` | `ClientBrandingCard` |
| **Small / hint text** | `text-xs` with `text-gray-500`, `text-gray-600`, `text-red-600`, `text-gray-700` (appendix), `italic text-gray-400` | Modals hints/errors; sidebar |
| **Toast message** | `text-sm leading-snug` | `Toast.tsx` |
| **Muted italic empty** | `text-sm italic text-gray-400` | `ClientSidebar` “No clients yet” |

---

## 4. Cards

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Branding card container** | `rounded-lg border border-gray-300 bg-white shadow-md` | `ClientBrandingCard` `section` |
| **Border radius** | `rounded-lg` (card), `rounded-md` (buttons/inputs in modals), `rounded-xl` (modal panels), `rounded-full` (pills/badges) | Various |
| **Card header row** | `flex items-center justify-between border-b border-gray-100 px-4 py-3` | `ClientBrandingCard` |
| **Header title** | `text-base font-semibold text-gray-900` | Same |
| **Header right button** | `rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50` | “Edit Branding” |
| **Field rows** | `dl` with `divide-y divide-gray-100`; each row `grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:items-center` | `ClientBrandingCard` |
| **Dividers between rows** | `divide-y divide-gray-100` on `dl`; horizontal rules elsewhere `hr` with `border-gray-200` | `ClientBrandingCard`; modals |

---

## 5. Buttons

All variants below are **copied from usage**; there is no separate “filled primary” CTA—submit actions use white + gray border.

| Variant | Classes | Source |
|---------|---------|--------|
| **Page-level actions (Edit)** | `inline-flex items-center gap-1 rounded-md border border-orange-500 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50` | `ClientBrandingCard` |
| **Page-level actions (Delete)** | `inline-flex items-center gap-1 rounded-md border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50` | `ClientBrandingCard` |
| **Secondary / outline (default)** | `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50` | Modal Cancel; “Clear search” in sidebar empty state uses `px-4 py-2`; footer actions |
| **Submit / primary (solid)** | `inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors` | Create / Edit “Create Portal” / “Save Changes” |
| **Danger confirm (solid)** | `inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors` | `DeleteClientModal` “Yes, Delete” |
| **Dashed “New Client” (sidebar)** | `mt-3 w-full rounded-lg border border-dashed border-gray-400 bg-transparent py-2.5 text-sm font-medium text-gray-800 hover:bg-white/50 disabled:opacity-50` | `ClientSidebar` |
| **Ghost** | Not defined as a dedicated button class | Nav links: `text-sm text-gray-800` + `hover:underline` (`ClientSidebar`) |
| **Small button** | `rounded-md` + `px-3 py-1.5` / `text-sm` on “Edit Branding”; clear search uses `p-1` icon button | `ClientBrandingCard`; `ClientSidebar` clear |
| **Icon-only clear search** | `absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600` | `ClientSidebar` |
| **Quick nav rows** (button) | `flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-shadow hover:bg-gray-50 hover:shadow-sm` | `ClientBrandingCard` |
| **Disabled** | `disabled:opacity-50` on buttons; search input adds `disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70` | Modals / sidebar |

**Loading spinner (inline in buttons):** `h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent` (Create/Edit) or `border-red-400` (Delete).

---

## 6. Form fields

| Concern | Classes | Source |
|---------|---------|--------|
| **Text input (modal)** | `w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400` + error: `border-red-500` else `border-gray-300` | Create / Edit |
| **Search input (sidebar)** | `w-full rounded-lg border py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70`; default border/focus: `border-gray-200 focus:border-gray-400 focus:ring-gray-400`; no-results: `border-red-500 focus:border-red-500 focus:ring-red-500` | `ClientSidebar` |
| **Color hex input** | `min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400` | `ColorPickerInput` |
| **Label** | `mb-1 block text-sm font-medium text-gray-700` (modals) | Create / Edit |
| **Required asterisk** | `text-red-500` inside `span` | Create / Edit labels |
| **Error message** | `mt-1 text-xs text-red-600` (field); `text-sm text-red-600` (`errors.general`) | Modals |
| **File input** | `w-full rounded-md border bg-[#F5F5F0] px-2 py-2 text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm` + error `border-red-500` else `border-gray-300` | Create / Edit |
| **Hint below file** | `mt-1 text-xs text-gray-500`; optional file name span `ml-2 text-gray-700` | Create / Edit |
| **Portal URL helper box** | `mt-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700` with inner `font-semibold text-sky-800` | Create / Edit |

---

## 7. Badges

| Variant | Classes | Source |
|---------|---------|--------|
| **Uploaded file (✓ + name)** | `inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900` | `ClientBrandingCard` logo/hero when URL present |
| **Not uploaded** | `inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600` | `ClientBrandingCard` “No logo uploaded” / “No hero image” |
| **URL slug (full host)** | `inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-900` | `ClientBrandingCard` |
| **Current file (edit modal)** | `inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900` | `EditClientModal` “Current: …” |

---

## 8. Modals

| Concern | Classes | Source |
|--------|---------|--------|
| **Overlay** | `fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4` | Create, Edit, Delete |
| **Panel (tall forms)** | `max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl` | Create, Edit |
| **Panel (delete)** | `w-full max-w-md rounded-xl bg-white p-6 shadow-xl` | Delete |
| **Border radius** | `rounded-xl` on dialog panel | All three |
| **Header** | `mb-4 text-lg font-bold text-gray-900` (Create/Edit); Delete uses centered layout with icon row above title | — |
| **Form stack** | `flex flex-col gap-4` | Create, Edit |
| **Footer actions** | `flex justify-end gap-2` after `hr` with `border-gray-200` | Create, Edit, Delete (Delete uses `mb-4` on `hr`) |
| **Error alert bar (form)** | `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900` | Create, Edit |
| **Delete warning block** | `mb-4 border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-900` | `DeleteClientModal` |
| **Delete icon circle** | `flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-gray-600` | `DeleteClientModal` |

---

## 9. Sidebar client list item

| State | Classes | Source |
|-------|---------|--------|
| **Row wrapper** | `flex items-stretch gap-1 rounded-lg border` | `ClientSidebar` |
| **Default (unselected)** | `border-transparent bg-transparent` | Same |
| **Selected** | `border-gray-300 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.08),0_1px_2px_-1px_rgb(0,0,0,0.06)]` | Same |
| **Select hit area** | `min-w-0 flex-1 px-3 py-2.5 text-left` | Button wrapping name/slug |
| **Name** | Selected: `truncate text-sm font-bold text-gray-900`; default: `font-semibold text-gray-900` | Same |
| **Slug** | `truncate text-xs text-gray-500` | Same |
| **Delete icon control** | `shrink-0 px-2 text-gray-400 hover:text-gray-600` | Same |
| **List gap** | `gap-1.5` on `ul` | `ClientSidebar` |

---

## 10. Search input

| Concern | Classes | Source |
|--------|---------|--------|
| **Wrapper** | `relative mb-2` | `ClientSidebar` |
| **Icon** | `pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400` | Same |
| **Default / active (non-error)** | `border-gray-200 focus:border-gray-400 focus:ring-gray-400` | Same |
| **No results state** | `border-red-500 focus:border-red-500 focus:ring-red-500` | Same (`noResults`) |
| **Clear button** | `absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600` | Same |
| **Match count** | `mb-2 text-xs text-gray-600` | “X of Y clients” |
| **No results message** | `mb-2 text-xs text-red-600` | Same |
| **Highlight color** | `<mark className="bg-[#FFF3B0] text-inherit">` | `HighlightMatch` |

---

## 11. Toast notifications

| Concern | Value / classes | Source |
|--------|-----------------|--------|
| **Container position** | `pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2` | `Toast.tsx` |
| **Width** | `w-[min(100vw-2rem,22rem)]` | Same |
| **Row wrapper (clickable layer)** | `pointer-events-auto` | Same |
| **Auto-dismiss** | Fade start: `2700ms`; remove: `3000ms` (`setTimeout`) | `ToastRow` `useEffect` |
| **Row layout** | `flex items-start gap-3 rounded-lg border p-4 shadow-sm transition-opacity duration-300 ease-out` + type box classes + `opacity-0` / `opacity-100` | Same |
| **Success** | `border-green-600 bg-green-50 text-green-900`; icon `text-green-800`; symbol `✓` | `STYLES.success` |
| **Error** | `border-red-600 bg-red-50 text-red-900`; icon `text-red-800`; symbol `✕` | `STYLES.error` |
| **Warning** | `border-orange-600 bg-orange-50 text-orange-900`; icon `text-orange-800`; symbol `⚠` | `STYLES.warning` |
| **Info** | `border-blue-600 bg-blue-50 text-blue-900`; icon `text-blue-800`; glyph `i` in bold span | `STYLES.info` |
| **Icon circle** | `mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-sm font-semibold` + type icon class | Same |

---

## 12. Loading skeletons

| Concern | Classes | Source |
|--------|---------|--------|
| **Animation** | `animate-pulse` | `ClientSidebar` list placeholders |
| **List row placeholder** | `h-14 animate-pulse rounded-lg bg-gray-200/80` | `ClientSidebar` (`<li>` in loading state) |
| **List container** | `flex flex-col gap-2` | Same |

### 12b. Branding card skeleton (`BrandingCardSkeleton`)

Source: `src/app/admin/page.tsx` — local component `BrandingCardSkeleton`.

**Outer wrapper**

- `animate-pulse p-6 md:p-8`

**Title + action buttons row**

- Container: `mb-6 flex justify-between`
- Title placeholder: `h-9 w-48 max-w-full rounded bg-gray-200`
- Actions group: `flex gap-2`
- Narrow button placeholder: `h-10 w-20 rounded bg-gray-200`
- Wider button placeholder: `h-10 w-24 rounded bg-gray-200`

**Card block (mirrors branding card shell)**

- Container: `rounded-lg border border-gray-200 p-4`
- Inner header row: `mb-4 flex justify-between`
- Left header bar: `h-6 w-32 rounded bg-gray-200`
- Right header bar: `h-8 w-28 rounded bg-gray-200`
- Field rows stack: `space-y-3`
- Each field row: `flex gap-4`
- Label column bar: `h-4 w-24 shrink-0 rounded bg-gray-200`
- Value column bar: `h-4 flex-1 rounded bg-gray-200`
- Six repeated rows: `{[1, 2, 3, 4, 5, 6].map(...)}` with the above row pattern

**Quick navigation placeholders**

- Container: `mt-8 space-y-2`
- Each row: `h-12 w-full rounded-lg bg-gray-200` (two rows)

**Pattern summary**

- Pulse animation on the outermost wrapper only (`animate-pulse` on root `div`).
- Placeholder fills use `bg-gray-200`; list skeleton in the sidebar uses `bg-gray-200/80` (see table above).

---

## 13. Quick navigation rows

| Concern | Classes | Source |
|--------|---------|--------|
| **Section label** | `mb-2 text-xs font-medium uppercase tracking-wide text-gray-500` | `ClientBrandingCard` |
| **Stack** | `flex flex-col gap-2` | Same |
| **Row (button)** | `flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm hover:bg-gray-50` | Same |
| **Left label** | `font-semibold text-gray-900` (with emoji in text) | Same |
| **Right count** | `text-gray-600` | Same |

---

## 14. Properties page patterns

Source files: `src/app/admin/properties/[clientId]/page.tsx`, `CreatePropertyModal.tsx`, `EditPropertyModal.tsx`, `DeletePropertyModal.tsx`, `BulkImportPropertiesModal.tsx`.

### 14a. Properties page layout

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Page wrapper** | `p-6 md:p-8` | Properties page (main content) |
| **Chrome row (title + actions)** | `mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between` | Same |
| **Back link** | `mb-3 inline-block text-sm text-gray-800 hover:underline`; label `← Branding & overview`; `href="/admin"` | Same |
| **Page title (`h1`)** | `text-2xl font-bold tracking-tight text-gray-900 md:text-3xl`; text: leading `📍 Properties` then ` · {clientName}` when client is known | Same |
| **Header actions cluster** | `flex shrink-0 flex-wrap gap-2` | Same |
| **Import CSV (outline)** | `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50` | Same |
| **Add property (primary)** | `inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors`; label `+ Add property` | Same |
| **List card** | `overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md` (`section`) | Same |
| **Card header band** | Outer: `border-b border-gray-100 px-4 py-3`; inner: `flex items-center justify-between` | Same |
| **Card header title** | `text-base font-semibold text-gray-900` — literal `All locations` | Same |
| **Property count (right)** | `text-sm text-gray-500` — `{count} property` / `properties` | Same |
| **Loading body** | `p-8 text-center text-sm text-gray-500` | Same |
| **Load error body** | `p-8 text-center text-sm text-red-600` | Same |

### 14b. Property list row

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **List container** | `divide-y divide-gray-100` | Properties page |
| **Row** | `flex items-center justify-between px-4 py-3` | Same |
| **Left column** | `min-w-0 flex-1` | Same |
| **Name** | `truncate text-sm font-semibold text-gray-900` | Same |
| **Address line** | `mt-0.5 truncate text-xs text-gray-500` when non-empty; **data:** comma-joined `[address, cityState, zip]` with `cityState = [city, state].filter(Boolean).join(' ')` (space between city and state) | Same |
| **Action cluster** | `ml-4 flex shrink-0 gap-2` | Same |
| **Edit** | `inline-flex items-center gap-1 rounded-md border border-orange-500 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50`; label `✏️ Edit` | Same |
| **Delete** | `inline-flex items-center gap-1 rounded-md border border-red-500 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50`; label `🗑 Delete` | Same |

### 14c. Empty state pattern

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Container** | `flex flex-col items-center justify-center px-6 py-12 text-center` | Properties page (no properties) |
| **Emoji** | `mb-3 text-4xl` — `📍` (`span`, `aria-hidden`) | Same |
| **Title** | `mb-1 text-sm font-semibold text-gray-900` | Same |
| **Subtitle** | `mb-4 text-xs text-gray-500` | Same |
| **Button row** | `flex flex-wrap justify-center gap-2` | Same |
| **Import (outline + emoji label)** | Same outline classes as header **Import CSV**; label `📤 Import CSV` | Same |
| **Add Property (primary)** | Same primary classes as header **Add property**; label `+ Add Property` | Same |

### 14d. Property modals

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Overlay** | `fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4` | Create / Edit / Delete / Bulk import |
| **Form modal panel** | `max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl` | `CreatePropertyModal`, `EditPropertyModal`, `BulkImportPropertiesModal` |
| **Delete modal panel** | `w-full max-w-md rounded-xl bg-white p-6 shadow-xl` | `DeletePropertyModal` |
| **Form modal title (`h2`)** | `mb-4 text-lg font-bold text-gray-900` | Create / Edit / Bulk import |
| **Add title (emoji prefix)** | `🏢 Add Property` | `CreatePropertyModal` |
| **Edit title (emoji prefix)** | `✏️ Edit Property` | `EditPropertyModal` |
| **Bulk import title (emoji prefix)** | `📤 Import Properties from CSV` | `BulkImportPropertiesModal` |
| **Validation alert (form)** | `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900` — “Please fix the errors below before continuing.” | Create / Edit |
| **Delete icon well** | Wrapper `mb-4 flex justify-center`; circle `flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-gray-600`; inner `🗑` | `DeletePropertyModal` |
| **Delete title** | `mb-2 text-center text-lg font-bold text-gray-900` — `Delete property?` (no emoji in string) | Same |
| **Delete body** | `mb-4 text-center text-sm text-gray-600`; property name `font-semibold text-gray-900` | Same |
| **Form fields / footer actions** | Match sections 6–8 of this guide: labels, inputs, `<hr className="border-gray-200" />`, Cancel outline, primary submit with spinner | Create / Edit |
| **Create submit label** | `Save Property` | `CreatePropertyModal` |
| **Edit submit label** | `Save Changes` | `EditPropertyModal` |
| **Delete confirm** | `inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors`; spinner `h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent`; label `Yes, Delete` | `DeletePropertyModal` |

### 14e. CSV import modal phases

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Hidden file input** | `hidden`; `accept=".csv,text/csv"`; `key` incremented to reset | `BulkImportPropertiesModal` |
| **Template download row** | `mb-4 rounded-md bg-gray-100 px-3 py-2` (idle); inner `flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700`; download control `font-medium text-sky-800 hover:underline` — `⬇ template.csv`. **Error (`result` error) phase:** same gray row classes but leading wrapper is `rounded-md bg-gray-100 px-3 py-2` inside error column (no `mb-4` on that duplicate in error block — first child is `rounded-md bg-gray-100 px-3 py-2`) | Same |
| **Phase idle — upload zone shell** | `mb-3 rounded-lg border-2 p-6 text-center`; also `role="button"` `tabIndex={0}`; drag handlers on wrapper | Same |
| **Idle, no file** | `cursor-pointer border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100` | Same |
| **File selected, valid** | `border-sky-400 bg-sky-50` | Same |
| **File selected, invalid** | `cursor-pointer border-red-500 bg-red-50` | Same |
| **Idle empty — icon / copy** | `mb-2 block text-3xl` `📂`; `mb-1 text-sm font-bold text-gray-900` “Drop your CSV file here”; `text-sm text-gray-600` with inline `browse` `font-medium text-sky-800 hover:underline` | Same |
| **Idle valid file** | `mb-2 text-2xl` `✅`; filename `text-sm font-bold text-sky-900`; meta `mt-1 text-xs text-gray-600` — KB + ` · ` + Remove `font-medium text-red-600 hover:underline` | Same |
| **Idle invalid file** | `mb-2 text-2xl font-bold text-red-600` `✕`; filename `text-sm font-bold text-red-600`; Remove `mt-2 text-sm font-medium text-red-600 hover:underline` | Same |
| **Client-side validation alert (below zone)** | `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900` | Same |
| **Column hint** | `mb-4 text-xs text-gray-500`; bold column name `font-medium text-gray-700` around `name` | Same |
| **Idle footer** | `mt-4 flex justify-end gap-2`; Cancel outline; **Import** `inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50`, disabled when there is no file or client-side validation string is non-null (`!file || fileInvalid !== null` in code) | Same |
| **Phase uploading** | Column `flex flex-col items-center py-8 text-center`; emoji `mb-4 text-4xl` `⏳`; title `mb-4 text-sm font-bold text-gray-900` “Importing properties...”; **progress track** `mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200`; **fill** `h-full rounded-full bg-gray-900 transition-[width] duration-300 ease-out` (`width` from state); caption `text-sm text-gray-600` “Processing...” | Same |
| **Phase result — success** | Green bar: `border-l-4 border-green-600 bg-green-50 px-3 py-2 text-sm text-green-900`; check prefix `span` `font-semibold text-green-800` + `✓ `; optional skipped: `border-l-4 border-orange-600 bg-orange-50 px-3 py-2 text-sm text-orange-900`; body `text-sm text-gray-600`; `hr` `border-gray-200`; single **Done** `flex justify-end` + outline button | Same |
| **Phase result — error** | Template row (see above); **status zone** `rounded-lg border-2 p-6 text-center` — valid file styling `border-2 border-sky-400 bg-sky-50`, invalid `border-red-500 bg-red-50` (same inner patterns as idle file states); **API error bar** `border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900`; **Error code** `text-xs text-gray-500` “Error code: …”; footer **Cancel** + **Try Again** (both outline, `flex justify-end gap-2`) | Same |

---

## 15. Support contacts page patterns

Source files: `src/app/admin/contacts/[clientId]/page.tsx`, `CreateContactModal.tsx`, `EditContactModal.tsx`, `DeleteContactModal.tsx`.

### 15a. Contacts page layout

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Page wrapper (main)** | `p-6 md:p-8` | Contacts page |
| **Chrome row (title + actions)** | `mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between` | Same |
| **Back link** | `mb-3 inline-block text-sm text-gray-800 hover:underline`; label `← Branding & overview`; `href="/admin"` | Same |
| **Page title (`h1`)** | `text-2xl font-bold tracking-tight text-gray-900 md:text-3xl`; text: leading `👥 Support Team` then ` · {clientName}` when client is known | Same |
| **Header actions cluster** | `flex shrink-0 flex-wrap gap-2` | Same |
| **Add Contact (primary)** | `inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50`; label `+ Add Contact`; `disabled={loadingContacts}` | Same |
| **List card** | `overflow-hidden rounded-lg border border-gray-300 bg-white shadow-md` (`section`) | Same |
| **Card header band** | Outer: `border-b border-gray-100 px-4 py-3`; inner: `flex items-center justify-between` | Same |
| **Card header title** | `text-base font-semibold text-gray-900` — literal `Support contacts` | Same |
| **Member count (right)** | `text-sm text-gray-500` — `{count} member` / `members` | Same |
| **Load error body** | `p-8 text-center text-sm text-red-600` — “Could not load contacts. Please try again.” | Same |

### 15b. Contact list row

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **List container** | `divide-y divide-gray-100` | Contacts page |
| **Row** | `flex items-center justify-between gap-3 px-4 py-3` | Same |
| **Left cluster** | `flex min-w-0 flex-1 items-start gap-3` | Same |
| **Avatar (photo)** | Wrapper `h-10 w-10 shrink-0 overflow-hidden rounded-full bg-sky-100`; `<img>` `h-full w-full object-cover`; `src={profile_image}` | Same |
| **Avatar (initials)** | `flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-900` (`aria-hidden`); **data:** `contactInitials(name)` — first two letters of single word, else first letter of first + last word (uppercase), empty name → `?` | Same |
| **Text column** | `min-w-0 flex-1` | Same |
| **Name** | `truncate text-sm font-semibold text-gray-900` | Same |
| **Mobile / email row** | `mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600`; mobile span `truncate` — `📞 {mobile}` if non-empty; email span `truncate` — `✉️ {email}` if non-empty | Same |
| **Action cluster** | `ml-2 flex shrink-0 gap-2 sm:ml-4` | Same |
| **Edit** | `inline-flex items-center gap-1 rounded-md border border-orange-500 px-3 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50`; label `✏️ Edit` | Same |
| **Delete** | `inline-flex items-center gap-1 rounded-md border border-red-500 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50`; label `🗑 Delete` | Same |

### 15c. Empty state pattern

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Container** | `flex flex-col items-center justify-center px-6 py-12 text-center` | Contacts page (no contacts) |
| **Emoji** | `mb-3 text-4xl` — `👥` (`span`, `aria-hidden`) | Same |
| **Title** | `mb-1 text-sm font-semibold text-gray-900` — “No support contacts yet” | Same |
| **Subtitle** | `mb-4 text-xs text-gray-500` — “Add team members to display on the client portal sidebar card.” | Same |
| **Single CTA** | `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50`; label `+ Add Contact` | Same |

### 15d. Loading skeleton pattern

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **List shell** | `divide-y divide-gray-100` | Contacts page |
| **Skeleton row** | `flex animate-pulse items-center gap-3 px-4 py-3` (two placeholder keys) | Same |
| **Avatar skeleton** | `h-10 w-10 shrink-0 rounded-full bg-gray-200` | Same |
| **Text block** | `min-w-0 flex-1 space-y-2` | Same |
| **Line bars** | Name line `h-4 w-40 max-w-full rounded bg-gray-200`; detail line `h-3 w-56 max-w-full rounded bg-gray-200` | Same |
| **Action placeholders (sm+)** | Wrapper `ml-4 hidden shrink-0 gap-2 sm:flex`; bars `h-8 w-16` and `h-8 w-20` `rounded-md bg-gray-200` | Same |

### 15e. Contact modals

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Overlay** | `fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4` | Create / Edit / Delete contact |
| **Form modal panel** | `max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl` | `CreateContactModal`, `EditContactModal` |
| **Delete modal panel** | `w-full max-w-md rounded-xl bg-white p-6 shadow-xl` | `DeleteContactModal` |
| **Form modal title (`h2`, left)** | `mb-4 text-lg font-bold text-gray-900` | Create / Edit |
| **Add title (emoji)** | `👤 Add Support Contact` | `CreateContactModal` |
| **Edit title (emoji)** | `✏️ Edit Support Contact` | `EditContactModal` |
| **Top validation alert** | `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900` — “Please fix the errors below before continuing.” | Create / Edit |
| **Form stack** | `flex flex-col gap-4` | Create / Edit |
| **Labels** | `mb-1 block text-sm font-medium text-gray-700`; required asterisk `text-red-500` on “Full Name *” | Create / Edit |
| **Text inputs** | Default border `border-gray-300`; error `border-red-500`; `rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400` | Create / Edit |
| **Field error line** | `mt-1 text-xs text-red-600` | Create / Edit |
| **General error** | `text-sm text-red-600` | Create / Edit |
| **Profile file input** | `key={profileKey}` reset; `accept=".jpg,.jpeg,.png,.webp"`; `className` includes `w-full rounded-md border bg-[#F5F5F0] px-2 py-2 text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm`; error state `border-red-500` else `border-gray-300` | Create / Edit |
| **Profile hint (create)** | `mt-1 text-xs text-gray-500` — “.jpg .png .webp — max 5 MB. If not uploaded, initials will be shown.” + optional `ml-2 text-gray-700` chosen filename | `CreateContactModal` |
| **Profile hint (edit)** | `mt-1 text-xs text-gray-500` — “.jpg .png .webp — max 5 MB” + optional filename span | `EditContactModal` |
| **Footer** | `<hr className="border-gray-200" />`; `flex justify-end gap-2`; Cancel outline `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50`; primary `inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors` + spinner `h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent` | Create / Edit |
| **Create submit label** | `Save Contact` | `CreateContactModal` |
| **Edit submit label** | `Save Changes` | `EditContactModal` |
| **Edit — current photo block** | When `contact.profile_image`: row `mb-2 flex flex-wrap items-center gap-3`; thumb `flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-sky-900` + `img` `h-full w-full object-cover`; badge `inline-block rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-900` — `Current: {filename}` (last URL segment); hint `mt-1 text-xs text-gray-500` “Upload new to replace, or leave blank to keep”. When no image: same hint only `mb-2` | `EditContactModal` |
| **Delete — icon well** | `mb-4 flex justify-center`; circle `flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-gray-600`; inner `🗑` | `DeleteContactModal` |
| **Delete title** | `mb-2 text-center text-lg font-bold text-gray-900` — “Remove Support Contact?” | Same |
| **Delete body** | `mb-4 text-center text-sm text-gray-600` — “Remove **{name}** from the {clientName} support team?” with name `font-semibold text-gray-900` | Same |
| **Delete warning box** | `mb-4 border-l-4 border-orange-600 bg-orange-50 px-3 py-2 text-sm text-orange-900` — photo deletion copy | Same |
| **Delete actions** | `hr` `mb-4 border-gray-200`; Cancel outline; confirm `inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors`; spinner `border-red-400 border-t-transparent`; label `Yes, Remove` | Same |

---

## 16. Authentication & user management patterns

Source files: `src/app/admin/login/layout.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/users/page.tsx`, `CreateAdminUserModal.tsx`, `EditAdminUserModal.tsx`, `ChangePasswordModal.tsx`, `DeleteAdminUserModal.tsx`, `ClientSidebar.tsx` (logout block).

### 16a. Login page layout

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Layout wrapper (full viewport background)** | `min-h-screen bg-gray-50` on root `div` wrapping `{children}` | `admin/login/layout.tsx` |
| **Page background / centering shell** | `flex min-h-screen items-center justify-center px-4 py-10` | `admin/login/page.tsx` |
| **Card** | `w-full max-w-sm rounded-xl bg-white p-8 shadow-md` | Same |
| **Brand accent bar + title row** | Outer `mb-6 flex flex-col items-center text-center`; inner `mb-3 flex items-center gap-2`; bar `h-6 w-1 rounded-full bg-gray-800` (`aria-hidden`); title `text-base font-bold tracking-tight text-gray-900` — “InterTalent Admin” | Same |
| **Subtitle** | `text-sm text-gray-600` — “Sign in to your account” | Same |
| **Auth error message (server / sign-in failure)** | `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900` with `role="alert"` | Same |
| **Form fields — label** | `mb-1 block text-sm font-medium text-gray-700` | Same |
| **Form fields — input (default)** | `w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400` (constants `INPUT_CLASS` / `INPUT_ERROR_CLASS` in file) | Same |
| **Form fields — input (error state)** | `border-red-500` + `focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500` | Same |
| **Field-level error line** | `mt-1 text-xs text-red-600` | Same |
| **Submit button** | `inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50`; spinner when submitting: `h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent` | Same |
| **Form stack** | `flex flex-col gap-4` on `<form>`; `noValidate` | Same |

### 16b. Admin user list row

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **List container** | `divide-y divide-gray-100` on wrapper `div` around mapped rows | `admin/users/page.tsx` |
| **Row container** | `flex items-center justify-between gap-3 px-4 py-3` | Same |
| **Left cluster (avatar + text)** | `flex min-w-0 flex-1 items-center gap-3` | Same |
| **Avatar circle (initials)** | `flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-900` (`aria-hidden`) | Same |
| **Initials logic (`userInitials`)** | Trim → split on whitespace; empty → `?`; one word → first two letters uppercased; else first char of first + first char of last word, uppercased | Same |
| **Name + “You” row** | Wrapper `min-w-0`; inner `flex flex-wrap items-center gap-2` | Same |
| **Name** | `truncate text-sm font-semibold text-gray-900` | Same |
| **“You” badge** | `rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700` — shown when row user id matches session user id | Same |
| **Email** | `truncate text-xs text-gray-500` | Same |
| **Middle cluster (role + status)** | `flex shrink-0 items-center gap-3` | Same |
| **Role badge — `super_admin`** | `rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white` — label `SUPER ADMIN` | Same |
| **Role badge — `admin`** | `rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700` — label `ADMIN` | Same |
| **Status — active** | `text-xs font-medium text-green-700` — `● Active` | Same |
| **Status — inactive** | `text-xs font-medium text-gray-400` — `○ Inactive` | Same |
| **Action cluster** | `flex shrink-0 items-center gap-2` | Same |
| **Edit (icon only)** | `rounded-md border border-orange-500 p-1.5 text-orange-600 hover:bg-orange-50`; `aria-label={\`Edit ${u.name}\`}`; child `✏️` | Same |
| **Delete (icon only)** | `rounded-md border border-red-500 p-1.5 text-red-600 hover:bg-red-50`; `aria-label={\`Delete ${u.name}\`}`; child `🗑` | Same |
| **Self row** | Edit/Delete hidden when `isSelf(u)` | Same |

### 16c. Admin user modals

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **CreateAdminUserModal — overlay** | `fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4` | `CreateAdminUserModal.tsx` |
| **CreateAdminUserModal — panel** | `max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl`; `role="dialog"` `aria-modal="true"` `aria-labelledby="create-admin-user-title"` | Same |
| **CreateAdminUserModal — title** | `mb-4 text-lg font-bold text-gray-900` — `👤 Add Admin User` | Same |
| **CreateAdminUserModal — top validation alert** | `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900` when `hasErrors` — “Please fix the errors below before continuing.” | Same |
| **CreateAdminUserModal — form** | `flex flex-col gap-4`; labels `mb-1 block text-sm font-medium text-gray-700` + required `span` `text-red-500`; inputs/select: `w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400` + `border-red-500` or `border-gray-300`; password helper `mt-1 text-xs text-gray-500` “Minimum 8 characters”; field errors `mt-1 text-xs text-red-600`; `errors.general` as `text-sm text-red-600`; `<hr className="border-gray-200" />`; footer `flex justify-end gap-2` — Cancel outline `rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50`; primary `inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors` + gray spinner — “Save User” | Same |
| **CreateAdminUserModal — API** | `POST /api/admin/users` with JSON `{ name, email, password, role }`; maps `ApiErrorResponse` codes to field/general errors or `showToast` | Same |
| **EditAdminUserModal — overlay / panel** | Same `z-[200]` overlay and `max-w-lg` panel pattern as Create; `aria-labelledby="edit-admin-user-title"`; title `✏️ Edit Admin User` | `EditAdminUserModal.tsx` |
| **EditAdminUserModal — own user (`isOwnUser`)** | Compare `String(user.id)` to `String(currentUserId)`; on submit, if own user, force `bodyRole` / `bodyActive` from original `user` (cannot change role or inactive self) | Same |
| **EditAdminUserModal — role select (own user)** | `disabled={isOwnUser}`; `title` “You cannot change your own role”; disabled visuals `disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70`; helper `mt-1 text-xs text-gray-500` “Your role cannot be changed here.” | Same |
| **EditAdminUserModal — status toggles** | `flex flex-wrap gap-2`; Active/Inactive `button` `rounded-md px-4 py-2 text-sm font-medium transition-colors` — selected `bg-gray-900 text-white hover:bg-gray-700`, unselected `border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`; Inactive `disabled={isOwnUser}` with `disabled:cursor-not-allowed disabled:opacity-50` and title “You cannot deactivate your own account here”; own-user note `mt-1 text-xs text-gray-500` “You cannot set your own account to inactive.” | Same |
| **EditAdminUserModal — change password entry** | `text-sm font-medium text-gray-800 underline hover:text-gray-900` — `🔑 Change Password` opens nested modal | Same |
| **EditAdminUserModal — API** | `PUT /api/admin/users/${user.id}` with `{ name, email, role, is_active }` | Same |
| **ChangePasswordModal — overlay (stacking)** | `fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4` — **higher than** edit/create `z-[200]` so it stacks above `EditAdminUserModal` | `ChangePasswordModal.tsx` |
| **ChangePasswordModal — panel** | Same `max-w-lg` scrollable white panel as other form modals; `aria-labelledby="change-password-title"` | Same |
| **ChangePasswordModal — title block** | `mb-1 text-lg font-bold text-gray-900` — `🔑 Change Password`; subtitle `mb-4 text-sm text-gray-600` — “For ” + `span` `font-semibold text-gray-900` `{user.name}` | Same |
| **ChangePasswordModal — validation** | Top alert bar same as Create when `hasErrors`; client-side checks (required, min length 8, match) before `PUT`; `PUT /api/admin/users/${user.id}/password` with `{ password }` | Same |
| **ChangePasswordModal — footer** | Cancel outline + primary “Update Password” with gray spinner (same primary button classes as Create user) | Same |
| **DeleteAdminUserModal — overlay** | `fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4` | `DeleteAdminUserModal.tsx` |
| **DeleteAdminUserModal — panel** | `w-full max-w-md rounded-xl bg-white p-6 shadow-xl` (no `max-h` / overflow-y on panel) | Same |
| **DeleteAdminUserModal — structure** | Centered icon row `mb-4 flex justify-center`; circle `flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-gray-600` + `🗑`; title `mb-2 text-center text-lg font-bold text-gray-900` “Delete Admin User?”; body `mb-4 text-center text-sm text-gray-600` with name `font-semibold text-gray-900`; warning `mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900`; `hr` `mb-4 border-gray-200`; actions `flex justify-end gap-2` — Cancel outline; confirm `inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors` + spinner `border-red-400 border-t-transparent` — “Yes, Delete” | Same |
| **DeleteAdminUserModal — API / toasts** | `DELETE /api/admin/users/${user.id}`; on `CANNOT_DELETE_LAST_SUPER_ADMIN` toast “Cannot delete the last super admin account” (`error`); success toast + `onSuccess(user.id)` | Same |

### 16d. Sidebar logout section

| Concern | Classes / pattern | Source |
|--------|-------------------|--------|
| **Placement** | After `</nav>`, inside sidebar root `flex h-full flex-col` — outer wrapper `mt-auto` pushes block to bottom | `ClientSidebar.tsx` |
| **Spacing + divider shell** | Inner `div`: `border-t border-neutral-200 mt-4 pt-3` | Same |
| **User block (when `session?.user`)** | `mb-2 px-1` | Same |
| **User name** | `truncate text-xs font-medium text-gray-900` — `{session.user.name}` | Same |
| **User email** | `truncate text-xs text-gray-500` — `{session.user.email}` | Same |
| **Sign out button** | `w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50` | Same |
| **Behavior** | `onClick={() => void signOut({ callbackUrl: '/admin/login' })}` (`signOut` from `next-auth/react`) | Same |

---

## Appendix: Color swatch (branding details)

| Element | Classes | Source |
|---------|---------|--------|
| **Small square next to hex** | `h-[22px] w-[22px] shrink-0 rounded border border-gray-200` + inline `backgroundColor` | `ClientBrandingCard` |
| **Picker swatch** | `h-[34px] w-[34px] rounded-md border border-gray-300 shadow-inner` | `ColorPickerInput` |

---

## Appendix: Misc spacing / layout

- **Page chrome above card:** `mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between` with actions `flex shrink-0 gap-2` — `ClientBrandingCard`.
- **Color pickers grid in modals:** `grid grid-cols-1 gap-3 sm:grid-cols-2` — Create / Edit.
- **Sidebar scroll region:** `min-h-0 flex-1 overflow-y-auto` — `ClientSidebar`.
