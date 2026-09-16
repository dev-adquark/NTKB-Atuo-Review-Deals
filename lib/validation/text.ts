import type { GeneratedContentResult } from "@/lib/content-engine/types";

/** Flattens every visible text field into one array, for scanning/placeholder-resolution. */
export function collectContentTextFields(result: GeneratedContentResult): string[] {
  const fields: string[] = [result.title];
  if (result.metaDescription) fields.push(result.metaDescription);
  if (result.content.intro) fields.push(result.content.intro);
  for (const section of result.content.sections) {
    fields.push(section.heading, section.content);
  }
  if (result.content.pros) fields.push(...result.content.pros);
  if (result.content.cons) fields.push(...result.content.cons);
  if (result.content.comparison) {
    for (const item of result.content.comparison) {
      fields.push(item.name);
      if (item.summary) fields.push(item.summary);
    }
  }
  if (result.content.faq) {
    for (const item of result.content.faq) {
      fields.push(item.question, item.answer);
    }
  }
  if (result.content.conclusion) fields.push(result.content.conclusion);
  return fields;
}

export function joinContentText(result: GeneratedContentResult): string {
  return collectContentTextFields(result).join("\n");
}

/** Finds any unresolved `{placeholder}` tokens left in the text after substitution. */
export function findUnresolvedPlaceholders(text: string): string[] {
  const matches = text.match(/\{[a-zA-Z_]+\}/g);
  return matches ? Array.from(new Set(matches)) : [];
}
