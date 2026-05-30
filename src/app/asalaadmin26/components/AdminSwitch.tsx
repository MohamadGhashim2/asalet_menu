'use client'

import type { ReactNode } from 'react'

type AdminSwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: ReactNode
  ariaLabel?: string
  disabled?: boolean
  labelPosition?: 'start' | 'end'
  className?: string
  labelClassName?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function AdminSwitch({
  checked,
  onCheckedChange,
  label,
  ariaLabel,
  disabled = false,
  labelPosition = 'end',
  className,
  labelClassName,
}: AdminSwitchProps) {
  const labelNode = label ? <span className={labelClassName}>{label}</span> : null
  const fieldLayoutClassName = className ?? 'inline-flex items-center gap-3 rounded-lg'

  const switchTrack = (
    <span
      aria-hidden="true"
      dir="ltr"
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 overflow-hidden rounded-full border transition-colors duration-200 ease-in-out',
        checked ? 'border-brand-burgundy bg-brand-burgundy' : 'border-gray-300 bg-gray-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-[20px]' : 'translate-x-0',
        )}
      />
    </span>
  )

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={typeof label === 'string' ? label : ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'text-right touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        fieldLayoutClassName,
      )}
    >
      {labelPosition === 'start' ? labelNode : switchTrack}
      {labelPosition === 'start' ? switchTrack : labelNode}
    </button>
  )
}
