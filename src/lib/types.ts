export interface Category {
	id: string;
	name: string;
	type: string;
	space_id?: string;
}

export interface MovementRow {
	id: string;
	amount: number;
	date: string;
	description: string | null;
	user_id: string;
	expense_user_id: string | null;
	tags: string[] | null;
	category_id: string | null;
	costs_categories?: { id: string; name: string; type: string } | null;
}

export interface Notification {
	id: string;
	user_id: string;
	space_id: string;
	movement_id: string | null;
	actor_id: string;
	actor_name: string;
	amount: number;
	description: string | null;
	category_name: string | null;
	space_name: string;
	read: boolean;
	created_at: string;
}
