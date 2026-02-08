---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/hooks/useIsMobile.ts
  - src/components/board/interactive-board.tsx
  - src/components/board/droppable-column.tsx
  - src/components/board/draggable-order-card.tsx
autonomous: true

must_haves:
  truths:
    - "On mobile (<768px), tapping a card selects it with a visible highlight"
    - "On mobile, tapping a column header area while a card is selected moves the card to that column"
    - "On mobile, tapping the same card again deselects it"
    - "On mobile, the 'Voir details' button still opens the order detail modal"
    - "On desktop (>=768px), drag-and-drop works exactly as before with no changes"
    - "Order status updates fire correctly through the existing onOrderUpdate callback"
  artifacts:
    - path: "src/lib/hooks/useIsMobile.ts"
      provides: "Hook to detect mobile viewport"
      exports: ["useIsMobile"]
    - path: "src/components/board/interactive-board.tsx"
      provides: "Board that switches between DnD (desktop) and tap-to-move (mobile)"
    - path: "src/components/board/droppable-column.tsx"
      provides: "Column that shows tap-to-move target on mobile when card selected"
    - path: "src/components/board/draggable-order-card.tsx"
      provides: "Card that uses tap-to-select on mobile instead of drag"
  key_links:
    - from: "interactive-board.tsx"
      to: "useIsMobile hook"
      via: "conditional sensor setup and state management"
      pattern: "useIsMobile"
    - from: "draggable-order-card.tsx"
      to: "interactive-board.tsx"
      via: "onSelect callback prop"
      pattern: "onSelect"
    - from: "droppable-column.tsx"
      to: "interactive-board.tsx"
      via: "onColumnTap callback prop"
      pattern: "onColumnTap"
---

<objective>
Replace unreliable mobile drag-and-drop with a reliable tap-to-select, tap-column-to-move pattern on mobile devices. Desktop drag-and-drop remains completely unchanged.

Purpose: The current @dnd-kit TouchSensor with 250ms delay is unreliable on mobile. Users can't consistently move orders between columns. A tap-based approach is more "analog" and reliable -- tap a card to select it, then tap the column you want to move it to.

Output: Modified board components that detect mobile viewport and switch interaction mode accordingly.
</objective>

<execution_context>
@/Users/aymanbaig/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aymanbaig/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/board/interactive-board.tsx
@src/components/board/droppable-column.tsx
@src/components/board/draggable-order-card.tsx
@src/app/board/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create useIsMobile hook and wire tap-to-move into InteractiveBoard</name>
  <files>
    src/lib/hooks/useIsMobile.ts
    src/components/board/interactive-board.tsx
  </files>
  <action>
    1. Create `src/lib/hooks/useIsMobile.ts`:
       - Simple hook using `window.matchMedia('(max-width: 767px)')`.
       - Use useState + useEffect pattern. Listen for `change` event on the MediaQueryList.
       - Default to `false` (SSR-safe). Update on mount and on resize/orientation change.
       - Export `useIsMobile()` returning boolean.

    2. Modify `src/components/board/interactive-board.tsx`:
       - Import `useIsMobile` hook.
       - Add state: `selectedOrderForMove` (string | null) -- stores the ID of the order selected for moving.
       - On mobile (`isMobile === true`):
         - Pass EMPTY array to `useSensors()` so DnD is completely disabled. The DndContext still wraps (avoids conditional hooks) but no sensors means no drag activation.
         - Pass `selectedOrderForMove` and `onSelectForMove` callback to DroppableColumn and DraggableOrderCard.
         - `onSelectForMove(orderId)`: If same order tapped, deselect (set null). Otherwise select it.
         - Add `onColumnTap(columnId)` handler: If `selectedOrderForMove` is set, call `onOrderUpdate(selectedOrderForMove, statusMap[columnId])`, clear selection, and trigger the justMovedOrder animation. If no order selected, do nothing.
       - On desktop (`isMobile === false`):
         - Keep existing sensors (PointerSensor + TouchSensor) exactly as they are.
         - Do NOT pass mobile selection props (pass undefined/null).
       - Hide the DragOverlay on mobile (wrap in `{!isMobile && activeOrder ? ... : null}`).
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Confirm the file compiles and the hook is importable.
  </verify>
  <done>
    useIsMobile hook exists and returns boolean. InteractiveBoard conditionally disables DnD sensors on mobile and manages tap-to-move selection state. Desktop behavior is unchanged (same sensors, same DragOverlay).
  </done>
</task>

<task type="auto">
  <name>Task 2: Update DroppableColumn and DraggableOrderCard for tap-to-move on mobile</name>
  <files>
    src/components/board/droppable-column.tsx
    src/components/board/draggable-order-card.tsx
  </files>
  <action>
    1. Modify `src/components/board/droppable-column.tsx`:
       - Add optional props: `selectedOrderForMove?: string | null`, `onColumnTap?: (columnId: string) => void`, `isMobile?: boolean`.
       - Keep `useDroppable` hook as-is (it runs always to avoid conditional hook issues, but on mobile the column's drop styling is irrelevant since sensors are disabled).
       - On mobile when `selectedOrderForMove` is set:
         - Make the column header area tappable. Add an `onClick` handler on the column container (or a dedicated "Move here" banner) that calls `onColumnTap(column.id)`.
         - Show a visual indicator on the column: a subtle colored banner/bar at the top saying "Tap to move here" (use Tailwind classes: `bg-blue-50 border-blue-300 text-blue-600 text-xs text-center py-1.5 font-medium`). Only show this banner when `selectedOrderForMove` is set AND the selected order is NOT already in this column.
         - To determine if the order is already in this column, check if `orders.some(o => o.id === selectedOrderForMove)` -- if true, show "Selected card is here" in muted gray instead.
       - Pass `selectedOrderForMove` and `isMobile` down to DraggableOrderCard.
       - Pass through any new props from InteractiveBoard.

    2. Modify `src/components/board/draggable-order-card.tsx`:
       - Add optional props: `selectedOrderForMove?: string | null`, `onSelectForMove?: (orderId: string) => void`, `isMobile?: boolean`.
       - Keep `useDraggable` hook as-is (runs always, but on mobile with no sensors it never activates).
       - On mobile:
         - Remove drag handle icon (the `⋮⋮` grip indicator). Hide it with a conditional: only show when `!isMobile`.
         - Change cursor from `cursor-grab` to `cursor-pointer` on mobile.
         - The main card div's onClick: on mobile, if `onSelectForMove`, call `onSelectForMove(order.id)` INSTEAD of `onClick()` (which opens the modal). The "Voir details" button still calls `onClick()` directly to open the modal.
         - When `order.id === selectedOrderForMove`, show a selected state: `ring-2 ring-blue-500 bg-blue-50/50 scale-[1.02]` (blue highlight ring).
       - On desktop:
         - Everything works exactly as before. The `onSelectForMove` prop is undefined so the onClick falls through to the existing `onClick()` (modal open) behavior.
         - Keep drag handle, cursor-grab, all existing drag classes.
       - Important: The "Voir details" / "Details" button handlers remain unchanged on BOTH mobile and desktop -- they always call `onClick()` which opens the modal. Only the card body tap behavior changes on mobile.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Open the board at `/board` in browser dev tools mobile viewport (375px width). Verify:
    1. Tapping a card highlights it with blue ring
    2. Column headers show "Tap to move here" banner
    3. Tapping a column moves the card and triggers green success animation
    4. "Voir details" button still opens modal
    5. Switch to desktop viewport (1024px) -- drag-and-drop works as before
  </verify>
  <done>
    On mobile: cards are tappable to select, columns show move target, tapping column moves the order. On desktop: drag-and-drop is completely unchanged. The "Voir details" button opens the detail modal on both mobile and desktop.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Mobile viewport (<768px): tap card -> blue highlight -> tap column -> card moves with green animation -> selection clears
3. Mobile viewport: tap card -> tap same card -> deselects
4. Mobile viewport: "Voir details" button opens modal regardless of selection state
5. Mobile viewport: no drag handle icons visible, no drag-and-drop activation possible
6. Desktop viewport (>=768px): drag-and-drop works identically to before (PointerSensor + TouchSensor)
7. Desktop viewport: no "Tap to move here" banners visible
8. Status updates still fire correctly through onOrderUpdate -> API
</verification>

<success_criteria>
Mobile users can reliably move orders between columns using tap-to-select then tap-column-to-move. Desktop drag-and-drop is unaffected. No regressions in order detail modal, status updates, or visual styling.
</success_criteria>

<output>
After completion, create `.planning/quick/001-reliable-mobile-kanban/001-SUMMARY.md`
</output>
