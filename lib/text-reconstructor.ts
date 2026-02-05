// lib/text-reconstructor.ts
// Reconstructs "before" and "after" bill text from markup changes

import { MarkupChange } from './database.types';

export interface BillVersionText {
  fullText: string
  statuteChanges: Map<string, string>
}

export interface ReconstructedVersions {
  before: BillVersionText
  after: BillVersionText
}

/**
 * Reconstruct bill versions from markup changes
 * Takes the current text and applies changes to create before/after versions
 */
export function reconstructVersions(
  currentText: string,
  changes: MarkupChange[]
): ReconstructedVersions {
  
  console.log('🔄 Reconstructing bill versions...');
  
  let beforeText = currentText;
  let afterText = currentText;
  
  const beforeStatutes = new Map<string, string>();
  const afterStatutes = new Map<string, string>();
  
  // Sort changes by position in text (using context to locate)
  const sortedChanges = [...changes].sort((a, b) => {
    const aPos = currentText.indexOf(a.context);
    const bPos = currentText.indexOf(b.context);
    return aPos - bPos;
  });
  
  for (const change of sortedChanges) {
    const searchText = change.context;
    
    switch (change.type) {
      case 'deletion':
        // Before version includes the deleted text
        // After version removes it
        const deletePattern = new RegExp(
          escapeRegex(searchText) + '\\s*' + escapeRegex(change.deletedText),
          'g'
        );
        afterText = afterText.replace(deletePattern, searchText);
        break;
        
      case 'addition':
        // Before version doesn't have the added text
        // After version includes it
        const addPattern = new RegExp(
          escapeRegex(searchText) + '\\s*' + escapeRegex(change.addedText),
          'g'
        );
        beforeText = beforeText.replace(addPattern, searchText);
        break;
        
      case 'substitution':
        // Before version has old text
        // After version has new text
        const substPattern = new RegExp(
          escapeRegex(searchText) + '\\s*' + escapeRegex(change.addedText),
          'g'
        );
        beforeText = beforeText.replace(
          substPattern,
          searchText + ' ' + change.deletedText
        );
        break;
    }
    
    // Track statute-specific text
    if (change.location) {
      const beforeStatute = extractStatuteText(beforeText, change.location);
      const afterStatute = extractStatuteText(afterText, change.location);
      
      if (beforeStatute) beforeStatutes.set(change.location, beforeStatute);
      if (afterStatute) afterStatutes.set(change.location, afterStatute);
    }
  }
  
  console.log('✅ Bill versions reconstructed');
  
  return {
    before: {
      fullText: beforeText,
      statuteChanges: beforeStatutes
    },
    after: {
      fullText: afterText,
      statuteChanges: afterStatutes
    }
  };
}

/**
 * Extract the text of a specific statute from bill text
 */
export function extractStatuteText(
  billText: string,
  statuteRef: string
): string | null {
  // Look for the statute reference and extract surrounding text
  const pattern = new RegExp(
    statuteRef.replace(/\./g, '\\.') + '[\\s\\S]{0,500}',
    'i'
  );
  
  const match = billText.match(pattern);
  return match ? match[0] : null;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a human-readable diff summary
 */
export function generateDiffSummary(changes: MarkupChange[]): string {
  const additions = changes.filter(c => c.type === 'addition').length;
  const deletions = changes.filter(c => c.type === 'deletion').length;
  const substitutions = changes.filter(c => c.type === 'substitution').length;
  
  const parts: string[] = [];
  
  if (substitutions > 0) {
    parts.push(`${substitutions} substitution${substitutions !== 1 ? 's' : ''}`);
  }
  if (additions > 0) {
    parts.push(`${additions} addition${additions !== 1 ? 's' : ''}`);
  }
  if (deletions > 0) {
    parts.push(`${deletions} deletion${deletions !== 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) return 'No changes detected';
  
  return `${parts.join(', ')}`;
}

/**
 * Compare two versions of text and generate a detailed diff
 */
export function generateDetailedDiff(
  beforeText: string,
  afterText: string
): Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }> {
  
  const beforeLines = beforeText.split('\n');
  const afterLines = afterText.split('\n');
  
  const diff: Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }> = [];
  
  // Simple line-by-line diff
  let beforeIndex = 0;
  let afterIndex = 0;
  
  while (beforeIndex < beforeLines.length || afterIndex < afterLines.length) {
    const beforeLine = beforeLines[beforeIndex];
    const afterLine = afterLines[afterIndex];
    
    if (beforeLine === afterLine) {
      // Lines match - unchanged
      diff.push({ type: 'unchanged', text: beforeLine });
      beforeIndex++;
      afterIndex++;
    } else if (beforeIndex >= beforeLines.length) {
      // Only after lines left - added
      diff.push({ type: 'added', text: afterLine });
      afterIndex++;
    } else if (afterIndex >= afterLines.length) {
      // Only before lines left - removed
      diff.push({ type: 'removed', text: beforeLine });
      beforeIndex++;
    } else {
      // Lines differ - check if removed or added
      const afterHasLine = afterLines.slice(afterIndex).includes(beforeLine);
      const beforeHasLine = beforeLines.slice(beforeIndex).includes(afterLine);
      
      if (afterHasLine && !beforeHasLine) {
        // This line was added
        diff.push({ type: 'added', text: afterLine });
        afterIndex++;
      } else if (beforeHasLine && !afterHasLine) {
        // This line was removed
        diff.push({ type: 'removed', text: beforeLine });
        beforeIndex++;
      } else {
        // Both differ - treat as substitution
        diff.push({ type: 'removed', text: beforeLine });
        diff.push({ type: 'added', text: afterLine });
        beforeIndex++;
        afterIndex++;
      }
    }
  }
  
  return diff;
}

/**
 * Extract all statute references from text
 */
export function extractAllStatuteReferences(text: string): string[] {
  const pattern = /R\.S\.\s*\d+:\d+(\.\d+)?/g;
  const matches = text.match(pattern) || [];
  return Array.from(new Set(matches)); // Remove duplicates
}

/**
 * Generate a summary of which statutes are affected
 */
export function summarizeStatuteImpacts(
  beforeStatutes: Map<string, string>,
  afterStatutes: Map<string, string>
): Array<{ statute: string; changeType: 'created' | 'amended' | 'repealed' | 'unchanged' }> {
  
  const summary: Array<{ statute: string; changeType: 'created' | 'amended' | 'repealed' | 'unchanged' }> = [];
  
  // Check all statutes in after version
  for (const [statute, afterText] of afterStatutes) {
    const beforeText = beforeStatutes.get(statute);
    
    if (!beforeText) {
      summary.push({ statute, changeType: 'created' });
    } else if (beforeText !== afterText) {
      summary.push({ statute, changeType: 'amended' });
    } else {
      summary.push({ statute, changeType: 'unchanged' });
    }
  }
  
  // Check for repealed statutes (in before but not after)
  for (const statute of beforeStatutes.keys()) {
    if (!afterStatutes.has(statute)) {
      summary.push({ statute, changeType: 'repealed' });
    }
  }
  
  return summary;
}