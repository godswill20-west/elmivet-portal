import {useEffect, useRef, useState} from 'react'
import type {KeyboardEvent} from 'react'

import {Icon} from '../components/Icon'

export interface RowMenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
  /** Shown but not selectable (e.g. the user lacks permission). */
  disabled?: boolean
  /** Tooltip explaining a disabled item. */
  title?: string
}

interface RowMenuProps {
  /** Accessible name of the trigger, e.g. "Actions for <title>". */
  label: string
  items: RowMenuItem[]
  /** Called whenever the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
}

/** "⋯" actions menu. Closes on Escape (returning focus), outside click and Tab; arrow keys move between items. */
export function RowMenu({label, items, onOpenChange}: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const notifyOpenChange = useRef(onOpenChange)
  notifyOpenChange.current = onOpenChange

  useEffect(() => {
    notifyOpenChange.current?.(open)
  }, [open])
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
  }, [open])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const entries = [
        ...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
      ]
      const at = entries.indexOf(document.activeElement as HTMLElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      entries[(at + step + entries.length) % entries.length]?.focus()
    }
  }

  return (
    <div className="ecc-row-actions" ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={trigger}
        className="ecc-dots"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="dots" />
      </button>
      <div className={`ecc-menu${open ? ' is-open' : ''}`} role="menu" aria-label={label}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={item.danger ? 'ecc-danger' : undefined}
            disabled={item.disabled}
            title={item.title}
            onClick={() => {
              setOpen(false)
              item.onSelect()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}