export function truncateText(text: string, maxLength = 80): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

export function splitTags(input: string): string[] {
  return input
    .split(/[,，\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}
