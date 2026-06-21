import { supabase } from './supabase';
import { User } from '../types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/** True when an error is a network/connectivity failure rather than a real auth error. */
export function isNetworkError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? '';
  const message = (err as { message?: string })?.message ?? '';
  return (
    /AuthRetryableFetchError/i.test(name) ||
    /failed to fetch|network ?error|load failed|fetch failed/i.test(message)
  );
}

/** Turn an auth error into a message safe to show the user. */
export function describeAuthError(err: unknown): string {
  if (isNetworkError(err)) {
    return "Can't reach the server. Check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.";
  }
  return err instanceof Error ? err.message : 'An error occurred. Please try again.';
}

function sessionToUser(session: Session): User {
  const meta = session.user.user_metadata;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    username: meta?.username ?? session.user.email?.split('@')[0] ?? '',
    name: meta?.name ?? '',
    trade: meta?.trade,
    customTrade: meta?.customTrade,
    createdAt: new Date(session.user.created_at).getTime(),
  };
}

export const auth = {
  /** Get current session user (checks local Supabase session) */
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return sessionToUser(session);
  },

  /** Register a new user with email + password */
  register: async (
    email: string,
    username: string,
    name: string,
    password: string
  ): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, name },
      },
    });
    if (error) throw error;
    if (!data.session) throw new Error('Registration succeeded but no session returned. Check email confirmation settings.');
    return sessionToUser(data.session);
  },

  /** Sign in with email + password */
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return sessionToUser(data.session);
  },

  /** Sign out */
  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** Subscribe to auth state changes. Returns unsubscribe function. */
  onAuthStateChange: (callback: (user: User | null, event: AuthChangeEvent) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session ? sessionToUser(session) : null, event);
    });
    return () => subscription.unsubscribe();
  },

  /** Send a password reset email */
  requestPasswordReset: async (email: string): Promise<void> => {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  /** Get the current access token (JWT) for API calls */
  getAccessToken: async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  },

  /** Update the user's profile (metadata + profiles table) */
  updateProfile: async (updates: Partial<Pick<User, 'name' | 'username' | 'trade' | 'customTrade'>>): Promise<User> => {
    // Update auth metadata
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: updates,
    });
    if (authError) throw authError;

    // Update profiles table
    const userId = authData.user.id;
    const profileUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) profileUpdates.name = updates.name;
    if (updates.username !== undefined) profileUpdates.username = updates.username;
    if (updates.trade !== undefined) profileUpdates.trade = updates.trade;
    if (updates.customTrade !== undefined) profileUpdates.custom_trade = updates.customTrade;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);
      if (profileError) throw profileError;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new Error('No session after profile update');
    return sessionToUser(session);
  },

  /** Change password for the active session (profile or recovery flow) */
  changePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /** Simple email validation (kept for form-level checks) */
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
};
