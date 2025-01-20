import { DataInteractive as HeadlessDataInteractive } from '@headlessui/react'
import { NavLink as RemixLink, type LinkProps } from 'react-router'
import React from 'react'

export const Link = React.forwardRef(function Link(
  props: { href: string | LinkProps['to'] } & Omit<LinkProps, 'to'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <HeadlessDataInteractive>
      <RemixLink {...props} to={props.href} ref={ref} />
    </HeadlessDataInteractive>
  )
})