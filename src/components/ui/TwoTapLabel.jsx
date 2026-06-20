import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { cn } from '@/lib/utils';

// Module-level registry: ensures only one tooltip is visible at a time across all instances
const registry = new Map();

function broadcast(activeId) {
  registry.forEach((hide, id) => {
    if (id !== activeId) hide();
  });
}

/**
 * Wraps a single child element and adds a two-tap label pattern on touch devices:
 *   - First tap: shows a floating label tooltip, blocks the action
 *   - Second tap (on same element): fires the action, hides tooltip
 *   - Tap elsewhere: dismisses tooltip without firing action
 * On non-touch (mouse) devices, the child behaves normally (single click fires action).
 *
 * Props:
 *   label           — the text to show in the tooltip
 *   disabled        — skip two-tap behavior entirely (e.g. when label is already visible)
 *   tooltipPosition — 'above' (default) or 'right' (for left-edge sidebars)
 *   wrapperClassName — extra classes on the wrapper div
 */
export default function TwoTapLabel({
  label,
  children,
  disabled = false,
  tooltipPosition = 'above',
  wrapperClassName,
}) {
  const [visible, setVisible] = useState(false);
  const [fixedStyle, setFixedStyle] = useState(null);
  const id = useId();
  const ref = useRef(null);
  const isTouchRef = useRef(false);

  // Register with global coordinator
  useEffect(() => {
    registry.set(id, () => setVisible(false));
    return () => registry.delete(id);
  }, [id]);

  // Dismiss when user taps outside this element
  useEffect(() => {
    if (!visible) return;
    const dismiss = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setVisible(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [visible]);

  // Compute viewport-relative position so tooltip escapes any overflow:hidden ancestors
  const computeStyle = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (tooltipPosition === 'right') {
      setFixedStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
        transform: 'translateY(-50%)',
        zIndex: 300,
      });
    } else {
      setFixedStyle({
        position: 'fixed',
        top: rect.top,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, calc(-100% - 8px))',
        zIndex: 300,
      });
    }
  }, [tooltipPosition]);

  const child = React.Children.only(children);

  const enriched = React.cloneElement(child, {
    onPointerDown: (e) => {
      if (e.pointerType === 'touch') isTouchRef.current = true;
      child.props.onPointerDown?.(e);
    },
    onClick: (e) => {
      if (!isTouchRef.current) {
        // Mouse / desktop: fire action immediately
        child.props.onClick?.(e);
        return;
      }
      if (!visible) {
        // First touch tap: reveal label, block action
        e.preventDefault();
        e.stopPropagation();
        computeStyle();
        broadcast(id);
        setVisible(true);
      } else {
        // Second touch tap: fire action
        setVisible(false);
        child.props.onClick?.(e);
      }
    },
  });

  return (
    <div ref={ref} className={cn('relative', wrapperClassName)}>
      {!disabled && visible && fixedStyle && (
        <div
          role="tooltip"
          style={fixedStyle}
          className="px-2.5 py-1 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap shadow-lg pointer-events-none select-none"
        >
          {tooltipPosition === 'right' && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-[5px] border-transparent border-r-gray-900" />
          )}
          {label}
          {tooltipPosition === 'above' && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-[5px] border-transparent border-t-gray-900" />
          )}
        </div>
      )}
      {disabled ? children : enriched}
    </div>
  );
}
