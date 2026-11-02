/** Join class names, skipping falsy values */
export const cx = (...classes: (string | false | null | undefined)[]): string => classes.filter(Boolean).join(' ')

/** "mr-mime" -> "Mr Mime" */
export const formatName = (slug: string): string => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
