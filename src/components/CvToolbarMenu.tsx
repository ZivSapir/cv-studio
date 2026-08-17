import { useEffect, useRef, useState } from 'react';
import { TbDots } from 'react-icons/tb';

export type ToolbarMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  isDanger?: boolean;
  onSelect: () => void;
};

type CvToolbarMenuProps = {
  label: string;
  items: ToolbarMenuItem[];
};

export const CvToolbarMenu = ({
  label,
  items,
}: CvToolbarMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className="app-menu"
      ref={containerRef}
    >
      <button
        type="button"
        className={
          isOpen
            ? 'app-button app-button-secondary app-menu-trigger app-menu-trigger-open'
            : 'app-button app-button-secondary app-menu-trigger'
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen((open) => !open)}
      >
        <TbDots aria-hidden />
      </button>
      {isOpen ? (
        <div
          className="app-menu-list"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={
                item.isDanger
                  ? 'app-menu-item app-menu-item-danger'
                  : 'app-menu-item'
              }
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
