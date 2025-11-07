import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, verifyAdminCredentials } from '$lib/server/auth';
import { SESSION_DURATION_MINUTES } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.session) {
		throw redirect(302, '/admin');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.' });
		}

		if (!verifyAdminCredentials(email, password)) {
			return fail(401, { message: 'Invalid credentials.' });
		}

		const { token } = await createSession(email);

		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: SESSION_DURATION_MINUTES * 60
		});

		throw redirect(303, '/admin');
	}
};
