// Breadcrumb component — renders a "Home > Section > Page" trail.
// Last item with no href is treated as the current page and rendered as plain text.

import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Chevron separator between breadcrumb items
function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 12 12"
      className="text-text-faint shrink-0"
      aria-hidden="true"
    >
      <path
        d="M4 2l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {/* Separator before every item except the first */}
              {index > 0 && <Chevron />}

              {/* Current page — no link */}
              {isLast || !item.href ? (
                <span
                  className={`text-xs ${isLast ? 'text-white' : 'text-text-muted'}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                /* Ancestor link */
                <Link
                  href={item.href}
                  className="text-xs text-text-muted hover:text-white transition-colors underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
