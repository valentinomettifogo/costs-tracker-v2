<script lang="ts">
	let { data, form } = $props();
	let showForm = $state(false);
</script>

<div class="space-y-6">
	<div class="flex items-center gap-3">
		<h1 class="text-3xl font-bold">Spaces</h1>
		<button class="btn btn-primary btn-sm" onclick={() => (showForm = !showForm)}>
			{showForm ? 'Cancel' : '+ New space'}
		</button>
	</div>

	{#if showForm}
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">Create new space</h2>
			{#if form?.error}
				<div class="alert alert-error mb-4 text-sm">{form.error}</div>
			{/if}
			<form method="POST" action="?/create" class="space-y-4">
				<label class="form-control w-full">
					<span class="label-text mb-1 block">Name</span>
					<input class="input input-bordered w-full" name="name" required placeholder="e.g. Home, Office..." />
				</label>
				<div class="grid grid-cols-2 gap-4">
					<label class="form-control">
						<span class="label-text mb-1 block">Currency</span>
						<select class="select select-bordered w-full" name="currency">
							<option value="EUR">EUR €</option>
							<option value="USD">USD $</option>
							<option value="GBP">GBP £</option>
						</select>
					</label>
					<label class="form-control">
						<span class="label-text mb-1 block">Number format</span>
						<select class="select select-bordered w-full" name="format">
							<option value="IT">IT (1.000,00)</option>
							<option value="EN">EN (1,000.00)</option>
						</select>
					</label>
				</div>
				<button class="btn btn-primary" type="submit">Create space</button>
			</form>
		</section>
	{/if}

	{#if data.spaces.length === 0}
		<section class="rounded-box bg-base-100 p-10 text-center shadow-sm">
			<p class="text-base-content/60">No spaces yet. Create one to get started.</p>
		</section>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.spaces as space (space.id)}
				<div class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
					<div class="card-body">
						<div class="flex items-start justify-between gap-2">
							<a href="/spaces/{space.id}" class="min-w-0 flex-1">
								<h2 class="card-title">{space.name}</h2>
								<p class="text-sm text-base-content/60">{space.currency} · {space.format}</p>
								{#if space.owner_id === data.userId}
									<div class="mt-1">
										<span class="badge badge-primary badge-sm">Owner</span>
									</div>
								{/if}
							</a>
							<form method="POST" action="?/setActive">
								<input type="hidden" name="spaceId" value={space.id} />
								<button
									class="btn btn-ghost btn-xs text-xl leading-none"
									type="submit"
									title={space.id === data.activeSpaceId ? 'Active space' : 'Set as active'}
								>
									{space.id === data.activeSpaceId ? '⭐' : '☆'}
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
