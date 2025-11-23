import { api } from "./api";

/**
 * Check if user has a specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  try {
    const profile = await api.getCurrentUser();
    if (!profile) return false;
    
    if (profile.roles && Array.isArray(profile.roles)) {
      return profile.roles.includes(role);
    }
    
    return profile.role === role;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

/**
 * Get primary role (first non-'user' role)
 */
export function getPrimaryRole(profile: any): string {
  if (!profile) return 'user';
  
  if (profile.roles && Array.isArray(profile.roles)) {
    const nonUserRole = profile.roles.find((r: string) => r !== 'user');
    return nonUserRole || profile.roles[0] || 'user';
  }
  
  return profile.role || 'user';
}

