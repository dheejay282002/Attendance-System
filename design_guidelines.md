# Attendance Management System - Design Guidelines

## Design Approach: Material Design System (Data-Focused)
**Rationale**: This is a utility-focused, information-dense administrative tool where efficiency, clarity, and usability are paramount. Material Design provides robust patterns for forms, data tables, dashboards, and role-based interfaces that this system requires.

**Key Design Principles**:
- Clarity over decoration - every element serves a functional purpose
- Consistent information hierarchy across admin and student interfaces
- Accessible form design with clear validation states
- Mobile-responsive layouts for QR code scanning and attendance tracking

---

## Core Design Elements

### A. Color Palette

**Light Mode (Primary)**:
- Primary: 220 90% 50% (Professional blue for primary actions, headers)
- Primary Variant: 220 85% 35% (Darker blue for hover states)
- Secondary: 160 70% 45% (Teal for success states, attendance confirmation)
- Background: 0 0% 98% (Off-white for main background)
- Surface: 0 0% 100% (Pure white for cards, panels)
- Error: 0 70% 50% (Red for validation errors, delete actions)
- Warning: 38 92% 50% (Amber for pending states)
- Text Primary: 220 20% 20% (Dark gray for body text)
- Text Secondary: 220 10% 50% (Medium gray for supporting text)

**Dark Mode** (for student mobile usage):
- Primary: 220 85% 60% (Lighter blue for visibility)
- Background: 220 20% 12% (Dark blue-gray)
- Surface: 220 18% 18% (Elevated dark surfaces)
- Text Primary: 0 0% 95% (Near white)
- Text Secondary: 0 0% 70% (Light gray)

### B. Typography

**Font Stack**: 
- Primary: 'Inter', 'Roboto', system-ui, -apple-system, sans-serif
- Monospace (for Student IDs, codes): 'JetBrains Mono', 'Courier New', monospace

**Type Scale**:
- Display (Dashboard headers): text-4xl font-bold (36px)
- H1 (Page titles): text-3xl font-semibold (30px)
- H2 (Section headers): text-2xl font-semibold (24px)
- H3 (Card titles): text-xl font-medium (20px)
- Body: text-base font-normal (16px)
- Caption (helper text): text-sm font-normal (14px)
- Label (form labels): text-sm font-medium (14px)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-4 or p-6
- Section spacing: space-y-6 or space-y-8
- Card margins: m-4 or m-6
- Form field gaps: gap-4

**Grid System**:
- Admin Dashboard: 2-column layout on desktop (sidebar + main), single column mobile
- Student Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data Tables: Full-width with horizontal scroll on mobile
- Forms: max-w-2xl for optimal reading/input

**Container Widths**:
- Main content: max-w-7xl mx-auto
- Forms: max-w-2xl
- Dashboard panels: w-full with inner padding

### D. Component Library

**Navigation**:
- Admin: Persistent sidebar (240px) with icon + label navigation items, collapsible on mobile
- Student: Bottom tab bar on mobile, top horizontal nav on desktop
- Breadcrumbs for deep navigation (Admin > Students > Edit Student)

**Forms**:
- Input fields: border border-gray-300 rounded-lg p-3 with focus ring
- Labels: Above inputs, text-sm font-medium mb-2
- Validation: Inline error messages in red, success states in green
- File upload: Drag-drop zone with preview for profile pictures
- Dropdowns: Custom styled with chevron icon, searchable for long lists

**Data Display**:
- Tables: Striped rows, sortable columns, sticky headers, action column on right
- Cards: Elevated with shadow-md, rounded-lg, p-6 for student/event info
- Statistics: Large number display with icon and trend indicator
- Empty states: Centered icon + message + CTA button

**Buttons**:
- Primary: bg-primary text-white rounded-lg px-6 py-3
- Secondary: border border-primary text-primary rounded-lg px-6 py-3
- Danger: bg-error text-white rounded-lg px-6 py-3
- Icon buttons: 40x40px circular for table actions

**QR Code Display**:
- Centered in modal or card, minimum 256x256px
- White background with 16px padding
- Download and regenerate buttons below
- Event details displayed above QR code

**Overlays**:
- Modals: max-w-lg centered with backdrop blur, rounded-xl shadow-2xl
- Confirmation dialogs: Icon + message + action buttons (Cancel/Confirm)
- Toast notifications: Fixed top-right, slide-in animation, auto-dismiss

**Dashboard Widgets**:
- Stat cards: Icon + number + label in 3-column grid
- Recent activity: List with avatar + action + timestamp
- Quick actions: Button grid for common tasks

### E. Role-Specific UI Patterns

**Admin Dashboard**:
- Left sidebar navigation with sections: Dashboard, Students, Events, Courses, Settings
- Main content area with page header (title + actions) and content panels
- Data tables with inline edit, bulk actions, and export buttons
- CSV import: Upload zone with validation feedback and error summary

**Student Dashboard**:
- Clean, card-based layout with event cards showing date, time, course eligibility
- Profile section with editable fields clearly marked
- QR scanner: Full-screen camera view with overlay guidelines
- Attendance history: Timeline view with time-in/out stamps

**Registration Flow**:
- Step 1: Student ID input (large, centered)
- Step 2: Verification result (found/not found message)
- Step 3: Profile completion form (read-only + editable sections visually separated)
- Step 4: Picture upload with crop/preview

### F. Responsive Behavior

**Desktop (lg: 1024px+)**:
- Full sidebar navigation
- Multi-column layouts for data
- Expanded tables with all columns visible

**Tablet (md: 768px - 1023px)**:
- Collapsible sidebar
- 2-column card layouts
- Simplified table views with priority columns

**Mobile (< 768px)**:
- Bottom tab navigation for students
- Single column layouts
- Card-based data display replacing tables
- Full-screen QR scanner optimized for camera access

### G. Micro-interactions (Minimal)

- Button hover: Slight scale (1.02) + brightness increase
- Form focus: Border color change + subtle glow
- Success actions: Green checkmark animation (fade in)
- Loading states: Skeleton screens for data tables, spinner for actions
- QR scan success: Haptic feedback + checkmark overlay

---

## Images

**Profile Pictures**:
- Student profiles: 80x80px circular avatars in lists, 200x200px in profile view
- Placeholder: Initials on colored background (generated from name)
- Upload requirements: Max 2MB, JPG/PNG, auto-crop to square

**QR Codes**:
- Generated dynamically per event
- 256x256px minimum for reliable scanning
- High contrast black/white, no design embellishments
- Display in admin view for printing, scanning view for students

**Icons** (Heroicons library via CDN):
- Navigation icons: 24x24px
- Action buttons: 20x20px
- Empty states: 48x48px illustrative icons

**No hero images** - this is a functional administrative tool focused on data and forms, not marketing.