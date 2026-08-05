<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} – Bloom Budget</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
	<p class="text-6xl font-black text-primary">{page.status}</p>
	<h1 class="text-2xl font-bold text-gray-900">
		{page.status === 404 ? 'Page not found' : 'Something went wrong'}
	</h1>
	<p class="max-w-sm text-sm text-gray-500">
		{page.error?.message ?? 'Please try again, or head back to the home page.'}
	</p>
	<a href="/" class="btn btn-primary mt-2">Back to home</a>
</div>
