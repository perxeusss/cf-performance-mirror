import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type {
  ExtensionSettings,
  TimelineValue,
} from '../../types/settings';

import type { Theme } from '../../domain/theme';

interface Props {
  value: TimelineValue;
  customStart: string;
  customEnd: string;
  customContestFrom: string;
  customContestTo: string;
  isDark: boolean;
  theme: Theme;
  onChange: (patch: Partial<ExtensionSettings>) => void;

  // Parent owns the custom-range forms.
  onOpenCustomDate: () => void;
  onOpenCustomContest: () => void;
}

type Step = 'root' | 'time' | 'contest';

const TIME_OPTIONS: Array<{
  label: string;
  value: TimelineValue;
}> = [
  { label: 'All time', value: 'all' },
  { label: 'Last month', value: '1' },
  { label: 'Last 3 months', value: '3' },
  { label: 'Last 6 months', value: '6' },
  { label: 'Last year', value: '12' },
  { label: 'Last 2 years', value: '24' },
  { label: 'Custom range…', value: 'custom' },
];

const CONTEST_OPTIONS: Array<{
  label: string;
  value: TimelineValue;
}> = [
  { label: 'Last 5 contests', value: 'c5' },
  { label: 'Last 10 contests', value: 'c10' },
  { label: 'Last 20 contests', value: 'c20' },
  { label: 'Custom range…', value: 'cc' },
];

function isContestWise(value: TimelineValue): boolean {
  return (
    value === 'c5' ||
    value === 'c10' ||
    value === 'c20' ||
    value === 'cc'
  );
}

function labelFor(props: Props): string {
  if (
    props.value === 'custom' &&
    props.customStart &&
    props.customEnd
  ) {
    return `${props.customStart} → ${props.customEnd}`;
  }

  if (
    props.value === 'cc' &&
    props.customContestFrom &&
    props.customContestTo
  ) {
    const from = Number.parseInt(
      props.customContestFrom,
      10,
    );

    const to = Number.parseInt(
      props.customContestTo,
      10,
    );

    if (
      !Number.isNaN(from) &&
      !Number.isNaN(to)
    ) {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);

      return lo === 1
        ? `Last ${hi} contests`
        : `Contests ${lo}–${hi} most recent`;
    }

    return 'Custom contests';
  }

  switch (props.value) {
    case '1':
      return 'Last month';

    case '3':
      return 'Last 3 months';

    case '6':
      return 'Last 6 months';

    case '12':
      return 'Last year';

    case '24':
      return 'Last 2 years';

    case 'c5':
      return 'Last 5 contests';

    case 'c10':
      return 'Last 10 contests';

    case 'c20':
      return 'Last 20 contests';

    default:
      return 'All time';
  }
}

export function TimelineSelector(props: Props) {
  const [open, setOpen] = useState(false);

  /*
   * Legacy behavior:
   * open directly on the currently active branch.
   *
   * root is still used when navigating back from a submenu.
   */
  const [step, setStep] = useState<Step>(
    isContestWise(props.value)
      ? 'contest'
      : 'time',
  );

  // Screen-anchored position for the fixed-position dropdown.
  const [pos, setPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleDocumentClick = (
      event: MouseEvent,
    ) => {
      if (
        !ref.current?.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      'click',
      handleDocumentClick,
    );

    return () => {
      document.removeEventListener(
        'click',
        handleDocumentClick,
      );
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(
      isContestWise(props.value)
        ? 'contest'
        : 'time',
    );
  }, [open, props.value]);

  // Fixed-position popover: close on scroll/resize so it never
  // drifts away from the button it's anchored to.
  useEffect(() => {
    if (!open) {
      return;
    }

    const close = () => setOpen(false);

    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const label = useMemo(
    () => labelFor(props),
    [
      props.value,
      props.customStart,
      props.customEnd,
      props.customContestFrom,
      props.customContestTo,
    ],
  );

  const active = props.value !== 'all';

  /*
   * IMPORTANT:
   * Custom range is handled by Controls.tsx.
   * This component only closes the dropdown and
   * tells the parent which custom form to open.
   */
  const choose = (value: TimelineValue) => {
    if (value === 'custom') {
      setOpen(false);
      props.onOpenCustomDate();
      return;
    }

    if (value === 'cc') {
      setOpen(false);
      props.onOpenCustomContest();
      return;
    }

    setOpen(false);

    props.onChange({
      timeline: value,
    });
  };

  const rootStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div
      className="cfpm-timeline-wrap"
      ref={ref}
      style={rootStyle}
    >
      <button
        ref={buttonRef}
        className={`cfpm-pill-btn ${
          active ? 'active' : ''
        }`}
        style={{
          background: active
            ? props.theme.btnActiveBg
            : props.theme.btnBg,
          color: active
            ? props.theme.btnActiveText
            : props.theme.btnText,
          border: `1px solid ${
            active
              ? props.theme.btnActiveBorder
              : props.theme.btnBorder
          }`,
          gap: 5,
        }}
        onClick={event => {
          event.stopPropagation();

          if (open) {
            setOpen(false);
            return;
          }

          const rect =
            buttonRef.current?.getBoundingClientRect();

          if (rect) {
            setPos({
              top: rect.bottom + 6,
              right: window.innerWidth - rect.right,
            });
          }

          setOpen(true);

          setStep(
            isContestWise(props.value)
              ? 'contest'
              : 'time',
          );
        }}
        title={label}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            opacity: 0.7,
          }}
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
          />
          <path d="M7 4v3.5l2 1.5" />
        </svg>

        <span
          className="cfpm-ellipsis"
          style={{
            maxWidth: 180,
          }}
        >
          {label}
        </span>

        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            opacity: 0.5,
          }}
        >
          <path d="M1.5 3l3 3 3-3" />
        </svg>
      </button>

      {open && pos && (
        <div
          id="cfpm-timeline-dd"
          className="cfpm-dropdown cfpm-timeline-dropdown"
          style={{
            background: props.theme.dropdownBg,
            border: `1px solid ${props.theme.dropdownBorder}`,
            display: 'block',
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 10000,
            borderRadius: 7,
            overflow: 'hidden',
            minWidth: 220,
            boxShadow:
              '0 6px 24px rgba(0,0,0,0.13), 0 1.5px 4px rgba(0,0,0,0.07)',
          }}
          onClick={event =>
            event.stopPropagation()
          }
        >
          <div
            className="cfpm-dropdown-header"
            style={{
              background:
                props.theme.dropdownSection,
              borderBottom:
                `1px solid ${props.theme.dropdownBorder}`,
            }}
          >
            {step !== 'root' && (
              <button
                className="cfpm-back-btn"
                title="Back"
                onClick={() =>
                  setStep('root')
                }
              >
                ‹
              </button>
            )}

            <span>
              {step === 'root'
                ? 'Filter by'
                : step === 'time'
                  ? 'Time-wise'
                  : 'Contest-wise'}
            </span>
          </div>

          {step === 'root' && (
            <>
              <div
                className="cfpm-timeline-opt"
                style={{
                  color: props.theme.text,
                  background: 'transparent',
                  justifyContent:
                    'space-between',
                }}
                onClick={() =>
                  setStep('time')
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      opacity: 0.55,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <circle
                        cx="7"
                        cy="7"
                        r="5.5"
                      />
                      <path d="M7 4v3.5l2 1.5" />
                    </svg>
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: props.theme.text,
                    }}
                  >
                    Time-wise
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {!isContestWise(
                    props.value,
                  ) && (
                    <span
                      style={{
                        fontSize: 10,
                        color:
                          props.theme.muted,
                      }}
                    >
                      ✓
                    </span>
                  )}

                  <span
                    style={{
                      opacity: 0.35,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 9 9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M2 1.5l4 3-4 3" />
                    </svg>
                  </span>
                </div>
              </div>

              <div
                className="cfpm-timeline-opt"
                style={{
                  color: props.theme.text,
                  background: 'transparent',
                  justifyContent:
                    'space-between',
                }}
                onClick={() =>
                  setStep('contest')
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      opacity: 0.55,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="10"
                        height="9"
                        rx="1.5"
                      />
                      <path d="M2 6.5h10M5 1.5v3M9 1.5v3" />
                    </svg>
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: props.theme.text,
                    }}
                  >
                    Contest-wise
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isContestWise(
                    props.value,
                  ) && (
                    <span
                      style={{
                        fontSize: 10,
                        color:
                          props.theme.muted,
                      }}
                    >
                      ✓
                    </span>
                  )}

                  <span
                    style={{
                      opacity: 0.35,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 9 9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M2 1.5l4 3-4 3" />
                    </svg>
                  </span>
                </div>
              </div>
            </>
          )}

          {step === 'time' &&
            TIME_OPTIONS.map(option => {
              const selected =
                props.value ===
                option.value;

              return (
                <div
                  key={option.value}
                  className="cfpm-timeline-opt"
                  style={{
                    color: props.theme.text,
                    background: selected
                      ? props.isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                    justifyContent:
                      'space-between',
                  }}
                  onClick={() =>
                    choose(option.value)
                  }
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: selected
                        ? 600
                        : 400,
                      color:
                        props.theme.text,
                    }}
                  >
                    {option.label}
                  </span>

                  {selected && (
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          props.theme.muted,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}

          {step === 'contest' &&
            CONTEST_OPTIONS.map(option => {
              const selected =
                props.value ===
                option.value;

              return (
                <div
                  key={option.value}
                  className="cfpm-timeline-opt"
                  style={{
                    color: props.theme.text,
                    background: selected
                      ? props.isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)'
                      : 'transparent',
                    justifyContent:
                      'space-between',
                  }}
                  onClick={() =>
                    choose(option.value)
                  }
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: selected
                        ? 600
                        : 400,
                      color:
                        props.theme.text,
                    }}
                  >
                    {option.label}
                  </span>

                  {selected && (
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          props.theme.muted,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}