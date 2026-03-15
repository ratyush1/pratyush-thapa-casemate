import React from 'react';

/**
 * Reusable star rating component.
 * Props:
 *   value       – current rating (1-5)
 *   onChange    – called with new rating when interactive; omit for display-only
 *   size        – 'sm' | 'md' | 'lg' (default 'md')
 *   showLabel   – show numeric label next to stars (default false)
 */
export default function StarRating({ value = 0, onChange, size = 'md', showLabel = false }) {
  const [hovered, setHovered] = React.useState(0);
  const interactive = typeof onChange === 'function';

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };
  const iconSize = sizes[size] || sizes.md;
  const display = interactive ? (hovered || value) : value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={interactive ? () => onChange(star) : undefined}
          onMouseEnter={interactive ? () => setHovered(star) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          aria-label={interactive ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
        >
          <svg
            className={`${iconSize} transition-colors ${
              star <= display
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-slate-600 fill-slate-600'
            }`}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </span>
      ))}
      {showLabel && value > 0 && (
        <span className="ml-1.5 text-sm text-slate-400">{Number(value).toFixed(1)}</span>
      )}
    </div>
  );
}
