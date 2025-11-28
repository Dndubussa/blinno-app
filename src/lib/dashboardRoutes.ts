/**
 * Helper function to get the dashboard route based on user role
 * @param role - Can be a string role or an array of roles
 */
export function getDashboardRoute(role: string | string[] | null | undefined): string {
  if (!role) return '/dashboard';

  // Handle array of roles - find the first non-'user' role
  let primaryRole: string | null = null;
  if (Array.isArray(role)) {
    primaryRole = role.find(r => r !== 'user') || role[0] || null;
  } else {
    primaryRole = role;
  }

  if (!primaryRole) return '/dashboard';

  const roleToRoute: Record<string, string> = {
    freelancer: '/freelancer-dashboard',
    seller: '/dashboard', // Sellers use the main dashboard
    lodging: '/lodging-dashboard',
    restaurant: '/restaurant-dashboard',
    educator: '/educator-dashboard',
    journalist: '/journalist-dashboard',
    artisan: '/artisan-dashboard',
    employer: '/employer-dashboard',
    event_organizer: '/event-organizer-dashboard',
    musician: '/musician-dashboard',
    creator: '/dashboard', // Creators use the main dashboard
    user: '/dashboard', // Regular users use the main dashboard
  };

  return roleToRoute[primaryRole] || '/dashboard';
}

