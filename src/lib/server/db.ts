import { MongoClient } from 'mongodb';
import { env } from '$env/dynamic/private';
import type {
	PlayerDoc,
	GameDoc,
	SessionDoc,
	TimeControlDoc,
	TimeControlSettings
} from '$lib/types';

const uri = env.MONGODB_URI;

if (!uri) {
	throw new Error('MONGODB_URI is not set');
}

const client = new MongoClient(uri);
const clientPromise = client.connect();

export const getDb = async () => {
	const c = await clientPromise;
	return c.db();
};

export const collections = {
	players: async () => (await getDb()).collection<PlayerDoc>('players'),
	games: async () => (await getDb()).collection<GameDoc>('games'),
	sessions: async () => (await getDb()).collection<SessionDoc>('sessions'),
	timeControls: async () => (await getDb()).collection<TimeControlDoc>('timeControls')
};

export const DEFAULT_TIME_CONTROLS: TimeControlSettings = {
	Bullet: { lower: 0, upper: 10 },
	Blitz: { lower: 11, upper: 30 },
	Rapid: { lower: 31, upper: 60 },
	Classical: { lower: 61 }
};
