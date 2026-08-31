import { z } from 'zod'
import boardsJson from '../data/boards.json'

/**
 * The board list, in the order Notion lists its options — which is the tab order.
 *
 * Deliberately a plain JSON import rather than a content collection: Astro's
 * `file()` loader keys entries by id and offers no ordering guarantee, and order
 * is the whole point of this file. Validation happens here instead, so a
 * malformed boards.json fails the build rather than rendering an empty tab strip.
 */
const schema = z.array(z.object({ name: z.string().min(1) })).min(1)

export const boards: string[] = schema.parse(boardsJson).map(board => board.name)
