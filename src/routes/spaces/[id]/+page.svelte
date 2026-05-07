<script lang="ts">
	import { Pencil } from 'lucide-svelte';

	let { data, form } = $props();
	let editingSpace = $state(false);
	let addingCategory = $state(false);
	let copied = $state(false);
	let editingCategoryId = $state<string | null>(null);

	const categoryTypes = [
		{ value: 'needs', label: 'Needs' },
		{ value: 'wants', label: 'Wants' },
		{ value: 'income', label: 'Income' },
		{ value: 'savings', label: 'Savings' }
	];

	const typeBadgeClass: Record<string, string> = {
		needs: 'badge-warning',
		wants: 'badge-info',
		income: 'badge-success',
		savings: 'badge-primary'
	};

	const inviteUrl = $derived(
		data.activeInvite ? `${data.origin}/spaces/join/${data.activeInvite.id}` : ''
	);

	const categoryError = $derived((form as { categoryError?: string } | undefined)?.categoryError);

	function copyLink() {
		if (!inviteUrl) return;
		navigator.clipboard.writeText(inviteUrl).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center gap-3">
		<a href="/spaces" class="btn btn-ghost btn-sm">← Spaces</a>
		<h1 class="text-3xl font-bold">{data.space.name}</h1>
		{#if data.space.owner_id === data.userId}
			<span class="badge badge-primary">Owner</span>
		{/if}
	</div>

	<!-- Impostazioni spazio -->
	<section class="rounded-box bg-base-100 p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Space settings</h2>
			{#if data.space.owner_id === data.userId}
				<button class="btn btn-ghost btn-sm" onclick={() => (editingSpace = !editingSpace)}>
					{editingSpace ? 'Cancel' : 'Edit'}
				</button>
			{/if}
		</div>

		{#if form?.error}
			<div class="alert alert-error mb-4 text-sm">{form.error}</div>
		{/if}
		{#if form?.success}
			<div class="alert alert-success mb-4 text-sm">{form.success}</div>
		{/if}

		{#if editingSpace}
			<form method="POST" action="?/updateSpace" class="space-y-4">
				<label class="form-control w-full">
					<span class="label-text mb-1 block">Name</span>
					<input class="input input-bordered w-full" name="name" value={data.space.name} required />
				</label>
				<div class="grid grid-cols-2 gap-4">
					<label class="form-control">
						<span class="label-text mb-1 block">Currency</span>
						<select class="select select-bordered w-full" name="currency">
							<option value="EUR" selected={data.space.currency === 'EUR'}>EUR €</option>
							<option value="USD" selected={data.space.currency === 'USD'}>USD $</option>
							<option value="GBP" selected={data.space.currency === 'GBP'}>GBP £</option>
						</select>
					</label>
					<label class="form-control">
						<span class="label-text mb-1 block">Number format</span>
						<select class="select select-bordered w-full" name="format">
							<option value="IT" selected={data.space.format === 'IT'}>IT (1.000,00)</option>
							<option value="EN" selected={data.space.format === 'EN'}>EN (1,000.00)</option>
						</select>
					</label>
				</div>
				<button class="btn btn-primary" type="submit">Save</button>
			</form>
		{:else}
			<dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
				<div>
					<dt class="text-base-content/60">Currency</dt>
					<dd class="font-medium">{data.space.currency}</dd>
				</div>
				<div>
					<dt class="text-base-content/60">Format</dt>
					<dd class="font-medium">{data.space.format}</dd>
				</div>
			</dl>
		{/if}
	</section>

	<!-- Members (owner only) -->
	{#if data.space.owner_id === data.userId}
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">Members</h2>

			{#if data.members.length === 0}
				<p class="text-sm text-base-content/60">No members found.</p>
			{:else}
				<ul class="divide-y divide-base-200">
					{#each data.members as member (member.id)}
						<li class="flex items-center justify-between py-2">
							<span class="text-sm">{member.email}</span>
							<div class="flex items-center gap-2">
								{#if member.id === data.userId}
								<span class="badge badge-sm badge-primary">you</span>
							{:else}
								<form method="POST" action="?/removeMember">
									<input type="hidden" name="userId" value={member.id} />
									<button class="btn btn-ghost btn-xs text-error" type="submit">Remove</button>
									</form>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Invite link (owner only) -->
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">Invite link</h2>

			{#if data.activeInvite}
				<p class="mb-3 text-sm text-base-content/60">
					Expires on {new Date(data.activeInvite.expires_at).toLocaleDateString('en-US')}. Anyone
					with this link who logs in will be added to this space.
				</p>
				<div class="mb-4 flex gap-2">
					<input
						class="input input-bordered input-sm w-full font-mono text-xs"
						type="text"
						readonly
						value={inviteUrl}
					/>
					<button class="btn btn-sm btn-outline shrink-0" type="button" onclick={copyLink}>
					{copied ? '✓ Copied' : 'Copy'}
					</button>
				</div>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/generateInvite">
						<button class="btn btn-sm btn-ghost" type="submit">Regenerate</button>
					</form>
					<form method="POST" action="?/revokeInvite">
						<button class="btn btn-sm btn-ghost text-error" type="submit">Revoke</button>
					</form>
				</div>
			{:else}
				<p class="mb-4 text-sm text-base-content/60">No active invite link.</p>
				<form method="POST" action="?/generateInvite">
					<button class="btn btn-primary btn-sm" type="submit">Generate invite link</button>
				</form>
			{/if}
		</section>
	{/if}

	<!-- Categories -->
	<section class="rounded-box bg-base-100 p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Categories</h2>
				<button class="btn btn-primary btn-sm" onclick={() => (addingCategory = !addingCategory)}>
					{addingCategory ? 'Cancel' : '+ Add'}
			</button>
		</div>

		{#if categoryError}
				<div class="alert alert-error mb-4 text-sm">{categoryError}</div>
		{/if}

		{#if addingCategory}
			<form
				method="POST"
				action="?/createCategory"
				class="mb-6 space-y-3 rounded-box bg-base-200 p-4"
			>
				<div class="grid grid-cols-2 gap-4">
					<label class="form-control">
						<span class="label-text mb-1 block">Name</span>
						<input
							class="input input-bordered input-sm w-full"
							name="name"
							required
							placeholder="e.g. Rent, Salary…"
						/>
					</label>
					<label class="form-control">
						<span class="label-text mb-1 block">Type</span>
						<select class="select select-bordered select-sm w-full" name="type" required>
							<option value="">— select —</option>
							{#each categoryTypes as t}
								<option value={t.value}>{t.label}</option>
							{/each}
						</select>
					</label>
				</div>
				<button class="btn btn-primary btn-sm" type="submit">Add category</button>
			</form>
		{/if}

		{#if data.categories.length === 0}
				<p class="text-sm text-base-content/60">No categories yet.</p>
		{:else}
			<ul class="divide-y divide-base-200">
				{#each data.categories as cat (cat.id)}
					<li class="py-2">
						{#if editingCategoryId === cat.id}
							<form
								method="POST"
								action="?/updateCategory"
								class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
							>
								<input type="hidden" name="id" value={cat.id} />
								<input
									class="input input-bordered input-sm w-full sm:w-40"
									name="name"
									value={cat.name}
									required
								/>
								<select class="select select-bordered select-sm w-full sm:w-auto" name="type" required>
									{#each categoryTypes as t}
										<option value={t.value} selected={cat.type === t.value}>{t.label}</option>
									{/each}
								</select>
								<div class="flex gap-2">
									<button class="btn btn-primary btn-sm flex-1 sm:flex-none" type="submit">Save</button>
									<button
										class="btn btn-ghost btn-sm flex-1 sm:flex-none"
										type="button"
										onclick={() => (editingCategoryId = null)}
									>Cancel</button>
								</div>
							</form>
						{:else}
							<div class="flex items-center justify-between">
								<span class="font-medium">{cat.name}</span>
								<div class="flex items-center gap-2">
									<span class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}">
										{cat.type}
									</span>
									<button
										class="btn btn-ghost btn-xs"
										type="button"
										onclick={() => (editingCategoryId = cat.id)}
									><Pencil size={13} /></button>
									{#if data.space.owner_id === data.userId}
										<form method="POST" action="?/deleteCategory">
											<input type="hidden" name="id" value={cat.id} />
											<button class="btn btn-ghost btn-xs text-error" type="submit">✕</button>
										</form>
									{/if}
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
