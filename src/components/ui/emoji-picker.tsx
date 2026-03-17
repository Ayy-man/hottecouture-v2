'use client';

import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useState } from 'react';

// CRITICAL: ssr: false prevents "window is not defined" on server render.
// emoji-mart registers custom elements using browser APIs (Shadow DOM, IntersectionObserver).
// Next.js 14 pre-renders 'use client' components on the server during SSG/SSR passes,
// so the 'use client' boundary alone is not sufficient — dynamic() is required.
const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

interface EmojiPickerProps {
  value: string; // current emoji displayed on button
  onSelect: (emoji: string) => void; // called with emoji.native Unicode string e.g. "✂️"
  disabled?: boolean;
}

export function EmojiPicker({ value, onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="relative w-9 h-9 text-lg flex items-center justify-center rounded border border-border hover:border-primary-400 touch-manipulation min-h-[44px] min-w-[44px]"
          aria-label="Choisir un emoji"
        >
          {value}
          <span className="absolute bottom-0 right-0 text-[9px] bg-white rounded-full leading-none">
            ✏️
          </span>
        </button>
      </PopoverTrigger>
      {/* w-auto lets the Picker control its own width (~352px). Do NOT set a fixed width. */}
      <PopoverContent
        className="w-auto p-0 border-0 shadow-xl"
        align="start"
        onInteractOutside={(e) => {
          // emoji-mart renders inside Shadow DOM (<em-emoji-picker> custom element).
          // Radix sees ALL Shadow DOM interactions as "outside" the popover because
          // e.target is retargeted to the shadow host or PopoverContent itself.
          // On iPad Safari, retargeting is even less reliable.
          // Block all outside-dismiss. Popover closes via onEmojiSelect or Escape.
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Same protection for pointer events — fires separately on touch devices
          // and can cause premature dismissal on iPad Safari.
          e.preventDefault();
        }}
        onFocusOutside={(e) => {
          // Prevent focus-based dismissal when tapping inside Shadow DOM on iPad.
          // Focus moves to Shadow DOM internals, Radix interprets as focus-outside.
          e.preventDefault();
        }}
      >
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => {
            // Guard for undefined native on non-standard emoji
            if (emoji?.native) {
              onSelect(emoji.native);
              setOpen(false);
            }
          }}
          theme="light"
          locale="fr"
          previewPosition="none"
          skinTonePosition="none"
        />
      </PopoverContent>
    </Popover>
  );
}
