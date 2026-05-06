<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

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

<section class="mx-auto max-w-md space-y-6 rounded-box bg-base-100 p-6 shadow-sm">
	<div class="space-y-2 text-center">
		<h1 class="text-3xl font-semibold">Sign in</h1>
		<p class="text-sm text-base-content/70">
			Use your email credentials or continue with Google.
		</p>
	</div>

	{#if form?.error}
		<div class="alert alert-error text-sm">{form.error}</div>
	{/if}

	<form method="POST" action="?/email" class="space-y-5">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<label class="form-control w-full gap-2">
			<span class="label-text text-sm font-medium">Email</span>
			<input
				class="input input-bordered w-full"
				type="email"
				name="email"
				value={form?.email ?? ''}
				autocomplete="email"
				required
			/>
		</label>

		<label class="form-control w-full gap-2">
			<span class="label-text text-sm font-medium">Password</span>
			<input
				class="input input-bordered w-full"
				type="password"
				name="password"
				autocomplete="current-password"
				required
			/>
		</label>

		<button class="btn btn-primary mt-2 min-h-11 w-full" type="submit">Sign in with email</button>
	</form>

	<div class="divider text-xs uppercase text-base-content/50">or</div>

	<form method="POST" action="?/google">
		<button class="btn btn-outline min-h-11 w-full" type="button" onclick={loginWithGoogle}>
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
			<span>Continue with Google</span>
		</button>
	</form>
</section>