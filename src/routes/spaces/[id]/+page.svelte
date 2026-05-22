<script lang="ts">
	import { Pencil, X, Check, Copy, RefreshCw, Trash2, Shield, User, Tag, Settings, CreditCard, Users, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-svelte';

	let { data, form } = $props();
	let editingSpace = $state(false);
	let addingCategory = $state(false);
	let copied = $state(false);
	let editingCategoryId = $state<string | null>(null);
	let inviteInput = $state<HTMLInputElement | null>(null);

	const categoryTypes = [
		{ value: 'needs', label: 'Needs' },
		{ value: 'wants', label: 'Wants' },
		{ value: 'income', label: 'Income' },
		{ value: 'savings', label: 'Savings' }
	];

	const typeBadgeClass: Record<string, string> = {
		needs: 'bg-amber-50 text-amber-700 border-amber-200',
		wants: 'bg-blue-50 text-blue-700 border-blue-200',
		income: 'bg-green-50 text-green-700 border-green-200',
		savings: 'bg-primary/10 text-primary border-primary/20'
	};

	const inviteUrl = $derived(
		data.activeInvite ? `${data.origin}/spaces/join/${data.activeInvite.id}` : ''
	);

	const categoryError = $derived((form as { categoryError?: string } | undefined)?.categoryError);

	function copyWithFallback(text: string) {
		if (!inviteInput) return false;

		inviteInput.focus();
		inviteInput.select();
		inviteInput.setSelectionRange(0, text.length);

		return document.execCommand('copy');
	}

	async function copyLink() {
		if (!inviteUrl) return;

		const clipboardAvailable =
			typeof navigator !== 'undefined' &&
			!!navigator.clipboard?.writeText &&
			typeof window !== 'undefined' &&
			window.isSecureContext;

		const copySucceeded = clipboardAvailable
			? await navigator.clipboard
					.writeText(inviteUrl)
					.then(() => true)
					.catch(() => copyWithFallback(inviteUrl))
			: copyWithFallback(inviteUrl);

		if (!copySucceeded) return;

		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 px-4 md:px-0 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-4">
			<a href="/spaces" class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50">
				<X size={18} />
			</a>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-black text-gray-900 leading-tight">{data.space.name}</h1>
				{#if data.space.owner_id === data.userId}
					<span class="badge badge-primary">Owner</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2 space-y-6">
			<!-- Space Settings -->
			<section class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
				<div class="flex items-center justify-between border-b border-gray-50 px-6 py-4">
					<div class="flex items-center gap-2">
						<Settings size={18} class="text-gray-400" />
						<h2 class="text-lg font-bold text-gray-900">Space settings</h2>
					</div>
					<button 
						class="btn {editingSpace ? 'btn-outline' : 'btn-ghost'} btn-sm" 
						onclick={() => (editingSpace = !editingSpace)}
					>
						{editingSpace ? 'Cancel' : 'Edit settings'}
					</button>
				</div>

				<div class="p-6">
					{#if form?.error}
						<div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
							<AlertCircle size={16} /> {form.error}
						</div>
					{/if}
					{#if form?.success}
						<div class="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-600 border border-green-100 flex items-center gap-2">
							<CheckCircle2 size={16} /> {form.success}
						</div>
					{/if}

					{#if editingSpace}
						<form method="POST" action="?/updateSpace" class="space-y-6">
							<div class="space-y-1">
								<label for="name" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
								<input id="name" class="input-base" name="name" value={data.space.name} required />
							</div>

							<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
								<div class="space-y-1">
									<label for="currency" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Currency</label>
									<select id="currency" class="input-base" name="currency">
										<option value="EUR" selected={data.space.currency === 'EUR'}>EUR €</option>
										<option value="USD" selected={data.space.currency === 'USD'}>USD $</option>
										<option value="GBP" selected={data.space.currency === 'GBP'}>GBP £</option>
									</select>
								</div>
								<div class="space-y-1">
									<label for="format" class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</label>
									<select id="format" class="input-base" name="format">
										<option value="IT" selected={data.space.format === 'IT'}>IT (1.000,00)</option>
										<option value="EN" selected={data.space.format === 'EN'}>EN (1,000.00)</option>
									</select>
								</div>
							</div>

							<div class="pt-2">
								<h3 class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Budget Targets (%)</h3>
								<div class="grid grid-cols-3 gap-4">
									<div class="space-y-1">
										<label for="t_needs" class="text-[10px] font-bold text-gray-400 uppercase">Needs</label>
										<input id="t_needs" class="input-base" type="number" name="target_needs" min="0" max="100" value={data.space.target_needs} required />
									</div>
									<div class="space-y-1">
										<label for="t_wants" class="text-[10px] font-bold text-gray-400 uppercase">Wants</label>
										<input id="t_wants" class="input-base" type="number" name="target_wants" min="0" max="100" value={data.space.target_wants} required />
									</div>
									<div class="space-y-1">
										<label for="t_savings" class="text-[10px] font-bold text-gray-400 uppercase">Savings</label>
										<input id="t_savings" class="input-base" type="number" name="target_savings" min="0" max="100" value={data.space.target_savings} required />
									</div>
								</div>
							</div>

							<div class="pt-2">
								<h3 class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Category Colors</h3>
								<div class="grid grid-cols-3 gap-4">
									<div class="space-y-1">
										<label for="c_needs" class="text-[10px] font-bold text-gray-400 uppercase">Needs</label>
										<div class="h-10 rounded-lg border border-gray-200 p-1 bg-white relative">
											<input id="c_needs" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="color" name="color_needs" value={data.space.color_needs} />
											<div class="w-full h-full rounded" style="background-color: {data.space.color_needs}"></div>
										</div>
									</div>
									<div class="space-y-1">
										<label for="c_wants" class="text-[10px] font-bold text-gray-400 uppercase">Wants</label>
										<div class="h-10 rounded-lg border border-gray-200 p-1 bg-white relative">
											<input id="c_wants" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="color" name="color_wants" value={data.space.color_wants} />
											<div class="w-full h-full rounded" style="background-color: {data.space.color_wants}"></div>
										</div>
									</div>
									<div class="space-y-1">
										<label for="c_savings" class="text-[10px] font-bold text-gray-400 uppercase">Savings</label>
										<div class="h-10 rounded-lg border border-gray-200 p-1 bg-white relative">
											<input id="c_savings" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" type="color" name="color_savings" value={data.space.color_savings} />
											<div class="w-full h-full rounded" style="background-color: {data.space.color_savings}"></div>
										</div>
									</div>
								</div>
							</div>

							<button class="btn btn-primary w-full sm:w-auto px-10" type="submit">Save changes</button>
						</form>
					{:else}
						<div class="grid grid-cols-1 gap-8 sm:grid-cols-3">
							<div class="space-y-1">
								<span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Currency</span>
								<p class="text-lg font-bold text-gray-900">{data.space.currency}</p>
							</div>
							<div class="space-y-1">
								<span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Format</span>
								<p class="text-lg font-bold text-gray-900">{data.space.format}</p>
							</div>
							<div class="space-y-4 sm:col-span-3">
								<span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">Budget targets & colors</span>
								<div class="flex flex-wrap gap-4">
									<div class="flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
										<div class="h-3 w-3 rounded-full" style="background-color: {data.space.color_needs}"></div>
										<span class="text-sm font-bold text-gray-700">Needs {data.space.target_needs}%</span>
									</div>
									<div class="flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
										<div class="h-3 w-3 rounded-full" style="background-color: {data.space.color_wants}"></div>
										<span class="text-sm font-bold text-gray-700">Wants {data.space.target_wants}%</span>
									</div>
									<div class="flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5">
										<div class="h-3 w-3 rounded-full" style="background-color: {data.space.color_savings}"></div>
										<span class="text-sm font-bold text-gray-700">Savings {data.space.target_savings}%</span>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<!-- Categories -->
			<section class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
				<div class="flex items-center justify-between border-b border-gray-50 px-6 py-4">
					<div class="flex items-center gap-2">
						<Tag size={18} class="text-gray-400" />
						<h2 class="text-lg font-bold text-gray-900">Categories</h2>
					</div>
					<button 
						class="btn {addingCategory ? 'btn-outline' : 'btn-primary'} btn-sm" 
						onclick={() => (addingCategory = !addingCategory)}
					>
						{addingCategory ? 'Cancel' : '+ Add category'}
					</button>
				</div>

				<div class="p-6">
					{#if categoryError}
						<div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
							{categoryError}
						</div>
					{/if}

					{#if addingCategory}
						<form
							method="POST"
							action="?/createCategory"
							class="mb-8 p-5 rounded-xl bg-gray-50 border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200"
						>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div class="space-y-1">
									<label for="cat_name" class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category Name</label>
									<input
										id="cat_name"
										class="input-base"
										name="name"
										required
										placeholder="e.g. Rent, Salary, Fun..."
									/>
								</div>
								<div class="space-y-1">
									<label for="cat_type" class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</label>
									<select id="cat_type" class="input-base" name="type" required>
										<option value="">— select —</option>
										{#each categoryTypes as t}
											<option value={t.value}>{t.label}</option>
										{/each}
									</select>
								</div>
							</div>
							<button class="btn btn-primary btn-sm px-6" type="submit">Add category</button>
						</form>
					{/if}

					{#if data.categories.length === 0}
						<p class="text-center py-8 text-sm text-gray-400 font-medium">No categories created yet.</p>
					{:else}
						<ul class="divide-y divide-gray-50">
							{#each data.categories as cat (cat.id)}
								<li class="py-3 group transition-colors hover:bg-gray-50/50 -mx-6 px-6">
									{#if editingCategoryId === cat.id}
										<form
											method="POST"
											action="?/updateCategory"
											class="flex flex-col gap-3 sm:flex-row sm:items-end animate-in fade-in duration-100"
										>
											<input type="hidden" name="id" value={cat.id} />
											<div class="flex-1 space-y-1">
												<label for="edit_cat_name" class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</label>
												<input
													id="edit_cat_name"
													class="input-base"
													name="name"
													value={cat.name}
													required
												/>
											</div>
											<div class="sm:w-40 space-y-1">
												<label for="edit_cat_type" class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</label>
												<select id="edit_cat_type" class="input-base" name="type" required>
													{#each categoryTypes as t}
														<option value={t.value} selected={cat.type === t.value}>{t.label}</option>
													{/each}
												</select>
											</div>
											<div class="flex gap-2">
												<button class="btn btn-primary btn-sm flex-1 sm:flex-none px-6" type="submit">Save</button>
												<button
													class="btn btn-outline btn-sm flex-1 sm:flex-none"
													type="button"
													onclick={() => (editingCategoryId = null)}
												>Cancel</button>
											</div>
										</form>
									{:else}
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-3">
												<span class="font-bold text-gray-900">{cat.name}</span>
												<span class="badge border {typeBadgeClass[cat.type] ?? 'bg-gray-50 text-gray-500'}">
													{cat.type}
												</span>
											</div>
											<div class="flex items-center gap-1 transition-opacity">
												<button
													class="btn btn-ghost btn-xs p-2 text-gray-400 hover:text-primary transition-colors"
													type="button"
													onclick={() => (editingCategoryId = cat.id)}
													title="Edit"
												>
													<Pencil size={14} />
												</button>
												{#if data.space.owner_id === data.userId}
													<form method="POST" action="?/deleteCategory">
														<input type="hidden" name="id" value={cat.id} />
														<button 
															class="btn btn-ghost btn-xs p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" 
															type="submit"
															title="Delete"
														>
															<Trash2 size={14} />
														</button>
													</form>
												{/if}
											</div>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>
		</div>

		<div class="space-y-6">
			<!-- Members (owner only) -->
			{#if data.space.owner_id === data.userId}
				<section class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
					<div class="flex items-center gap-2 border-b border-gray-50 px-6 py-4">
						<Users size={18} class="text-gray-400" />
						<h2 class="text-lg font-bold text-gray-900">Members</h2>
					</div>

					<div class="p-6">
						{#if data.members.length === 0}
							<p class="text-center py-4 text-sm text-gray-400 font-medium">No members found.</p>
						{:else}
							<ul class="divide-y divide-gray-50">
								{#each data.members as member (member.id)}
									<li class="flex items-center justify-between py-3">
										<div class="min-w-0">
											<p class="text-sm font-bold text-gray-900 truncate">{member.email}</p>
											{#if member.id === data.space.owner_id}
												<p class="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Space Owner</p>
											{/if}
										</div>
										<div class="flex items-center gap-2 shrink-0">
											{#if member.id === data.userId}
												<span class="badge badge-primary">You</span>
											{:else}
												<form method="POST" action="?/removeMember">
													<input type="hidden" name="userId" value={member.id} />
													<button 
														class="btn btn-ghost btn-xs p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" 
														type="submit"
														title="Remove from space"
													>
														<Trash2 size={14} />
													</button>
												</form>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</section>

				<!-- Invite link (owner only) -->
				<section class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
					<div class="flex items-center gap-2 border-b border-gray-50 px-6 py-4">
						<LinkIcon size={18} class="text-gray-400" />
						<h2 class="text-lg font-bold text-gray-900">Invite link</h2>
					</div>

					<div class="p-6">
						{#if data.activeInvite}
							<div class="mb-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
								<p class="text-xs text-gray-500 leading-relaxed">
									Expires on <span class="font-bold text-gray-700">{new Date(data.activeInvite.expires_at).toLocaleDateString('en-US')}</span>. 
									Anyone with this link can join this space.
								</p>
							</div>
							
							<div class="flex gap-2 mb-6">
								<div class="relative flex-1">
									<input
										bind:this={inviteInput}
										class="input-base !py-1.5 font-mono text-[10px] bg-gray-50 border-dashed"
										type="text"
										readonly
										value={inviteUrl}
									/>
								</div>
								<button 
									class="btn {copied ? 'bg-green-600 text-white' : 'btn-outline'} btn-sm shrink-0 gap-2 min-w-[100px]" 
									type="button" 
									onclick={copyLink}
								>
									{#if copied}
										<Check size={14} /> Copied
									{:else}
										<Copy size={14} /> Copy
									{/if}
								</button>
							</div>
							
							<div class="flex items-center gap-2">
								<form method="POST" action="?/generateInvite" class="flex-1">
									<button class="btn btn-ghost btn-xs w-full gap-2 py-3" type="submit">
										<RefreshCw size={14} /> Regenerate
									</button>
								</form>
								<form method="POST" action="?/revokeInvite" class="flex-1">
									<button class="btn btn-ghost btn-xs w-full gap-2 py-3 text-red-500 hover:bg-red-50" type="submit">
										<X size={14} /> Revoke
									</button>
								</form>
							</div>
						{:else}
							<div class="text-center py-6">
								<div class="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
									<LinkIcon size={24} />
								</div>
								<p class="text-sm text-gray-500 font-medium mb-6">No active invite link.</p>
								<form method="POST" action="?/generateInvite">
									<button class="btn btn-primary w-full" type="submit">Generate invite link</button>
								</form>
							</div>
						{/if}
					</div>
				</section>
			{/if}
		</div>
	</div>
</div>
