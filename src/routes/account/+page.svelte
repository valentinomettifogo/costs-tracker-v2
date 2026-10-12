<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let confirmation = $state('');
	let isSubmitting = $state(false);

	const canDelete = $derived(
		data.email.length > 0 && confirmation.trim().toLowerCase() === data.email.toLowerCase()
	);
	const transferredSpaces = $derived(data.ownedSpaces.filter((s) => s.otherMembers > 0));
	const removedSpaces = $derived(data.ownedSpaces.filter((s) => s.otherMembers === 0));
</script>

<svelte:head>
	<title>Account – Bloom Budget</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-12">
	<h1 class="text-2xl font-black text-gray-900">Account</h1>
	<p class="mt-1 text-sm text-gray-500">Signed in as <strong>{data.email}</strong></p>

	<section class="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
		<h2 class="text-lg font-bold text-gray-900">Your data</h2>
		<p class="mt-2 text-sm text-gray-600">
			You can download the transactions of the active space as CSV with the <em>Export</em> button
			on the home page. See the <a href="/privacy" class="text-primary underline">privacy notice</a>
			for what is stored and your rights.
		</p>
	</section>

	<section class="mt-6 rounded-2xl border border-red-200 bg-white p-6">
		<h2 class="text-lg font-bold text-red-700">Delete account</h2>
		<p class="mt-2 text-sm text-gray-600">This is permanent and cannot be undone. Deleting your account will:</p>

		<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
			<li>remove your login, profile, notifications and push subscriptions;</li>
			<li>remove you from every space you are a member of;</li>
			<li>
				keep the transactions you added to shared spaces, so the other members' history stays
				intact — they will no longer be linked to you;
			</li>
			{#if removedSpaces.length > 0}
				<li>
					<strong>permanently delete</strong> the spaces only you are in, with all their data:
					{removedSpaces.map((s) => s.name).join(', ')};
				</li>
			{/if}
			{#if transferredSpaces.length > 0}
				<li>
					hand over ownership of the shared spaces you own to another member:
					{transferredSpaces.map((s) => s.name).join(', ')}.
				</li>
			{/if}
		</ul>

		<form
			method="POST"
			action="?/deleteAccount"
			class="mt-6 space-y-3"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			<label for="confirmation" class="block text-sm font-medium text-gray-700">
				Type <strong>{data.email}</strong> to confirm
			</label>
			<input
				id="confirmation"
				name="confirmation"
				type="email"
				autocomplete="off"
				class="input-base w-full"
				bind:value={confirmation}
			/>

			{#if form?.error}
				<p class="text-sm text-red-600" role="alert">{form.error}</p>
			{/if}

			<button
				type="submit"
				class="btn bg-red-600 text-white hover:bg-red-700"
				disabled={!canDelete || isSubmitting}
			>
				{isSubmitting ? 'Deleting…' : 'Delete my account'}
			</button>
		</form>
	</section>
</div>
