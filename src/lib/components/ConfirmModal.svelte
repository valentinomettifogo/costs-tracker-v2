<script lang="ts">
	type Props = {
		open: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	};

	let {
		open = false,
		title = 'Confirm action',
		message = 'Are you sure you want to continue?',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		onConfirm = () => {},
		onCancel = () => {}
	}: Props = $props();

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onCancel();
		}
	}
</script>

{#if open}
	<dialog
		class="modal modal-open modal-bottom sm:modal-middle"
		aria-modal="true"
		onclick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
	>
		<div class="modal-box">
			<h3 class="text-lg font-bold">{title}</h3>
			<p class="mt-2 text-sm text-base-content/70">{message}</p>
			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={onCancel}>{cancelLabel}</button>
				<button type="button" class="btn btn-error" onclick={onConfirm}>{confirmLabel}</button>
			</div>
		</div>
	</dialog>
{/if}
