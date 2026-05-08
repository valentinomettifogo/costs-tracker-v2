import type { SupabaseClient, User } from '@supabase/supabase-js';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ user: User | null }>;
		}
		interface PageData {
			user: User | null;
			role: string | null;
			isAdmin: boolean;
			currentPath: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
