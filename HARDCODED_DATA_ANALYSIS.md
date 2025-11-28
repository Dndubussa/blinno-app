# Hardcoded Data Analysis

## Summary

This document lists all instances of hardcoded data found in the codebase that should ideally be:
1. Fetched from the database/API
2. Moved to configuration files
3. Made translatable
4. Replaced with environment variables

## 🔴 Critical - Should Fetch from API

### 1. **FeaturedCreators.tsx** (Page)
**Location**: `src/pages/FeaturedCreators.tsx`
**Issue**: Hardcoded creator profiles with:
- Names: "Paul Clement", "Joel Lwaga", "Godfrey Steven"
- Locations: "Nairobi, Kenya", "Dar es Salaam, Tanzania", "Kampala, Uganda"
- Descriptions, ratings, review counts
- Image paths: "/Paul Clement.jpg", "/Joel Lwaga.jpg", "/Godfrey Steven.jpg"

**Fix**: Should fetch from API endpoint like `/api/creators/featured`

### 2. **FeaturedCreators.tsx** (Component)
**Location**: `src/components/FeaturedCreators.tsx`
**Issue**: Hardcoded creator list with names, categories, locations, followers, badges

**Fix**: Should fetch from API

### 3. **Jobs.tsx**
**Location**: `src/pages/Jobs.tsx`
**Issue**: Hardcoded job listings (3 jobs with titles, companies, locations, salaries)
**Note**: Has comment "This would be populated from API"

**Fix**: Should fetch from `/api/jobs` endpoint

### 4. **Education.tsx**
**Location**: `src/pages/Education.tsx`
**Issue**: Hardcoded course listings (3 courses with titles, instructors, students, prices)
**Note**: Has comment "This would be populated from API"

**Fix**: Should fetch from `/api/courses` endpoint

## 🟡 Medium Priority - Mock/Test Data

### 5. **Testimonials.tsx**
**Location**: `src/components/Testimonials.tsx`
**Issue**: Hardcoded testimonial data:
- Names: "Amina Hassan", "John Mwakasege", "Fatuma Juma", "David Mollel", "Grace Kileo"
- Roles, ratings, testimonial text
- Placeholder images: "/placeholder.svg"

**Fix**: Should fetch from API or database, or make configurable

### 6. **CreatorGallery.tsx**
**Location**: `src/components/CreatorGallery.tsx`
**Issue**: Hardcoded gallery items:
- Titles: "Local Landscapes", "African Fashion Design", etc.
- Creators: "Sarah Mwangi", "Amina Hassan", etc.
- Categories: "Photography", "Fashion", "Art", etc.

**Fix**: Should fetch from API

### 7. **SearchBar.tsx**
**Location**: `src/components/SearchBar.tsx`
**Issue**: Hardcoded search suggestions:
- Categories list
- Creators list: "Amina Hassan - Digital Artist", etc.
- Content list: "Latest Movies", "Local Art Exhibition", etc.

**Fix**: Should fetch from API or generate from actual data

## 🟢 Low Priority - Configuration/URLs

### 8. **Marketplace.tsx**
**Location**: `src/pages/Marketplace.tsx`
**Issue**: Hardcoded URLs:
- `https://www.blinno.app/course/${product.id}`
- `https://www.blinno.app/product/${product.id}`
- Placeholder images: `https://via.placeholder.com/400x300?text=No+Image`

**Fix**: 
- Use environment variable for base URL
- Use relative paths instead of absolute URLs
- Create a constant for placeholder image URL

### 9. **MediaTest.tsx**
**Location**: `src/pages/MediaTest.tsx`
**Issue**: Hardcoded sample video/audio URLs:
- `https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4`
- `https://sample-videos.com/audio/mp3/crowd-cheering.mp3`

**Fix**: This is a test page, so acceptable, but could use environment variables

### 10. **Placeholder Images**
**Locations**: Multiple files
**Issue**: Using:
- `https://via.placeholder.com/...` (multiple sizes)
- `/placeholder.svg`

**Fix**: Create a constant or utility function for placeholder images

## 📋 Recommendations

### Immediate Actions:
1. **Create API endpoints** for:
   - Featured creators: `GET /api/creators/featured`
   - Jobs: `GET /api/jobs`
   - Courses: `GET /api/courses`
   - Testimonials: `GET /api/testimonials` (or fetch from reviews)

2. **Update components** to fetch data from API instead of using hardcoded arrays

3. **Add loading states** while fetching data

4. **Add error handling** for failed API calls

### Configuration:
1. **Create constants file** for:
   - Placeholder image URLs
   - Base URLs (use environment variables)
   - Default values

2. **Use environment variables** for:
   - API base URL (already done in `src/lib/api.ts`)
   - App URL (for generating links)

### Translation:
1. **Make hardcoded text translatable**:
   - Job types: "Full-time", "Part-time"
   - Job status: "Apply Now", "Post a Job"
   - Course actions: "Enroll", "Teach a Course"

## Files to Update

1. `src/pages/FeaturedCreators.tsx` - Fetch from API
2. `src/components/FeaturedCreators.tsx` - Fetch from API
3. `src/pages/Jobs.tsx` - Fetch from API
4. `src/pages/Education.tsx` - Fetch from API
5. `src/components/Testimonials.tsx` - Fetch from API or make configurable
6. `src/components/CreatorGallery.tsx` - Fetch from API
7. `src/components/SearchBar.tsx` - Fetch suggestions from API
8. `src/pages/Marketplace.tsx` - Use environment variables for URLs
9. Create `src/lib/constants.ts` for placeholder images and default values

## Status

- ✅ Translation issues fixed
- ⏳ Hardcoded data still present (needs API integration)
- ⏳ Placeholder images need constants
- ⏳ URLs need environment variables

