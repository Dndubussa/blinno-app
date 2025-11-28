# Translation Issues Found

## ✅ Fixed Issues
1. **CategoriesGrid.tsx** - Fixed all `categories.*` to `homepage.categories.*`
2. **CategoryCard.tsx** - Fixed hardcoded "View" to use `t("common.view")`

## ⚠️ Remaining Issues

### 1. FeaturedCreators.tsx
- **Line 54, 90, 126**: `"View Profile"` - Hardcoded, should use translation
- **Line 15**: `"Featured Creators"` - Hardcoded title
- **Line 17**: Description text - Hardcoded
- **Line 135**: `"Become a Featured Creator"` - Hardcoded
- **Line 141**: `"Get Started"` - Hardcoded

### 2. Disputes.tsx
- **Line 396**: `"View Details"` - Hardcoded, translation exists at `common.viewDetails`

### 3. SubscriptionPricing.tsx
- **Line 707**: `"Current Plan"` - Hardcoded, translation exists at `pricing.subscription.currentPlan`
- **Line 709**: `"Volume Requirement Not Met"` - Hardcoded, translation exists at `pricing.percentage.notMet`
- **Line 711**: `"Select Plan"` - Hardcoded, translation exists at `pricing.subscription.selectPlan`
- **Line 704**: `"Processing..."` - Hardcoded, translation exists at `common.processing`
- **Line 824**: `"Get Started"` - Hardcoded
- **Line 825**: `"Subscribe Now"` - Hardcoded

### 4. Other Components
- Various hardcoded strings in admin components
- Some hardcoded text in forms and buttons

## Recommendations

1. **Add missing translations** to `en.json`:
   - `featuredCreators.viewProfile`
   - `featuredCreators.title`
   - `featuredCreators.description`
   - `featuredCreators.becomeFeatured`
   - `common.getStarted`
   - `common.subscribeNow`

2. **Update components** to use translations:
   - FeaturedCreators.tsx
   - Disputes.tsx
   - SubscriptionPricing.tsx

3. **Consider adding** a translation key validation script to catch these issues early.

