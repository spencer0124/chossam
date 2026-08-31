/**
 * Finding the three properties this site needs in a Notion data source.
 *
 * The database's property *keys* are opaque (`:PGV`, `Ylrt`) and its visible
 * names are Korean and rename-able, so neither is a safe thing to hardcode.
 * Types are: a database has exactly one `title`, and the board is the only
 * `multi_select`. Resolution keys off type, with a name override for the day
 * a second multi_select column appears.
 */

/** One property as the official API describes it in a data source schema. */
export interface SchemaProperty {
  id: string
  name: string
  type: string
  multi_select?: { options?: Array<{ name: string }> }
  select?: { options?: Array<{ name: string }> }
}

export type Schema = Record<string, SchemaProperty>

export interface ResolvedProperties {
  /** Property name holding the post title. */
  title: string
  /** Property name holding the board. */
  board: string
  /** Property name holding the publish date. */
  date: string
  /** Board names, in the order Notion lists them — this is the tab order. */
  boardOptions: string[]
}

export interface PropertyOverrides {
  title?: string
  board?: string
  date?: string
}

/** Property types that can carry a board name, most specific first. */
const BOARD_TYPES = ['multi_select', 'select'] as const

function pick(
  schema: Schema,
  role: string,
  types: readonly string[],
  override?: string
): SchemaProperty {
  if (override) {
    const named = schema[override]
    if (!named) {
      throw new Error(
        `Notion schema has no property named "${override}" (configured as the ${role}). ` +
          `Available: ${Object.keys(schema).join(', ')}`
      )
    }
    if (!types.includes(named.type)) {
      throw new Error(
        `Property "${override}" is a ${named.type}, which cannot serve as the ${role} ` +
          `(expected ${types.join(' or ')}).`
      )
    }
    return named
  }

  for (const type of types) {
    const match = Object.values(schema).find(property => property.type === type)
    if (match) return match
  }

  throw new Error(
    `Notion schema has no ${types.join(' or ')} property to use as the ${role}. ` +
      `Available: ${Object.keys(schema).map(k => `${k} (${schema[k]?.type})`).join(', ')}`
  )
}

function optionsOf(property: SchemaProperty): string[] {
  const options = property.multi_select?.options ?? property.select?.options ?? []
  return options.map(option => option.name)
}

/**
 * Resolve the title / board / date properties, or throw naming what is missing.
 * Throwing beats defaulting: a silent miss would sync every post with an empty
 * board and quietly empty the site.
 */
export function resolveProperties(
  schema: Schema,
  overrides: PropertyOverrides = {}
): ResolvedProperties {
  const title = pick(schema, 'title', ['title'], overrides.title)
  const board = pick(schema, 'board', BOARD_TYPES, overrides.board)
  const date = pick(schema, 'date', ['date'], overrides.date)

  return {
    title: title.name,
    board: board.name,
    date: date.name,
    boardOptions: optionsOf(board)
  }
}
