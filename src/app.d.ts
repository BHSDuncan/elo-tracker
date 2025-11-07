import type { AdminSession } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			session: AdminSession | null;
		}
	}
}

export {};
