/**
 * Safely parses assignment instructions which might be raw JSON or HTML-wrapped JSON.
 * Returns the parsed object if successful, or null otherwise.
 */
export function parseAssignmentInstructions(instructions: string | null | undefined): any {
  if (!instructions) return null;
  
  const trimmed = instructions.trim();
  if (!trimmed) return null;

  // 1. Try parsing directly
  try {
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return JSON.parse(trimmed);
    }
  } catch (e) {
    // Ignore and proceed to extraction
  }

  // 2. Strip HTML tags and decode common entities
  // E.g. <p>{"questions":...}</p> -> {"questions":...}
  const stripped = trimmed.replace(/<[^>]*>/g, '').trim();
  
  const decoded = stripped
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 3. Try parsing the decoded, stripped string
  try {
    if ((decoded.startsWith('{') && decoded.endsWith('}')) || (decoded.startsWith('[') && decoded.endsWith(']'))) {
      return JSON.parse(decoded);
    }
  } catch (e) {
    // Ignore and try substring extraction
  }

  // 4. Try extracting the first valid JSON block
  try {
    const firstCurly = decoded.indexOf('{');
    const lastCurly = decoded.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
      const potentialJson = decoded.substring(firstCurly, lastCurly + 1);
      return JSON.parse(potentialJson);
    }
  } catch (e) {
    // Ignore
  }

  try {
    const firstBracket = decoded.indexOf('[');
    const lastBracket = decoded.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const potentialJson = decoded.substring(firstBracket, lastBracket + 1);
      return JSON.parse(potentialJson);
    }
  } catch (e) {
    // Ignore
  }

  return null;
}
