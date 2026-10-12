<script lang="ts">
	const CONTACT_EMAIL = 'valentino.mettifogo@gmail.com';
</script>

<svelte:head>
	<title>Privacy – Bloom Budget</title>
	<link rel="canonical" href="https://budget.valentinomettifogo.com/privacy" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12 md:py-20">
	<h1 class="text-3xl font-black text-gray-900">Privacy notice</h1>
	<p class="mt-2 text-sm text-gray-500">Last updated: 2026-10-12</p>

	<div class="prose prose-sm mt-8 max-w-none text-gray-700">
		<p>
			Bloom Budget is a small, free tool for tracking personal and shared expenses. This notice
			explains, under the EU General Data Protection Regulation (GDPR, art. 13), what personal data
			is processed, why, and what your rights are.
		</p>

		<h2>Who is responsible</h2>
		<p>
			The data controller is <strong>Valentino Mettifogo</strong>, a private individual based in
			Italy. For anything related to your data, write to
			<a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
		</p>

		<h2>What data is processed</h2>
		<ul>
			<li>
				<strong>Account data</strong>: your email address and password (stored hashed by the
				authentication provider). If you sign in with Google: your name and profile picture as
				provided by Google.
			</li>
			<li>
				<strong>Content you create</strong>: spaces, categories and transactions (amount, date,
				description, category, tags, who paid) added by you or by the people you share a space
				with.
			</li>
			<li>
				<strong>Notifications</strong>: in-app notifications about transactions added by other
				members and, only if you enable them, the push subscription of your browser/device
				(endpoint, encryption keys and user agent).
			</li>
			<li>
				<strong>Technical data</strong>: IP address, browser and request information that the
				hosting and authentication providers record in their logs for security and operation.
			</li>
			<li>
				<strong>Anonymous usage and performance metrics</strong>: page views and load times. These
				do not use cookies, do not identify you and never include your expense data.
			</li>
		</ul>

		<h2>Why, and on what legal basis</h2>
		<ul>
			<li>
				<strong>Providing the service</strong> (account, spaces, transactions, in-app notifications)
				— performance of the service you asked for (art. 6(1)(b) GDPR).
			</li>
			<li>
				<strong>Security, abuse prevention and keeping the app fast</strong> (logs, usage and
				performance metrics) — legitimate interest (art. 6(1)(f) GDPR).
			</li>
			<li>
				<strong>Push notifications</strong> — your consent (art. 6(1)(a) GDPR), which you can
				withdraw at any time by disabling them in the app or in your browser settings.
			</li>
		</ul>
		<p>Data is never sold, used for advertising or profiling, or shared beyond what is listed here.</p>

		<h2>Who can see it</h2>
		<p>
			Only people you have explicitly invited into one of your spaces see that space's data. Access
			is enforced at the database level (row-level security). Nothing is public or indexed by search
			engines.
		</p>

		<h2>Service providers</h2>
		<p>The app relies on these providers, which process data on my behalf:</p>
		<ul>
			<li>
				<strong>Supabase</strong> — database and authentication. Data is stored in an EU region.
			</li>
			<li>
				<strong>Vercel</strong> — hosting (servers in Frankfurt, EU), anonymous Web Analytics and
				Speed Insights.
			</li>
			<li>
				<strong>Google</strong> — only if you choose "Continue with Google" to sign in; your
				profile picture is then loaded from Google's servers.
			</li>
			<li>
				<strong>Your browser's push service</strong> (e.g. Google, Mozilla or Apple) — only if
				you enable push notifications. Notification contents are end-to-end encrypted and cannot
				be read by the push service.
			</li>
		</ul>
		<p>
			Some of these companies are based in the United States. Any transfer of personal data outside
			the EU is covered by the EU-U.S. Data Privacy Framework and/or the European Commission's
			Standard Contractual Clauses.
		</p>

		<h2>Cookies and local storage</h2>
		<p>
			The app only uses <strong>strictly necessary</strong> storage, which does not require consent:
		</p>
		<ul>
			<li>authentication cookies (<code>sb-…</code>) that keep you signed in;</li>
			<li>
				a session-storage flag and a local cache of the app's files, used to load the installable
				app (PWA) quickly and offline.
			</li>
		</ul>
		<p>
			There are no advertising, tracking or third-party analytics cookies. Fonts are served from
			this site, not from third parties.
		</p>

		<h2>How long data is kept</h2>
		<ul>
			<li>Account data and content: for as long as your account exists.</li>
			<li>Notifications: until the account, space or transaction they refer to is deleted.</li>
			<li>Provider logs: for the short period set by each provider (typically days to weeks).</li>
		</ul>
		<p>
			When you delete your account, your login, profile, notifications, push subscriptions and the
			spaces only you belong to are deleted immediately. Transactions you added to spaces shared with
			others stay there, so the other members' history remains intact, but they are no longer linked
			to you. Ownership of shared spaces you own passes to another member. Residual copies in the
			providers' backups may persist for a short period before being overwritten.
		</p>

		<h2>Your rights</h2>
		<p>You have the right to:</p>
		<ul>
			<li>access your data and get a copy of it;</li>
			<li>have inaccurate data corrected;</li>
			<li>
				have your data erased — you can do this yourself from
				<a href="/account">Account → Delete account</a>;
			</li>
			<li>restrict or object to processing based on legitimate interest;</li>
			<li>
				data portability — transactions can be exported as CSV from the home page, or ask me for a
				full export;
			</li>
			<li>withdraw consent at any time, without affecting earlier processing.</li>
		</ul>
		<p>
			To exercise them, write to <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>. I'll reply
			within one month. You also have the right to lodge a complaint with the Italian data
			protection authority,
			<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer"
				>Garante per la protezione dei dati personali</a
			>, or with the authority of the EU country where you live.
		</p>

		<h2>Children</h2>
		<p>The service is not intended for people under 14 years of age.</p>

		<h2>Changes</h2>
		<p>
			This notice may be updated; the date at the top always shows the latest version. Meaningful
			changes will be communicated to active users.
		</p>
	</div>

	<div class="mt-10 flex flex-wrap gap-3">
		<a href="/" class="btn btn-outline">Back to home</a>
		<a href="/terms" class="btn btn-outline">Terms of service</a>
	</div>
</div>
