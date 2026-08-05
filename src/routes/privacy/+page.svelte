<svelte:head>
	<title>Privacy – Bloom Budget</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12 md:py-20">
	<h1 class="text-3xl font-black text-gray-900">Privacy</h1>
	<p class="mt-2 text-sm text-gray-500">Last updated: 2026-08-05</p>

	<div class="prose prose-sm mt-8 max-w-none text-gray-700">
		<p>
			Bloom Budget is a small, invite-only tool for tracking shared expenses. It's not a public
			product with a marketing pipeline behind it — this page just explains plainly what happens
			to your data.
		</p>

		<h2>What's stored</h2>
		<p>
			Your email address, an optional display name and profile picture (if you sign in with
			Google), and the expense entries (amount, date, description, category, tags) you or people
			you share a space with add.
		</p>

		<h2>Who can see it</h2>
		<p>
			Only people you've explicitly invited into one of your spaces. Data access is enforced at
			the database level (row-level security), so a member of one space can never read another
			space's data. Nothing is public or indexed by search engines.
		</p>

		<h2>Where it's hosted</h2>
		<p>
			Data is stored with Supabase (Postgres) in an EU region. Notifications may be delivered as
			browser push notifications if you opt in; that requires your browser's push subscription
			endpoint, used only to send you those notifications.
		</p>

		<h2>Sharing</h2>
		<p>
			Data is never sold or shared with third parties. Anonymous usage/performance metrics (page
			views, load times) are collected via Vercel Analytics to keep the app working well — no
			expense data is included in that.
		</p>

		<h2>Questions or deletion requests</h2>
		<p>
			Reach out to <a href="mailto:valentino.mettifogo@gmail.com">valentino.mettifogo@gmail.com</a>
			and I'll take care of it.
		</p>
	</div>

	<a href="/" class="btn btn-outline mt-10">Back to home</a>
</div>
