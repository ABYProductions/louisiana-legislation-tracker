import type { CSSProperties } from 'react'
import { DISCLAIMER_SHORT, DISCLAIMER_LONG, LEGIS_URL } from '@/lib/disclaimer'

interface Props {
  form: 'short' | 'long'
  style?: CSSProperties
  linkColor?: string
}

export default function DisclaimerText({ form, style, linkColor = '#C4922A' }: Props) {
  const text = form === 'short' ? DISCLAIMER_SHORT : DISCLAIMER_LONG
  const parts = text.split('legis.la.gov')

  return (
    <span style={style}>
      {parts[0]}
      <a
        href={LEGIS_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: linkColor, textDecoration: 'underline', textUnderlineOffset: '2px' }}
      >
        legis.la.gov
      </a>
      {parts[1]}
    </span>
  )
}
