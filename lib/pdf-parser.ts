// lib/pdf-parser.ts
// Extracts formatted text (underline/strikethrough) from Louisiana legislative PDFs

import * as pdfjs from 'pdfjs-dist';
import { MarkupChange } from './database.types';

// Configure PDF.js for Node.js environment
if (typeof window === 'undefined') {
  // Node environment - use worker
  const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface StyledTextSpan {
  text: string
  isUnderlined: boolean
  isStrikethrough: boolean
  fontName: string
  fontSize: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * Extract formatted text from PDF buffer
 * Preserves underline and strikethrough formatting
 */
export async function extractFormattedTextFromPDF(
  pdfBuffer: Buffer
): Promise<StyledTextSpan[]> {
  console.log('📄 Parsing PDF...');
  
  try {
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`📄 PDF has ${pdf.numPages} pages`);
    
    const allSpans: StyledTextSpan[] = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract styled text items
      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        
        const span: StyledTextSpan = {
          text: item.str,
          isUnderlined: detectUnderline(item),
          isStrikethrough: detectStrikethrough(item),
          fontName: item.fontName || '',
          fontSize: item.height || 0,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height
        };
        
        allSpans.push(span);
      }
    }
    
    console.log(`✅ Extracted ${allSpans.length} text spans from PDF`);
    return allSpans;
    
  } catch (error) {
    console.error('❌ Error parsing PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF parsing failed: ${errorMessage}`);
  }
}

/**
 * Detect if text has underline formatting
 * Louisiana PDFs typically use specific fonts or naming conventions
 */
function detectUnderline(textItem: any): boolean {
  const fontName = textItem.fontName?.toLowerCase() || '';
  
  // Method 1: Check font name for underline indicators
  if (fontName.includes('underline') || 
      fontName.includes('italic') ||  // Sometimes italics indicate underline
      fontName.includes('oblique')) {
    return true;
  }
  
  // Method 2: Check for specific Louisiana legislative PDF fonts
  // Update these patterns based on actual Louisiana PDF fonts
  const underlinePatterns = [
    /times.*italic/i,
    /arial.*italic/i,
    /helvetica.*oblique/i
  ];
  
  if (underlinePatterns.some(pattern => pattern.test(fontName))) {
    return true;
  }
  
  return false;
}

/**
 * Detect if text has strikethrough formatting
 */
function detectStrikethrough(textItem: any): boolean {
  const fontName = textItem.fontName?.toLowerCase() || '';
  
  // Louisiana PDFs may use specific patterns for struck text
  const strikethroughPatterns = [
    /strike/i,
    /delete/i,
    /crossed/i,
    /linethrough/i
  ];
  
  if (strikethroughPatterns.some(pattern => pattern.test(fontName))) {
    return true;
  }
  
  return false;
}

/**
 * Parse markup changes from styled text spans
 * Identifies additions, deletions, and substitutions
 */
export function parseChangesFromMarkup(
  spans: StyledTextSpan[]
): MarkupChange[] {
  console.log('🔍 Parsing markup changes...');
  
  const changes: MarkupChange[] = [];
  let currentLocation = '';
  let contextBuffer = '';
  
  const CONTEXT_LENGTH = 200;
  
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    
    // Detect statute references (R.S. 17:123)
    const statuteMatch = span.text.match(/R\.S\.\s*\d+:\d+(\.\d+)?/);
    if (statuteMatch) {
      currentLocation = statuteMatch[0];
    }
    
    // Found strikethrough (deleted) text
    if (span.isStrikethrough) {
      let deletedText = span.text;
      let j = i + 1;
      
      // Collect consecutive strikethrough spans
      while (j < spans.length && spans[j].isStrikethrough) {
        deletedText += spans[j].text;
        j++;
      }
      
      // Look ahead for replacement (underlined text)
      let addedText = '';
      let k = j;
      while (k < spans.length && spans[k].isUnderlined) {
        addedText += spans[k].text;
        k++;
      }
      
      changes.push({
        type: addedText ? 'substitution' : 'deletion',
        location: currentLocation,
        deletedText: deletedText.trim(),
        addedText: addedText.trim(),
        context: contextBuffer.slice(-CONTEXT_LENGTH)
      });
      
      i = (addedText ? k : j) - 1;
      contextBuffer = '';
      continue;
    }
    
    // Found underlined (added) text without preceding strikethrough
    if (span.isUnderlined && (!spans[i-1] || !spans[i-1].isStrikethrough)) {
      let addedText = span.text;
      let j = i + 1;
      
      // Collect consecutive underlined spans
      while (j < spans.length && spans[j].isUnderlined) {
        addedText += spans[j].text;
        j++;
      }
      
      changes.push({
        type: 'addition',
        location: currentLocation,
        deletedText: '',
        addedText: addedText.trim(),
        context: contextBuffer.slice(-CONTEXT_LENGTH)
      });
      
      i = j - 1;
      contextBuffer = '';
      continue;
    }
    
    // Regular text - add to context
    contextBuffer += span.text;
    if (contextBuffer.length > CONTEXT_LENGTH * 2) {
      contextBuffer = contextBuffer.slice(-CONTEXT_LENGTH);
    }
  }
  
  console.log(`✅ Found ${changes.length} markup changes`);
  return changes;
}

/**
 * Fetch PDF from URL and return buffer
 */
export async function fetchPDFBuffer(url: string): Promise<Buffer> {
  console.log(`📥 Downloading PDF from: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Louisiana-Legislation-Tracker/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ Downloaded PDF: ${(buffer.length / 1024).toFixed(2)} KB`);
    return buffer;
    
  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF download failed: ${errorMessage}`);
  }
}

/**
 * Extract statute references from markup changes
 */
export function extractStatuteReferences(changes: MarkupChange[]): string[] {
  const refs = new Set<string>();
  
  for (const change of changes) {
    if (change.location) {
      refs.add(change.location);
    }
    
    // Also check in text for additional references
    const pattern = /R\.S\.\s*\d+:\d+(\.\d+)?/g;
    
    const deletedMatches = change.deletedText.match(pattern) || [];
    const addedMatches = change.addedText.match(pattern) || [];
    const contextMatches = change.context.match(pattern) || [];
    
    [...deletedMatches, ...addedMatches, ...contextMatches].forEach(ref => refs.add(ref));
  }
  
  return Array.from(refs);
}

/**
 * Generate a human-readable summary of changes
 */
export function summarizeChanges(changes: MarkupChange[]): string {
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
  
  return `Amendment makes ${parts.join(', ')}`;
}