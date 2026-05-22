<script lang="ts">
	import { CheckCircle2 } from 'lucide-svelte';

	interface Props {
		title: string;
		message: string;
		buttonLabel?: string;
		onClose: () => void;
	}

	let { title, message, buttonLabel = 'Done', onClose }: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}
</script>

<div
	class="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
	onclick={handleBackdropClick}
	role="presentation"
>
	<div
		class="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-200 sm:slide-in-from-bottom-0"
		role="dialog"
		aria-modal="true"
	>
		<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
			<CheckCircle2 size={24} />
		</div>
		
		<h3 class="mt-4 text-lg font-bold text-gray-900">{title}</h3>
		<p class="mt-2 text-sm text-gray-500">{message}</p>

		<div class="mt-6">
			<button type="button" class="btn btn-primary w-full" onclick={onClose}>
				{buttonLabel}
			</button>
		</div>
	</div>
</div>
