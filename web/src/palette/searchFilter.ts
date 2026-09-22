export interface SearchItem {
  id: string
  label: string
  hint?: string
  favorite?: boolean
}

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const filterSearchItems = <T extends SearchItem>(items: T[], query: string): T[] => {
  const tokens = normalize(query).split(/\s+/).filter((token) => token.length > 0)
  if (tokens.length === 0) {
    return items
  }
  return items.filter((item) => {
    const haystack = normalize(`${item.label} ${item.hint ?? ''}`)
    return tokens.every((token) => haystack.includes(token))
  })
}
