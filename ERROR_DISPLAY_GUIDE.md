# Error Display Guide

This document explains how the BLINNO platform displays error messages to users when things go wrong, such as when a user account doesn't exist or other errors occur.

## Overview

The platform uses multiple methods to display errors, depending on the context and severity:

1. **Toast Notifications** - Primary method for API errors and user actions
2. **Alert Components** - For persistent, important messages
3. **Form Validation Errors** - Inline errors for form fields
4. **Console Logging** - For debugging (not user-facing)

---

## 1. Toast Notifications (Primary Method)

### What They Are
Toast notifications are temporary pop-up messages that appear in the top-right corner (or bottom on mobile) of the screen. They automatically dismiss after a few seconds.

### When They're Used
- API errors (user not found, invalid credentials, etc.)
- Success messages
- General operation feedback
- Network errors

### How They Work

**Location:** `src/hooks/use-toast.ts` and `src/components/ui/toast.tsx`

**Usage Pattern:**
```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

try {
  await api.someMethod();
  toast({
    title: "Success",
    description: "Operation completed successfully",
  });
} catch (error: any) {
  toast({
    title: "Error",
    description: error.message || "Operation failed",
    variant: "destructive", // Red/destructive styling
  });
}
```

### Examples in the Codebase

#### Sign In Errors
```typescript
// src/pages/SignIn.tsx
try {
  await signIn(email, password);
} catch (error: any) {
  toast({
    title: t("auth.signIn.error"),
    description: error.message || t("auth.signIn.errorDescription"),
    variant: "destructive",
  });
}
```

#### Sign Up Errors (User Already Exists)
```typescript
// src/pages/SignUp.tsx
const { error, warning } = await signUp(...);

if (error) {
  const userExists = (error as any)?.userExists;
  if (userExists) {
    toast({
      title: t("common.error"),
      description: error.message,
      variant: "destructive",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/signin')}
        >
          {t("auth.signIn.title") || "Sign In"}
        </Button>
      ),
    });
  } else {
    toast({
      title: t("common.error"),
      description: error.message,
      variant: "destructive",
    });
  }
}
```

#### API Errors
```typescript
// src/pages/Messages.tsx
try {
  const data = await api.getMessages(userId);
} catch (error: any) {
  console.error("Error fetching messages:", error);
  toast({
    title: "Error",
    description: "Failed to load messages",
    variant: "destructive",
  });
}
```

### Toast Variants

1. **Default** (Success/Info)
   - Green/neutral background
   - Used for success messages
   - Example: "Account created successfully"

2. **Destructive** (Errors)
   - Red background
   - Used for errors and failures
   - Example: "Invalid credentials" or "User not found"

### Toast Features

- **Auto-dismiss**: Toasts automatically disappear after a set duration
- **Manual dismiss**: Users can click the X button to close
- **Action buttons**: Can include action buttons (e.g., "Sign In" button when user already exists)
- **Accessible**: Built with Radix UI for screen reader support
- **Position**: Top-right on desktop, bottom on mobile

---

## 2. Alert Components (Persistent Messages)

### What They Are
Alert components are persistent, prominent messages that stay visible on the page until the user navigates away or the condition changes.

### When They're Used
- Email verification status
- Important warnings
- Success confirmations that need to stay visible
- System-wide notifications

### Example Usage

```typescript
// src/pages/SignIn.tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Email verification alert
{user && user.email_verified === false && (
  <Alert className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>{t("auth.emailVerificationRequired")}</AlertTitle>
    <AlertDescription>
      {t("auth.emailVerificationDescription", { email: user.email })}
    </AlertDescription>
  </Alert>
)}

// Success message after signup
{location.state?.fromSignup && (
  <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
    <AlertCircle className="h-4 w-4 text-green-600" />
    <AlertTitle className="text-green-800 dark:text-green-200">
      {t("auth.signUp.signupSuccessful") || "Sign Up Successful!"}
    </AlertTitle>
    <AlertDescription className="text-green-700 dark:text-green-300">
      {t("auth.signUp.confirmEmailMessage") || "Your account has been created..."}
    </AlertDescription>
  </Alert>
)}
```

### Alert Variants

1. **Default**: Standard alert with border
2. **Destructive**: Red border and text for errors
3. **Custom**: Can be styled with custom colors (e.g., green for success)

---

## 3. Form Validation Errors (Inline)

### What They Are
Inline error messages that appear directly below form fields when validation fails.

### When They're Used
- Form field validation
- Input format errors
- Required field errors
- Password strength validation

### How They Work

**Location:** `src/components/ui/form.tsx`

**Usage Pattern:**
```typescript
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} type="email" />
      </FormControl>
      <FormMessage /> {/* Displays validation errors here */}
    </FormItem>
  )}
/>
```

The `FormMessage` component automatically displays validation errors from React Hook Form. Errors appear in red text below the input field.

---

## 4. Backend Error Handling

### Error Response Format

All backend errors follow a consistent format:
```json
{
  "error": "Error message here"
}
```

### Specific Error Messages

#### Authentication Errors

**User Doesn't Exist:**
```typescript
// backend/src/routes/auth.ts
// When login fails, backend checks if user exists
if (authError.message.includes('Invalid login credentials')) {
  const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
  if (existingUser?.user) {
    // User exists but password is wrong
    return res.status(401).json({ 
      error: 'Invalid password. Please check your password and try again.',
      requiresPasswordReset: true
    });
  }
}
// If user doesn't exist, returns:
return res.status(401).json({ error: 'Invalid credentials' });
```

**Email Not Verified:**
```typescript
if (!existingUser.user.email_confirmed_at) {
  return res.status(401).json({ 
    error: 'Email not verified. Please verify your email before signing in.',
    requiresVerification: true
  });
}
```

**User Already Exists (Sign Up):**
```typescript
// backend/src/routes/auth.ts
if (existingUser) {
  return res.status(400).json({ 
    error: 'User already exists. Please sign in instead.',
    userExists: true
  });
}
```

### HTTP Status Codes

| Code | Meaning | Display Method |
|------|---------|----------------|
| 200 | OK | Success toast (if needed) |
| 400 | Bad Request | Destructive toast with error message |
| 401 | Unauthorized | Destructive toast with specific auth error |
| 403 | Forbidden | Destructive toast with permission error |
| 404 | Not Found | Destructive toast with "Resource not found" |
| 500 | Internal Server Error | Destructive toast with "Something went wrong" |

---

## 5. API Client Error Extraction

### How Errors Are Extracted

**Location:** `src/lib/api.ts`

```typescript
private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    // Extract error message from response
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const errorObj = new Error(error.error || `HTTP error! status: ${response.status}`);
    
    // Preserve additional error properties (like userExists, requiresVerification, etc.)
    Object.assign(errorObj, error);
    throw errorObj;
  }
  
  return response.json();
}
```

### Error Properties Preserved

The API client preserves additional error properties from the backend:
- `error.message` - Main error message
- `userExists` - Boolean indicating if user already exists
- `requiresVerification` - Boolean indicating email needs verification
- `requiresPasswordReset` - Boolean indicating password reset needed
- `status` - HTTP status code

---

## 6. Common Error Scenarios

### Scenario 1: User Account Doesn't Exist (Sign In)

**Backend Response:**
```json
{
  "error": "Invalid credentials"
}
```

**Frontend Display:**
```typescript
// Toast notification appears
toast({
  title: "Error",
  description: "Invalid credentials", // From error.message
  variant: "destructive",
});
```

**User Experience:**
- Red toast notification appears in top-right corner
- Message: "Invalid credentials"
- Auto-dismisses after a few seconds
- User can manually close it

---

### Scenario 2: User Already Exists (Sign Up)

**Backend Response:**
```json
{
  "error": "User already exists. Please sign in instead.",
  "userExists": true
}
```

**Frontend Display:**
```typescript
// Toast with action button
toast({
  title: "Error",
  description: "User already exists. Please sign in instead.",
  variant: "destructive",
  action: (
    <Button onClick={() => navigate('/signin')}>
      Sign In
    </Button>
  ),
});
```

**User Experience:**
- Red toast notification with "Sign In" button
- User can click button to navigate to sign in page
- More helpful than generic error

---

### Scenario 3: Email Not Verified

**Backend Response:**
```json
{
  "error": "Email not verified. Please verify your email before signing in.",
  "requiresVerification": true
}
```

**Frontend Display:**
```typescript
// Alert component (persistent)
<Alert className="mb-6">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Email Verification Required</AlertTitle>
  <AlertDescription>
    Please verify your email before signing in.
  </AlertDescription>
</Alert>
```

**User Experience:**
- Persistent alert box on the page
- Stays visible until user verifies email or navigates away
- More prominent than toast for important actions

---

### Scenario 4: Invalid Password (User Exists)

**Backend Response:**
```json
{
  "error": "Invalid password. Please check your password and try again.",
  "requiresPasswordReset": true
}
```

**Frontend Display:**
```typescript
// Toast notification
toast({
  title: "Error",
  description: "Invalid password. Please check your password and try again.",
  variant: "destructive",
});
```

**User Experience:**
- Red toast with specific error message
- More helpful than generic "Invalid credentials"
- User knows password is the issue, not account existence

---

### Scenario 5: Network Error / API Unavailable

**Frontend Handling:**
```typescript
try {
  await api.getData();
} catch (error: any) {
  toast({
    title: "Error",
    description: error.message || "Failed to connect to server. Please try again later.",
    variant: "destructive",
  });
}
```

**User Experience:**
- Toast notification with network error message
- Fallback message if error.message is not available

---

### Scenario 6: Form Validation Error

**Example: Password Too Weak**
```typescript
const validation = validatePassword(password);
if (!validation.isValid) {
  toast({
    title: "Invalid Password",
    description: validation.errors.join(", "), // "Password must be at least 8 characters, contain uppercase letter"
    variant: "destructive",
  });
}
```

**User Experience:**
- Toast appears immediately when form is submitted
- Lists all validation errors
- User can fix and resubmit

---

## 7. Best Practices

### ✅ Implemented

1. **Consistent Error Format**
   - All backend errors return `{ error: string }`
   - Frontend extracts and displays consistently

2. **User-Friendly Messages**
   - Clear, actionable error messages
   - No technical jargon
   - Specific messages for different scenarios

3. **Appropriate Display Method**
   - Toasts for temporary feedback
   - Alerts for important persistent messages
   - Inline errors for form validation

4. **Error Logging**
   - Errors logged to console for debugging
   - User-facing messages are user-friendly

5. **Graceful Degradation**
   - App continues to function on non-critical errors
   - Loading states prevent UI confusion

### 🔄 Areas for Improvement

1. **Error Tracking**
   - Could integrate error tracking service (e.g., Sentry)
   - Track error frequency and patterns

2. **Retry Mechanisms**
   - Could add retry buttons for failed operations
   - Automatic retry for network errors

3. **Error Boundaries**
   - React Error Boundaries for unhandled errors
   - Fallback UI for critical errors

4. **Internationalization**
   - Some error messages are hardcoded
   - Could use translation keys for all errors

---

## 8. Summary

The BLINNO platform displays errors through:

1. **Toast Notifications** (Primary)
   - Temporary pop-ups for API errors
   - Auto-dismiss after a few seconds
   - Red variant for errors, default for success

2. **Alert Components** (Persistent)
   - For important messages that need to stay visible
   - Email verification, warnings, etc.

3. **Form Validation** (Inline)
   - Errors appear directly below form fields
   - Red text with specific validation messages

4. **Backend Error Format**
   - Consistent `{ error: string }` format
   - Additional properties for specific scenarios
   - HTTP status codes for error types

**For "User Account Doesn't Exist" specifically:**
- Backend returns: `{ error: "Invalid credentials" }`
- Frontend displays: Red toast notification with the error message
- User sees: Temporary pop-up in top-right corner with "Invalid credentials"
- Auto-dismisses after a few seconds

The platform prioritizes user-friendly, actionable error messages over technical details, ensuring users understand what went wrong and how to fix it.

