import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';

export function isPushSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

/** iOS Safari only allows push for PWAs installed to the home screen. */
export function isIosBrowserNotInstalled(): boolean {
	if (typeof window === 'undefined') return false;
	const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
	const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
	return isIos && !isStandalone;
}

export function getNotificationPermission(): NotificationPermission | null {
	return typeof Notification !== 'undefined' ? Notification.permission : null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const output = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i++) {
		output[i] = rawData.charCodeAt(i);
	}
	return output;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
	if (!isPushSupported()) return null;
	const registration = await navigator.serviceWorker.ready;
	return registration.pushManager.getSubscription();
}

/**
 * Requests notification permission and subscribes this device.
 * Must be called from a user gesture (iOS requirement).
 * Returns true when the subscription is active and saved server-side.
 */
export async function enablePush(): Promise<boolean> {
	if (!isPushSupported() || !PUBLIC_VAPID_PUBLIC_KEY) return false;

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return false;

	const registration = await navigator.serviceWorker.ready;
	const subscription =
		(await registration.pushManager.getSubscription()) ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_PUBLIC_KEY)
		}));

	const response = await fetch('/push', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...subscription.toJSON(), userAgent: navigator.userAgent })
	});

	if (!response.ok) {
		// avoid an orphan subscription the server doesn't know about
		await subscription.unsubscribe().catch(() => undefined);
		return false;
	}
	return true;
}

/** Unsubscribes this device and removes it server-side. */
export async function disablePush(): Promise<void> {
	const subscription = await getPushSubscription();
	if (!subscription) return;

	await fetch('/push', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint: subscription.endpoint })
	}).catch(() => undefined);

	await subscription.unsubscribe().catch(() => undefined);
}

export function setAppBadge(count: number): void {
	try {
		navigator.setAppBadge?.(count).catch(() => undefined);
	} catch {
		// Badging API unsupported — ignore
	}
}

export function clearAppBadge(): void {
	try {
		navigator.clearAppBadge?.().catch(() => undefined);
	} catch {
		// Badging API unsupported — ignore
	}
}
