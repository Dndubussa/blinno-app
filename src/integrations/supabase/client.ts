// DEPRECATED: This file is kept for backward compatibility during migration
// All Supabase usage should be replaced with the new API client (src/lib/api.ts)
// This stub prevents errors but will not work - update your imports!

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create a stub client that won't crash but won't work
function createStubClient() {
  // Return a stub object that matches Supabase client interface
  const stub = {
    from: () => stub,
    select: () => stub,
    insert: () => stub,
    update: () => stub,
    delete: () => stub,
    eq: () => stub,
    neq: () => stub,
    gt: () => stub,
    gte: () => stub,
    lt: () => stub,
    lte: () => stub,
    like: () => stub,
    ilike: () => stub,
    is: () => stub,
    in: () => stub,
    contains: () => stub,
    containedBy: () => stub,
    rangeGt: () => stub,
    rangeGte: () => stub,
    rangeLt: () => stub,
    rangeLte: () => stub,
    rangeAdjacent: () => stub,
    overlaps: () => stub,
    textSearch: () => stub,
    match: () => stub,
    not: () => stub,
    or: () => stub,
    filter: () => stub,
    order: () => stub,
    limit: () => stub,
    range: () => stub,
    abortSignal: () => stub,
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated. Use api client instead.' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated. Use api client instead.' } }),
    csv: () => Promise.resolve(''),
    geojson: () => Promise.resolve({}),
    explain: () => Promise.resolve({}),
    rollback: () => stub,
    returns: () => stub,
    then: (onResolve: any) => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated. Use api client instead.' } }).then(onResolve),
    catch: (onReject: any) => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated. Use api client instead.' } }).catch(onReject),
    rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated. Use api client instead.' } }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated' } }),
        download: () => Promise.resolve({ data: null, error: { message: 'Supabase is deprecated' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        createSignedUrl: () => Promise.resolve({ data: { signedUrl: '' }, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        move: () => Promise.resolve({ data: null, error: null }),
        copy: () => Promise.resolve({ data: null, error: null }),
      }),
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase is deprecated' } }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase is deprecated' } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    channel: () => ({
      on: () => stub,
      subscribe: () => stub,
      unsubscribe: () => stub,
    }),
    removeChannel: () => {},
  };
  return stub as any;
}

// Export stub client (prevents errors but won't work - migrate to api client!)
// This is a temporary solution during migration
export const supabase = createStubClient();