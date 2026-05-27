<script lang="ts">
	import { CheckCircle2 } from 'lucide-svelte';

	interface Props {
		message: string;
		duration?: number;
		onClose: () => void;
	}

	let { message, duration = 3000, onClose }: Props = $props();

	let visible = $state(false);

	$effect(() => {
		// Trigger enter animation on next frame
		const raf = requestAnimationFrame(() => { visible = true; });

		const timer = setTimeout(() => {
			visible = false;
			setTimeout(onClose, 300); // wait for exit animation
		}, duration);

		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timer);
		};
	});
</script>

<div
	role="status"
	aria-live="polite"
	class="fixed top-4 left-1/2 z-100 -translate-x-1/2 transition-all duration-300"
	class:opacity-0={!visible}
	class:opacity-100={visible}
	class:-translate-y-2={!visible}
	class:translate-y-0={visible}
>
	<div class="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-xl">
		<CheckCircle2 size={18} class="shrink-0 text-green-400" />
		<span class="text-sm font-medium">{message}</span>
	</div>
</div>
