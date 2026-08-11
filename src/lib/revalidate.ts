import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  TypeWithID,
} from 'payload'

type PathsFor<T> = (doc: T) => string[]

export function revalidateAfterChange<T extends TypeWithID = TypeWithID>(
  paths: PathsFor<T>,
): CollectionAfterChangeHook<T> {
  return ({ doc, previousDoc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    const targets = new Set([...paths(doc), ...(previousDoc ? paths(previousDoc) : [])])
    for (const path of targets) revalidatePath(path)
    return doc
  }
}

export function revalidateAfterDelete<T extends TypeWithID = TypeWithID>(
  paths: PathsFor<T>,
): CollectionAfterDeleteHook<T> {
  return ({ doc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    for (const path of paths(doc)) revalidatePath(path)
    return doc
  }
}

export function revalidateGlobal(paths: string[]): GlobalAfterChangeHook {
  return ({ doc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    for (const path of paths) revalidatePath(path)
    return doc
  }
}
