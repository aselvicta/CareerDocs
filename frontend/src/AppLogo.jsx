import logoUrl from './assets/logo.png'

/**
 * Brand mark from `src/assets/logo.png`.
 * Prefer class names: `app-logo--auth`, `app-logo--nav`, `app-logo--public` (see index.css).
 * Optional `size` / `height` set inline max-height for one-off use.
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

export { logoUrl }
