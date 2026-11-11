import { createContext, useContext } from 'react'

/** App-wide actions the shell owns: import dialog, command palette, help and email panels. */
export const ShellContext = createContext({
  openImport: () => {},
  openPalette: () => {},
  openHelp: () => {},
  openEmailWriter: () => {},
})

export function useShell() {
  return useContext(ShellContext)
}
