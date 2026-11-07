// Shared strict geometry oracle. No tolerance: a fractional clipped edge is
// a failure even when the control's centre can still receive a pointer event.
export function fullyContained(rect, clip) {
  return rect.left >= clip.left && rect.top >= clip.top &&
    rect.right <= clip.right && rect.bottom <= clip.bottom;
}

