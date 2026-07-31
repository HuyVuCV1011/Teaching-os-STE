/**
 * Safely parses assignment instructions which might be raw JSON or HTML-wrapped JSON.
 * Returns the parsed object if successful, or null otherwise.
 */
export interface ParsedAssignmentQuestion {
  id?: string
  content?: string
  options?: string[]
  answer?: string
  status?: 'approved' | 'rejected' | 'draft' | string
  answerFormat?: 'text' | 'file' | 'both' | string
  answerSource?: string
  data?: unknown
  source?: 'ai_generator' | 'manual' | string
  source_file?: string | null
  points?: number
  [key: string]: unknown
}

export interface ParsedAssignmentFile {
  name: string
  size: number
  storage_path?: string
  file?: File | null
  downloadable: boolean
  previewable: boolean
}

export type ParsedAssignmentInstructions =
  | ParsedAssignmentQuestion[]
  | {
      questions?: ParsedAssignmentQuestion[]
      data_files?: ParsedAssignmentFile[]
      reference_files?: ParsedAssignmentFile[]
      mcqWeightPercent?: number
      essayWeightPercent?: number
      [key: string]: unknown
    }

export function parseAssignmentInstructions(instructions: string | null | undefined): ParsedAssignmentInstructions | null {
  if (!instructions) return null;
  
  const trimmed = instructions.trim();
  if (!trimmed) return null;

  // 1. Try parsing directly
  try {
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return JSON.parse(trimmed);
    }
  } catch {
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
  } catch {
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
  } catch {
    // Ignore
  }

  try {
    const firstBracket = decoded.indexOf('[');
    const lastBracket = decoded.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const potentialJson = decoded.substring(firstBracket, lastBracket + 1);
      return JSON.parse(potentialJson);
    }
  } catch {
    // Ignore
  }

  return null;
}
