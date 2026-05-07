<script lang="ts">
	let { data, form } = $props();
	let showForm = $state(false);
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Spazi</h1>
		<button class="btn btn-primary btn-sm" onclick={() => (showForm = !showForm)}>
			{showForm ? 'Annulla' : '+ Nuovo spazio'}
		</button>
	</div>

	{#if showForm}
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">Crea nuovo spazio</h2>
			{#if form?.error}
				<div class="alert alert-error mb-4 text-sm">{form.error}</div>
			{/if}
			<form method="POST" action="?/create" class="space-y-4">
				<label class="form-control w-full">
					<span class="label-text mb-1 block">Nome</span>
					<input class="input input-bordered w-full" name="name" required placeholder="es. Casa, Ufficio…" />
				</label>
				<div class="grid grid-cols-2 gap-4">
					<label class="form-control">
						<span class="label-text mb-1 block">Valuta</span>
						<select class="select select-bordered w-full" name="currency">
							<option value="EUR">EUR €</option>
							<option value="USD">USD $</option>
							<option value="GBP">GBP £</option>
						</select>
					</label>
					<label class="form-control">
						<span class="label-text mb-1 block">Formato numeri</span>
						<select class="select select-bordered w-full" name="format">
							<option value="IT">IT (1.000,00)</option>
							<option value="EN">EN (1,000.00)</option>
						</select>
					</label>
				</div>
				<button class="btn btn-primary" type="submit">Crea spazio</button>
			</form>
		</section>
	{/if}

	{#if data.spaces.length === 0}
		<section class="rounded-box bg-base-100 p-10 text-center shadow-sm">
			<p class="text-base-content/60">Nessuno spazio ancora. Creane uno per iniziare.</p>
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
										<span class="badge badge-primary badge-sm">Proprietario</span>
									</div>
								{/if}
							</a>
							<form method="POST" action="?/setActive">
								<input type="hidden" name="spaceId" value={space.id} />
								<button
									class="btn btn-ghost btn-xs text-xl leading-none"
									type="submit"
									title={space.id === data.activeSpaceId ? 'Spazio attivo' : 'Imposta come attivo'}
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
