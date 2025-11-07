import type { Handle } from '@sveltejs/kit';
import { deleteSessionByToken, getSessionFromToken, refreshSessionExpiry } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');

	if (token) {
		const sessionRecord = await getSessionFromToken(token);
		if (sessionRecord && sessionRecord.expiresAt > new Date()) {
			const expiresAt = await refreshSessionExpiry(token);
			event.locals.session = {
				id: sessionRecord._id.toString(),
				email: sessionRecord.email,
				expiresAt
			};
		} else {
			await deleteSessionByToken(token);
			event.cookies.delete('session', { path: '/' });
			event.locals.session = null;
		}
	} else {
		event.locals.session = null;
	}

	return resolve(event);
};
