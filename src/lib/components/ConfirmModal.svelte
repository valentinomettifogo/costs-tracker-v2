<script lang="ts">
	interface Props {
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		onConfirm,
		onCancel
	}: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onCancel();
	}
</script>

<div
	class="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
	onclick={handleBackdropClick}
	role="presentation"
>
	<div
		class="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-200 sm:slide-in-from-bottom-0"
		role="dialog"
		aria-modal="true"
	>
		<h3 class="text-lg font-bold text-gray-900">{title}</h3>
		<p class="mt-2 text-sm text-gray-500">{message}</p>

		<div class="mt-6 flex justify-end gap-3">
			<button type="button" class="btn btn-outline flex-1 sm:flex-none" onclick={onCancel}>
				{cancelLabel}
			</button>
			<button type="button" class="btn bg-red-600 text-white hover:bg-red-700 flex-1 sm:flex-none" onclick={onConfirm}>
				{confirmLabel}
			</button>
		</div>
	</div>
</div>
