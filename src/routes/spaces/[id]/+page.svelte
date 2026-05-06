<script lang="ts">
	let { data, form } = $props();
	let editingSpace = $state(false);
	let addingCategory = $state(false);
	let copied = $state(false);

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

	const categoryError = $derived((form as { categoryError?: string } | undefined)?.categoryError);

	const inviteUrl = $derived(
		data.activeInvite ? `${data.origin}/spaces/join/${data.activeInvite.id}` : ''
	);

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
		<a href="/spaces" class="btn btn-ghost btn-sm">← Spazi</a>
		<h1 class="text-3xl font-bold">{data.space.name}</h1>
		{#if data.space.owner_id === data.userId}
			<span class="badge badge-primary">Proprietario</span>
		{/if}
	</div>

	<!-- Impostazioni spazio -->
	<section class="rounded-box bg-base-100 p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Impostazioni spazio</h2>
			{#if data.space.owner_id === data.userId}
				<button class="btn btn-ghost btn-sm" onclick={() => (editingSpace = !editingSpace)}>
					{editingSpace ? 'Annulla' : 'Modifica'}
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
					<span class="label-text mb-1 block">Nome</span>
					<input class="input input-bordered w-full" name="name" value={data.space.name} required />
				</label>
				<div class="grid grid-cols-2 gap-4">
					<label class="form-control">
						<span class="label-text mb-1 block">Valuta</span>
						<select class="select select-bordered w-full" name="currency">
							<option value="EUR" selected={data.space.currency === 'EUR'}>EUR €</option>
							<option value="USD" selected={data.space.currency === 'USD'}>USD $</option>
							<option value="GBP" selected={data.space.currency === 'GBP'}>GBP £</option>
						</select>
					</label>
					<label class="form-control">
						<span class="label-text mb-1 block">Formato numeri</span>
						<select class="select select-bordered w-full" name="format">
							<option value="IT" selected={data.space.format === 'IT'}>IT (1.000,00)</option>
							<option value="EN" selected={data.space.format === 'EN'}>EN (1,000.00)</option>
						</select>
					</label>
				</div>
				<button class="btn btn-primary" type="submit">Salva</button>
			</form>
		{:else}
			<dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
				<div>
					<dt class="text-base-content/60">Valuta</dt>
					<dd class="font-medium">{data.space.currency}</dd>
				</div>
				<div>
					<dt class="text-base-content/60">Formato</dt>
					<dd class="font-medium">{data.space.format}</dd>
				</div>
			</dl>
		{/if}
	</section>

	<!-- Categorie -->
	<section class="rounded-box bg-base-100 p-6 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Categorie</h2>
			<button class="btn btn-primary btn-sm" onclick={() => (addingCategory = !addingCategory)}>
				{addingCategory ? 'Annulla' : '+ Aggiungi'}
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
						<span class="label-text mb-1 block">Nome</span>
						<input
							class="input input-bordered input-sm w-full"
							name="name"
							required
							placeholder="es. Affitto, Stipendio…"
						/>
					</label>
					<label class="form-control">
						<span class="label-text mb-1 block">Tipo</span>
						<select class="select select-bordered select-sm w-full" name="type" required>
							<option value="">— scegli —</option>
							{#each categoryTypes as t}
								<option value={t.value}>{t.label}</option>
							{/each}
						</select>
					</label>
				</div>
				<button class="btn btn-primary btn-sm" type="submit">Aggiungi categoria</button>
			</form>
		{/if}

		{#if data.categories.length === 0}
			<p class="text-sm text-base-content/60">Nessuna categoria ancora.</p>
		{:else}
			<ul class="divide-y divide-base-200">
				{#each data.categories as cat (cat.id)}
					<li class="flex items-center justify-between py-2">
						<span class="font-medium">{cat.name}</span>
						<div class="flex items-center gap-2">
							<span class="badge badge-sm {typeBadgeClass[cat.type] ?? 'badge-ghost'}">
								{cat.type}
							</span>
							{#if data.space.owner_id === data.userId}
								<form method="POST" action="?/deleteCategory">
									<input type="hidden" name="id" value={cat.id} />
									<button class="btn btn-ghost btn-xs text-error" type="submit">✕</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Membri (solo proprietario) -->
	{#if data.space.owner_id === data.userId}
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">Membri</h2>

			{#if data.members.length === 0}
				<p class="text-sm text-base-content/60">Nessun membro trovato.</p>
			{:else}
				<ul class="divide-y divide-base-200">
					{#each data.members as member (member.id)}
						<li class="flex items-center justify-between py-2">
							<span class="text-sm">{member.email}</span>
							<div class="flex items-center gap-2">
								{#if member.id === data.userId}
									<span class="badge badge-sm badge-primary">tu</span>
								{:else}
									<form method="POST" action="?/removeMember">
										<input type="hidden" name="userId" value={member.id} />
										<button class="btn btn-ghost btn-xs text-error" type="submit">Rimuovi</button>
									</form>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Link di invito (solo proprietario) -->
		<section class="rounded-box bg-base-100 p-6 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">Link di invito</h2>

			{#if data.activeInvite}
				<p class="mb-3 text-sm text-base-content/60">
					Scade il {new Date(data.activeInvite.expires_at).toLocaleDateString('it-IT')}. Chiunque
					abbia il link e si logga verrà aggiunto a questo spazio.
				</p>
				<div class="mb-4 flex gap-2">
					<input
						class="input input-bordered input-sm w-full font-mono text-xs"
						type="text"
						readonly
						value={inviteUrl}
					/>
					<button class="btn btn-sm btn-outline shrink-0" type="button" onclick={copyLink}>
						{copied ? '✓ Copiato' : 'Copia'}
					</button>
				</div>
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/generateInvite">
						<button class="btn btn-sm btn-ghost" type="submit">Rigenera</button>
					</form>
					<form method="POST" action="?/revokeInvite">
						<button class="btn btn-sm btn-ghost text-error" type="submit">Revoca</button>
					</form>
				</div>
			{:else}
				<p class="mb-4 text-sm text-base-content/60">Nessun link di invito attivo.</p>
				<form method="POST" action="?/generateInvite">
					<button class="btn btn-primary btn-sm" type="submit">Genera link di invito</button>
				</form>
			{/if}
		</section>
	{/if}
</div>
