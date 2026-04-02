interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'orange' | 'green' | 'blue' | 'amber' | 'default'
  large?: boolean
}

const ACCENT_CLASSES = {
  orange:  'text-[#d97706]',
  green:   'text-[#34d399]',
  blue:    'text-[#60a5fa]',
  amber:   'text-[#fbbf24]',
  default: 'text-foreground',
}

export function StatCard({ label, value, sub, accent = 'default', large = false }: StatCardProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-muted-foreground lowercase tracking-wide">
        {label}:
      </span>
      <span
        className={[
          large ? 'text-2xl' : 'text-xl',
          'font-bold tabular-nums',
          ACCENT_CLASSES[accent],
        ].join(' ')}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[12px] text-muted-foreground/60">{sub}</span>
      )}
    </div>
  )
}

// Inline stat for the header row (matches the image style: "label: VALUE")
export function InlineStat({
  label,
  value,
  sub,
  accent = 'default',
}: {
  label: string
  value: string
  sub?: string
  accent?: StatCardProps['accent']
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[13px] text-muted-foreground">{label}:</span>
      <span className={['text-sm font-bold tabular-nums', ACCENT_CLASSES[accent]].join(' ')}>
        {value}
      </span>
      {sub && (
        <span className="text-[12px] text-muted-foreground/50">{sub}</span>
      )}
    </span>
  )
}
