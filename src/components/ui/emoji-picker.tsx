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
          // Radix's outside-click detection sees Shadow DOM clicks as "outside" the popover
          // because: (1) e.target is the PopoverContent node, not the click target, and
          // (2) Shadow DOM event retargeting is unreliable on touch devices (iPad).
          // Fix: block ALL outside-dismiss. The popover closes via onEmojiSelect or Escape.
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
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
