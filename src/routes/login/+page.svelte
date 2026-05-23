<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { Mail, Lock, AlertCircle } from 'lucide-svelte';

	let { data, form } = $props();

	async function loginWithGoogle() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
	}
</script>

<svelte:head>
	<title>Sign in – Budget</title>
	<meta name="description" content="Sign in to Budget to track your shared expenses." />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex items-center justify-center py-12 px-4 md:py-20">
	<section class="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-xl border border-gray-100">
		<div class="text-center">
			<h1 class="text-4xl font-black text-gray-900 tracking-tight">Sign in</h1>
			<p class="mt-3 text-sm text-gray-500 font-medium">
				Enter your details to access your dashboard.
			</p>
		</div>

		{#if form?.error}
			<div class="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-start gap-3">
				<AlertCircle size={18} class="shrink-0" />
				<p>{form.error}</p>
			</div>
		{/if}

		<form
			method="POST"
			action="?/email"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'redirect') {
						await goto(result.location, { invalidateAll: true });
					} else {
						await update();
					}
				};
			}}
			class="space-y-6"
		>
			<input type="hidden" name="redirectTo" value={data.redirectTo} />

			<div class="space-y-1">
				<label for="email" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email address</label>
				<div class="relative">
					<Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
					<input
						id="email"
						class="input-base pl-10"
						type="email"
						name="email"
						value={form?.email ?? ''}
						autocomplete="email"
						placeholder="name@example.com"
						required
					/>
				</div>
			</div>

			<div class="space-y-1">
				<label for="password" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
				<div class="relative">
					<Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
					<input
						id="password"
						class="input-base pl-10"
						type="password"
						name="password"
						autocomplete="current-password"
						placeholder="••••••••"
						required
					/>
				</div>
			</div>

			<button class="btn btn-primary w-full py-3.5 shadow-lg shadow-primary/20" type="submit">
				Sign in with email
			</button>
		</form>

		<div class="relative py-4">
			<div class="absolute inset-0 flex items-center" aria-hidden="true">
				<div class="w-full border-t border-gray-100"></div>
			</div>
			<div class="relative flex justify-center text-xs font-bold uppercase tracking-widest">
				<span class="bg-white px-4 text-gray-400">or</span>
			</div>
		</div>

		<button 
			class="btn btn-outline w-full py-3.5 flex items-center justify-center gap-3 border-gray-200 hover:border-gray-300" 
			type="button" 
			onclick={loginWithGoogle}
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
				<path
					fill="#EA4335"
					d="M12 10.2v3.9h5.5c-0.2 1.2-1.4 3.6-5.5 3.6c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1 0.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2C6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.5-4 9.5-9.7c0-0.7-0.1-1.3-0.2-1.9H12z"
				/>
				<path
					fill="#34A853"
					d="M3.6 7.5l3.2 2.3c0.9-1.8 2.8-3 5.2-3c1.9 0 3.1 0.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2C8.3 2.2 5.1 4.3 3.6 7.5z"
				/>
				<path
					fill="#FBBC05"
					d="M12 21.8c2.6 0 4.8-0.9 6.4-2.4l-3-2.5c-0.8 0.6-1.9 1.1-3.4 1.1c-3 0-5.5-2-6.4-4.8l-3.3 2.6C3.9 19 7.6 21.8 12 21.8z"
				/>
				<path
					fill="#4285F4"
					d="M2.2 12c0 1.6 0.4 3.2 1.1 4.6l3.3-2.6c-0.2-0.6-0.3-1.2-0.3-2s0.1-1.4 0.3-2L3.3 7.4C2.6 8.8 2.2 10.4 2.2 12z"
				/>
			</svg>
			<span class="text-gray-700">Continue with Google</span>
		</button>
	</section>
</div>
