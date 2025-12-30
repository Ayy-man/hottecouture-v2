"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, useAnimation } from "framer-motion";
import { Archive, ArchiveRestore, LucideIcon } from "lucide-react";
import { useState } from "react";

interface HoldToArchiveButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart'> {
  holdDuration?: number;
  onComplete?: () => void;
  variant?: 'archive' | 'unarchive';
  icon?: LucideIcon;
  defaultText?: string;
  holdingText?: string;
}

const variantStyles = {
  archive: {
    base: "bg-amber-100 dark:bg-amber-200 hover:bg-amber-100 dark:hover:bg-amber-200 text-amber-600 dark:text-amber-700 border border-amber-200 dark:border-amber-300",
    progress: "bg-amber-200/50 dark:bg-amber-300/50",
    icon: Archive,
    defaultText: "Hold to Archive",
    holdingText: "Release to Cancel",
  },
  unarchive: {
    base: "bg-green-100 dark:bg-green-200 hover:bg-green-100 dark:hover:bg-green-200 text-green-600 dark:text-green-700 border border-green-200 dark:border-green-300",
    progress: "bg-green-200/50 dark:bg-green-300/50",
    icon: ArchiveRestore,
    defaultText: "Hold to Restore",
    holdingText: "Release to Cancel",
  },
};

function HoldToArchiveButton({
  className,
  holdDuration = 2000,
  onComplete,
  variant = 'archive',
  icon,
  defaultText,
  holdingText,
  disabled,
  ...props
}: HoldToArchiveButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const controls = useAnimation();
  const styles = variantStyles[variant];
  const Icon = icon || styles.icon;
  const displayDefaultText = defaultText || styles.defaultText;
  const displayHoldingText = holdingText || styles.holdingText;

  async function handleHoldStart() {
    if (disabled) return;
    setIsHolding(true);
    controls.set({ width: "0%" });
    try {
      await controls.start({
        width: "100%",
        transition: {
          duration: holdDuration / 1000,
          ease: "linear",
        },
      });
      // Animation completed successfully - trigger the callback
      if (onComplete) {
        onComplete();
      }
    } catch {
      // Animation was interrupted (user released early)
    }
  }

  function handleHoldEnd() {
    setIsHolding(false);
    controls.stop();
    controls.start({
      width: "0%",
      transition: { duration: 0.1 },
    });
  }

  return (
    <Button
      className={cn(
        "min-w-40 relative overflow-hidden touch-none",
        styles.base,
        className
      )}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onMouseLeave={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
      onTouchCancel={handleHoldEnd}
      disabled={disabled}
      {...props}
    >
      <motion.div
        initial={{ width: "0%" }}
        animate={controls}
        className={cn(
          "absolute left-0 top-0 h-full",
          styles.progress
        )}
      />
      <span className="relative z-10 w-full flex items-center justify-center gap-2">
        <Icon className="w-4 h-4" />
        {!isHolding ? displayDefaultText : displayHoldingText}
      </span>
    </Button>
  );
}

export { HoldToArchiveButton };
