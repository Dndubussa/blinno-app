/**
 * Basic Watermarking Utility for Digital Books
 * 
 * Note: Full watermarking requires specialized libraries for each format.
 * This is a basic implementation that adds metadata watermarks.
 * For production, consider using:
 * - PDF: pdf-lib or pdfjs-dist
 * - EPUB: epub-gen or similar
 * - For other formats, watermarking should be done before upload
 */

import crypto from 'crypto';

/**
 * Generate a watermark text for a book purchase
 * @param buyerId - ID of the buyer
 * @param bookId - ID of the book
 * @param buyerEmail - Email of the buyer
 * @returns Watermark text
 */
export function generateWatermarkText(
  buyerId: string,
  bookId: string,
  buyerEmail: string
): string {
  const timestamp = new Date().toISOString();
  const hash = crypto
    .createHash('sha256')
    .update(`${buyerId}-${bookId}-${timestamp}`)
    .digest('hex')
    .substring(0, 8);
  
  return `Purchased by ${buyerEmail} on ${new Date(timestamp).toLocaleDateString()} - ID: ${hash}`;
}

/**
 * Add watermark metadata to download response
 * This adds a watermark in the response headers and metadata
 * For actual file watermarking, use specialized libraries
 */
export function addWatermarkMetadata(
  bookTitle: string,
  buyerEmail: string,
  purchaseDate: string
): Record<string, string> {
  return {
    'X-Book-Watermark': `Purchased by ${buyerEmail}`,
    'X-Book-Title': bookTitle,
    'X-Purchase-Date': purchaseDate,
    'X-Content-Protected': 'true',
  };
}

/**
 * Generate a unique download token with watermark info
 * This token can be used to track downloads and add watermarks
 */
export function generateWatermarkedDownloadToken(
  bookId: string,
  buyerId: string,
  buyerEmail: string
): string {
  const payload = {
    bookId,
    buyerId,
    buyerEmail,
    timestamp: Date.now(),
  };
  
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  return token;
}

/**
 * Verify and decode watermark token
 */
export function verifyWatermarkToken(token: string): {
  bookId: string;
  buyerId: string;
  buyerEmail: string;
  timestamp: number;
} | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    
    // Verify token is not too old (24 hours)
    const age = Date.now() - payload.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

