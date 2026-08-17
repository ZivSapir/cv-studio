import { useEffect, useRef, useState } from 'react';
import { TbChevronDown } from 'react-icons/tb';
import type { CvVersion } from '../types/cv';

type VersionOption = {
  id: string;
  label: string;
};

type CvVersionSelectProps = {
  bases: CvVersion[];
  saved: CvVersion[];
  value: string;
  disabled?: boolean;
  onChange: (versionId: string) => void;
};

function formatVersionLabel(version: CvVersion): string {
  if (version.kind === 'saved' && (version.coverLetter?.trim() || version.personalNote?.trim())) {
    return `${version.label} · letter`;
  }

  return version.label;
}

export const CvVersionSelect = ({
  bases,
  saved,
  value,
  disabled,
  onChange,
}: CvVersionSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);

  const baseOptions: VersionOption[] = bases.map((version) => ({
    id: version.id,
    label: formatVersionLabel(version),
  }));
  const savedOptions: VersionOption[] = saved.map((version) => ({
    id: version.id,
    label: formatVersionLabel(version),
  }));
  const selectedLabel = [...baseOptions, ...savedOptions].find((option) => option.id === value)?.label
    ?? 'Select CV';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    selectedOptionRef.current?.scrollIntoView({
      block: 'nearest',
    });

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

  const renderOption = (
    option: VersionOption,
    isBase: boolean,
  ) => {
    const isSelected = option.id === value;

    return (
      <button
        key={option.id}
        ref={isSelected ? selectedOptionRef : undefined}
        type="button"
        role="option"
        aria-selected={isSelected}
        className={[
          'app-version-select-option',
          isBase ? 'app-version-select-option-base' : '',
          isSelected ? 'app-version-select-option-selected' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => {
          setIsOpen(false);
          onChange(option.id);
        }}
      >
        {option.label}
      </button>
    );
  };

  return (
    <div
      className="app-version-select"
      ref={containerRef}
    >
      <button
        type="button"
        id="cv-version"
        className={
          isOpen
            ? 'app-version-select-trigger app-version-select-trigger-open'
            : 'app-version-select-trigger'
        }
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Selected CV"
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }

          setIsOpen((open) => !open);
        }}
      >
        <span className="app-version-select-value">{selectedLabel}</span>
        <TbChevronDown aria-hidden />
      </button>
      {isOpen ? (
        <div
          className="app-version-select-menu"
          role="listbox"
          aria-labelledby="cv-version"
        >
          <div className="app-version-select-group-label">Base CVs</div>
          {baseOptions.map((option) => renderOption(option, true))}
          {savedOptions.length ? (
            <>
              <div className="app-version-select-group-label">Saved</div>
              {savedOptions.map((option) => renderOption(option, false))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
