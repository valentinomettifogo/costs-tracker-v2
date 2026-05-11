export interface Notification {
	id: string;
	user_id: string;
	space_id: string;
	movement_id: string | null;
	actor_id: string;
	actor_name: string;
	amount: number;
	description: string | null;
	space_name: string;
	read: boolean;
	created_at: string;
}
