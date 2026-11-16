import type {ButtonHTMLAttributes} from 'react'

import {Icon} from './Icon'
import type {IconName} from './Icon'

type ButtonVariant = 'default' | 'light' | 'glass' | 'navy' | 'red' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: IconName
  /** Stretch to the full width of the container. */
  block?: boolean
}

export function Button({
  variant = 'default',
  icon,
  block = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'ecc-btn',
    variant !== 'default' && `ecc-btn--${variant}`,
    block && 'ecc-btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}