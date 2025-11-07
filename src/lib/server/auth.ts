import { randomBytes, createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { collections } from './db';
import { SESSION_DURATION_MINUTES } from '$lib/types';

const fallbackEmail = 'captain@club.local';
const fallbackPassword = 'captainjack';

const adminEmail = env.ADMIN_EMAIL || fallbackEmail;
const adminPassword = env.ADMIN_PASSWORD || fallbackPassword;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const verifyAdminCredentials = (email: string, password: string) =>
	email === adminEmail && password === adminPassword;

export const createSession = async (email: string) => {
	const token = randomBytes(32).toString('hex');
	const tokenHash = hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000);
	const sessions = await collections.sessions();
	const result = await sessions.insertOne({
		email,
		tokenHash,
		createdAt: new Date(),
		expiresAt
	});

	return {
		token,
		session: {
			id: result.insertedId.toString(),
			email,
			expiresAt
		}
	};
};

export const getSessionFromToken = async (token: string) => {
	const tokenHash = hashToken(token);
	const sessions = await collections.sessions();
	return sessions.findOne({ tokenHash });
};

export const refreshSessionExpiry = async (token: string) => {
	const tokenHash = hashToken(token);
	const sessions = await collections.sessions();
	const newExpiry = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000);
	await sessions.updateOne({ tokenHash }, { $set: { expiresAt: newExpiry } });
	return newExpiry;
};

export const deleteSessionByToken = async (token: string) => {
	const tokenHash = hashToken(token);
	const sessions = await collections.sessions();
	await sessions.deleteOne({ tokenHash });
};
