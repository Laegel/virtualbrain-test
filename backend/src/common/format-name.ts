/** "mr-mime" -> "Mr Mime" */
export const formatName = (slug: string): string => slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
