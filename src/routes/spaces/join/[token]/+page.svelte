<script lang="ts">
	let { data } = $props();
</script>

<div class="flex min-h-[60vh] items-center justify-center p-4">
	<div class="card w-full max-w-sm bg-base-100 shadow-sm">
		<div class="card-body items-center gap-4 text-center">
			<div class="text-5xl">🔗</div>
			<h1 class="card-title text-xl">Link non valido</h1>
			<p class="text-sm text-base-content/70">
				Questo link di invito non è più valido o è scaduto. Chiedi al proprietario dello spazio un
				nuovo invito.
			</p>
			<a href="/" class="btn btn-primary min-h-11 w-full">Torna alla home</a>
		</div>
	</div>
</div>
