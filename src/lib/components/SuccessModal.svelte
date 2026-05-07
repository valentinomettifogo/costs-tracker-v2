<script lang="ts">
	type Props = {
		open: boolean;
		title?: string;
		message?: string;
		buttonLabel?: string;
		onClose?: () => void;
	};

	let {
		open = false,
		title = 'Record created',
		message = 'The record has been created successfully.',
		buttonLabel = 'Close',
		onClose = () => {}
	}: Props = $props();

	function handleClose() {
		onClose();
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClose();
		}
	}
</script>

{#if open}
	<dialog class="modal modal-open modal-bottom sm:modal-middle" aria-modal="true">
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			onclick={handleClose}
			onkeydown={handleBackdropKeydown}
		></div>
		<div class="modal-box">
			<h3 class="text-lg font-bold">{title}</h3>
			<p class="mt-2 text-sm text-base-content/70">{message}</p>
			<div class="modal-action">
				<button type="button" class="btn btn-primary" onclick={handleClose}>{buttonLabel}</button>
			</div>
		</div>
	</dialog>
{/if}
