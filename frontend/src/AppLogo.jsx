import logoUrl from './assets/logo-mark.png'

/**
 * Brand mark (the "C" + document icon). Pair with <Wordmark /> where the name should be written.
 * Size classes: `app-logo--nav`, `app-logo--auth`, `app-logo--public` (see index.css).
 */
export function AppLogo({ className = '', size, height, style, alt = '', ...rest }) {
  const maxH = size ?? height
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={`app-logo ${className}`.trim()}
      style={maxH != null ? { maxHeight: maxH, width: 'auto', ...style } : style}
      {...rest}
    />
  )
}

/** Two-tone "CareerDocs" name written next to the mark. */
export function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`.trim()}>
      <span className="wordmark__career">Career</span><span className="wordmark__docs">Docs</span>
    </span>
  )
}
