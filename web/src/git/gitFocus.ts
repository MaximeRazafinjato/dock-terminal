const PANEL_SELECTOR = '[data-git-panel]'
const ROW_SELECTOR = '[data-git-row]'

export const gitPanel = (): HTMLElement | null => document.querySelector<HTMLElement>(PANEL_SELECTOR)

export const isInGitPanel = (element: Element | null): boolean => Boolean(element?.closest(PANEL_SELECTOR))

export const focusGitPanel = (): void => {
  const panel = gitPanel()
  const target = panel?.querySelector<HTMLElement>(`${ROW_SELECTOR}[tabindex="0"]`) ?? panel?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? panel
  target?.focus()
}

export const focusGitRow = (key: string): boolean => {
  const row = Array.from(gitPanel()?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? []).find((candidate) => candidate.dataset.gitRow === key)
  row?.focus()
  return Boolean(row)
}

export const refocusGitIfLost = (): void => {
  requestAnimationFrame(() => {
    if (document.activeElement === document.body) {
      focusGitPanel()
    }
  })
}
