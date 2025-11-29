# Book Seller Upload Guide

## Current Status

### ✅ What Exists:
1. **Seller Role**: The platform has a `seller` role that can be assigned to users
2. **Digital Products System**: There's a `digital_products` table with an `ebook` category specifically for books
3. **Digital Products API**: Basic endpoints exist for viewing and purchasing digital products
4. **File Storage**: Supabase Storage is configured for file uploads

### ❌ What's Missing:
1. **Book Upload Endpoints**: No CREATE/UPDATE endpoints for digital products (books)
2. **File Format Support**: Current upload middleware only allows images (JPEG, PNG, WebP, GIF)
3. **Book Upload UI**: No frontend interface for sellers to upload books
4. **File Size Limits**: Current limit is 10MB (may need to be increased for books)

---

## Supported Book Formats (To Be Implemented)

Based on industry standards and the `ebook` category in the database, the following formats should be supported:

### Recommended Formats:
1. **PDF** (`application/pdf`)
   - Most common format
   - Universal compatibility
   - Good for text-based books

2. **EPUB** (`application/epub+zip`)
   - Industry standard for ebooks
   - Reflowable text
   - Works on most e-readers

3. **MOBI** (`application/x-mobipocket-ebook`)
   - Amazon Kindle format
   - Widely used

4. **AZW3** (`application/vnd.amazon.ebook`)
   - Amazon Kindle format (newer)

5. **FB2** (`application/x-fictionbook+xml`)
   - FictionBook format
   - Popular in some regions

### File Size Recommendations:
- **PDF**: Up to 50MB (for books with images)
- **EPUB**: Up to 20MB (typically smaller)
- **MOBI/AZW3**: Up to 20MB
- **FB2**: Up to 10MB

---

## Implementation Requirements

### 1. Update Upload Middleware

**File**: `backend/src/middleware/upload.ts`

**Changes Needed**:
- Add book/document MIME types to allowed file types
- Create separate upload middleware for documents/books
- Increase file size limit for book uploads
- Create a new storage bucket for books/documents

**Example Implementation**:
```typescript
// Book/document file filter
const bookFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedBookTypes = [
    'application/pdf',                    // PDF
    'application/epub+zip',              // EPUB
    'application/x-mobipocket-ebook',    // MOBI
    'application/vnd.amazon.ebook',      // AZW3
    'application/x-fictionbook+xml',     // FB2
  ];
  
  if (allowedBookTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, EPUB, MOBI, AZW3, and FB2 are allowed.'));
  }
};

// Book upload middleware with larger size limit
export const uploadBook = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_BOOK_FILE_SIZE || '52428800'), // 50MB default
  },
  fileFilter: bookFileFilter,
});
```

### 2. Create Digital Products Routes

**File**: `backend/src/routes/digitalProducts.ts`

**Endpoints to Add**:
- `POST /api/digital-products` - Create digital product (book)
- `PUT /api/digital-products/:id` - Update digital product
- `DELETE /api/digital-products/:id` - Delete digital product
- `GET /api/digital-products/my` - Get seller's own products
- `POST /api/digital-products/:id/download` - Download purchased book

**Example CREATE Endpoint**:
```typescript
router.post('/', authenticate, uploadBook.fields([
  { name: 'file', maxCount: 1 },      // Book file (PDF, EPUB, etc.)
  { name: 'thumbnail', maxCount: 1 },  // Book cover image
  { name: 'preview', maxCount: 1 }     // Preview file (optional)
]), async (req: AuthRequest, res) => {
  // Implementation
});
```

### 3. Create Storage Bucket for Books

**Action Required**:
- Create a new Supabase Storage bucket: `books` or `digital-products`
- Configure with appropriate file size limits
- Set up RLS policies for secure access

### 4. Update Environment Variables

**Add to `.env`**:
```env
# Book upload settings
ALLOWED_BOOK_TYPES=application/pdf,application/epub+zip,application/x-mobipocket-ebook,application/vnd.amazon.ebook,application/x-fictionbook+xml
MAX_BOOK_FILE_SIZE=52428800  # 50MB
BOOK_STORAGE_BUCKET=books
```

### 5. Create Frontend Upload Interface

**Location**: Seller Dashboard or new Digital Products page

**Features Needed**:
- File upload component for book files
- Cover image upload
- Preview file upload (optional)
- Book metadata form (title, description, price, category)
- Format validation
- File size validation
- Progress indicator

---

## Current Database Schema

The `digital_products` table already exists with the following structure:

```sql
CREATE TABLE digital_products (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'artwork', 'photo', 'video', 'template', 
    'preset', 'ebook', 'music', 'other'
  )),
  file_url TEXT NOT NULL,        -- Main book file
  preview_url TEXT,               -- Preview/sample
  thumbnail_url TEXT,              -- Cover image
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TSh',
  tags TEXT[],
  download_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**For Books**: Use `category = 'ebook'`

---

## Recommended Implementation Steps

### Phase 1: Backend Setup
1. ✅ Update upload middleware to support book formats
2. ✅ Create book storage bucket in Supabase
3. ✅ Add CREATE/UPDATE/DELETE endpoints for digital products
4. ✅ Add download endpoint with access control
5. ✅ Update file size limits

### Phase 2: Frontend Implementation
1. ✅ Create book upload form in seller dashboard
2. ✅ Add file format validation
3. ✅ Add preview functionality
4. ✅ Create book management interface
5. ✅ Add book listing in marketplace

### Phase 3: Testing & Optimization
1. ✅ Test all supported formats
2. ✅ Optimize file storage
3. ✅ Add download tracking
4. ✅ Implement DRM/watermarking (optional)

---

## File Format Details

### PDF (Portable Document Format)
- **MIME Type**: `application/pdf`
- **Extension**: `.pdf`
- **Max Size**: 50MB recommended
- **Use Case**: Text books, manuals, documents with images
- **Compatibility**: Universal

### EPUB (Electronic Publication)
- **MIME Type**: `application/epub+zip`
- **Extension**: `.epub`
- **Max Size**: 20MB recommended
- **Use Case**: Reflowable ebooks, novels
- **Compatibility**: Most e-readers (except Kindle)

### MOBI (Mobipocket)
- **MIME Type**: `application/x-mobipocket-ebook`
- **Extension**: `.mobi`
- **Max Size**: 20MB recommended
- **Use Case**: Amazon Kindle (older devices)
- **Compatibility**: Kindle devices

### AZW3 (Amazon Kindle Format 8)
- **MIME Type**: `application/vnd.amazon.ebook`
- **Extension**: `.azw3`
- **Max Size**: 20MB recommended
- **Use Case**: Amazon Kindle (newer devices)
- **Compatibility**: Kindle devices

### FB2 (FictionBook)
- **MIME Type**: `application/x-fictionbook+xml`
- **Extension**: `.fb2`
- **Max Size**: 10MB recommended
- **Use Case**: Fiction books, popular in some regions
- **Compatibility**: Various e-readers

---

## Security Considerations

1. **File Validation**: Always validate file MIME type, not just extension
2. **Virus Scanning**: Consider adding virus scanning for uploaded files
3. **Access Control**: Only allow sellers to upload their own books
4. **Download Protection**: Secure download links with tokens
5. **DRM**: Consider adding DRM for premium books (optional)

---

## Next Steps

To enable book uploads for sellers:

1. **Immediate**: Update upload middleware to support book formats
2. **Short-term**: Create digital products CRUD endpoints
3. **Medium-term**: Build frontend upload interface
4. **Long-term**: Add advanced features (previews, DRM, analytics)

---

## Summary

**Current Answer**: 
- ❌ Book sellers **cannot** currently upload books
- ✅ The infrastructure exists (database, digital products system)
- ✅ The `ebook` category is defined in the database
- ⚠️ File upload system needs to be extended to support book formats
- ⚠️ CREATE/UPDATE endpoints for digital products need to be implemented

**To Enable Book Uploads**:
1. Extend upload middleware to accept PDF, EPUB, MOBI, AZW3, FB2
2. Create digital products CRUD API endpoints
3. Build frontend upload interface
4. Configure book storage bucket

**Recommended Formats**:
- **Primary**: PDF, EPUB (most universal)
- **Secondary**: MOBI, AZW3 (for Kindle users)
- **Optional**: FB2 (for specific markets)

