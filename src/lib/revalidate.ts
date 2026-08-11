import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

type PathsFor<T> = (doc: T) => string[]

export function revalidateAfterChange<T>(paths: PathsFor<T>): CollectionAfterChangeHook {
  return ({ doc, previousDoc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    const targets = new Set([...paths(doc as T), ...(previousDoc ? paths(previousDoc as T) : [])])
    for (const path of targets) revalidatePath(path)
    return doc
  }
}

export function revalidateAfterDelete<T>(paths: PathsFor<T>): CollectionAfterDeleteHook {
  return ({ doc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    for (const path of paths(doc as T)) revalidatePath(path)
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
