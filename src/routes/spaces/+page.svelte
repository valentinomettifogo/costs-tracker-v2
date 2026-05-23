<script lang="ts">
	import { Star, Plus, X, Globe, Coins, Layout } from 'lucide-svelte';
	let { data, form } = $props();
	let showForm = $state(false);
</script>

<div class="space-y-8">
	<div class="flex items-center justify-between px-4 md:px-0">
		<h1 class="text-3xl font-black text-gray-900">Spaces</h1>
		<button 
			class="btn {showForm ? 'btn-outline' : 'btn-primary'} flex items-center gap-2" 
			onclick={() => (showForm = !showForm)}
		>
			{#if showForm}
				<X size={18} /> Cancel
			{:else}
				<Plus size={18} /> New space
			{/if}
		</button>
	</div>

	{#if showForm}
		<section class="mx-4 md:mx-0 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-200">
			<div class="mb-6">
				<h2 class="text-xl font-bold text-gray-900">Create new space</h2>
				<p class="text-sm text-gray-500 mt-1">Set up a new workspace for your expenses.</p>
			</div>

			{#if form?.error}
				<div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
					<span class="font-bold">Error:</span> {form.error}
				</div>
			{/if}

			<form method="POST" action="?/create" class="space-y-6">
				<div class="space-y-1">
					<label for="name" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Space Name</label>
					<div class="relative">
						<Layout class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
						<input 
							id="name"
							class="input-base pl-10" 
							name="name" 
							required 
							placeholder="e.g. Home, Office, Travel..." 
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<div class="space-y-1">
						<label for="currency" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Currency</label>
						<div class="relative">
							<Coins class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
							<select id="currency" class="input-base pl-10" name="currency">
								<option value="EUR">EUR (€)</option>
								<option value="USD">USD ($)</option>
								<option value="GBP">GBP (£)</option>
							</select>
						</div>
					</div>

					<div class="space-y-1">
						<label for="format" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Number format</label>
						<div class="relative">
							<Globe class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
							<select id="format" class="input-base pl-10" name="format">
								<option value="IT">IT (1.000,00)</option>
								<option value="EN">EN (1,000.00)</option>
							</select>
						</div>
					</div>
				</div>

				<div class="pt-2">
					<button class="btn btn-primary w-full sm:w-auto px-10" type="submit">Create space</button>
				</div>
			</form>
		</section>
	{/if}

	{#if data.spaces.length === 0}
		<section class="mx-4 md:mx-0 rounded-2xl bg-white p-16 text-center shadow-sm border border-gray-100">
			<div class="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
				<Layout size={32} />
			</div>
			<p class="text-gray-500 font-medium">No spaces yet. Create one to get started.</p>
		</section>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 px-4 md:px-0">
			{#each data.spaces as space (space.id)}
				<div class="group relative rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-primary/20">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<a href="/spaces/{space.id}" class="block group-hover:text-primary transition-colors">
								<h2 class="text-xl font-black text-gray-900 leading-tight truncate">{space.name}</h2>
							</a>
							<div class="mt-2 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
								<span>{space.currency}</span>
								<span class="h-1 w-1 rounded-full bg-gray-200"></span>
								<span>{space.format} format</span>
							</div>
							
							{#if space.owner_id === data.userId}
								<div class="mt-4">
									<span class="badge badge-primary">Owner</span>
								</div>
							{/if}
						</div>

						<form method="POST" action="?/setActive" class="shrink-0">
							<input type="hidden" name="spaceId" value={space.id} />
							<button
								class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 transition-all hover:bg-yellow-50 active:scale-90"
								type="submit"
								title={space.id === data.activeSpaceId ? 'Active space' : 'Set as active'}
							>
								<Star
									size={20}
									class={space.id === data.activeSpaceId
										? 'fill-yellow-400 stroke-yellow-400'
										: 'stroke-gray-300 fill-none'}
								/>
							</button>
						</form>
					</div>
					
					<div class="mt-6">
						<a 
							href="/spaces/{space.id}" 
							class="text-xs font-bold text-primary uppercase tracking-widest hover:underline underline-offset-4"
						>
							Manage settings →
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
