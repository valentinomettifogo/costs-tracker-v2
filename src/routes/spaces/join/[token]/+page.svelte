<script lang="ts">
	let { data } = $props();
</script>

<div class="flex min-h-[60vh] items-center justify-center p-4">
	<div class="card w-full max-w-sm bg-base-100 shadow-sm">
		<div class="card-body items-center gap-4 text-center">
			<div class="text-5xl">🔗</div>
			<h1 class="card-title text-xl">Invalid link</h1>
			<p class="text-sm text-base-content/70">
				This invite link is no longer valid or has expired. Ask the space owner for a new invite.
			</p>
			<a href="/" class="btn btn-primary min-h-11 w-full">Back to home</a>
		</div>
	</div>
</div>
