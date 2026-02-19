function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugify(name: string, neighborhood: string): string {
  const nameSlug = toSlug(name);
  const neighborhoodSlug = toSlug(neighborhood);
  return `${nameSlug}-${neighborhoodSlug}`;
}

export function generateUniqueSlug(
  name: string,
  neighborhood: string,
  existingSlugs: Set<string>,
): string {
  const base = slugify(name, neighborhood);

  if (!existingSlugs.has(base)) {
    return base;
  }

  let counter = 2;
  while (existingSlugs.has(`${base}-${counter}`)) {
    counter++;
  }

  return `${base}-${counter}`;
}
