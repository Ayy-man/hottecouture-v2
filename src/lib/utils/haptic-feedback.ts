/**
 * Haptic feedback utility for mobile devices
 */

export function triggerHapticFeedback(
  type: 'light' | 'medium' | 'heavy' = 'light'
) {
  // Check if the device supports vibration
  if ('vibrate' in navigator) {
    switch (type) {
      case 'light':
        navigator.vibrate(10); // Very short vibration
        break;
      case 'medium':
        navigator.vibrate(20); // Medium vibration
        break;
      case 'heavy':
        navigator.vibrate([10, 10, 10]); // Pattern vibration
        break;
    }
  }
}

export function addHapticToButton(
  button: HTMLElement,
  type: 'light' | 'medium' | 'heavy' = 'light'
) {
  const handlePress = () => {
    triggerHapticFeedback(type);
  };

  // Add event listeners for different interaction types
  button.addEventListener('touchstart', handlePress, { passive: true });
  button.addEventListener('mousedown', handlePress);

  // Cleanup function
  return () => {
    button.removeEventListener('touchstart', handlePress);
    button.removeEventListener('mousedown', handlePress);
  };
}

export function createHapticButtonProps(
  type: 'light' | 'medium' | 'heavy' = 'light'
) {
  return {
    onTouchStart: () => triggerHapticFeedback(type),
    onMouseDown: () => triggerHapticFeedback(type),
    className: 'btn-haptic',
  };
}
