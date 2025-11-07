import { MongoClient, type Document } from 'mongodb';
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

const BASE_COLLECTIONS = ['players', 'games', 'sessions', 'timeControls'] as const;
type BaseCollection = (typeof BASE_COLLECTIONS)[number];

const runtimeEnv = env.NODE_ENV ?? env.MODE ?? 'development';
const collectionPrefix = runtimeEnv === 'production' ? 'prod_' : 'dev_';

const prefixedName = (name: BaseCollection) => `${collectionPrefix}${name}`;

export const getDb = async () => {
	const c = await clientPromise;
	return c.db();
};

let migrationPromise: Promise<void> | null = null;

const migrateLegacyCollections = async () => {
	const db = await getDb();
	const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
	const existingNames = new Set(existingCollections.map((col) => col.name));

	await Promise.all(
		BASE_COLLECTIONS.map(async (name) => {
			const target = prefixedName(name);
			if (!existingNames.has(target) && existingNames.has(name)) {
				await db.collection(name).rename(target);
			}
		})
	);
};

const ensureCollectionsMigrated = async () => {
	if (!migrationPromise) {
		migrationPromise = migrateLegacyCollections().catch((error) => {
			migrationPromise = null;
			console.error('Collection migration failed', error);
			throw error;
		});
	}
	return migrationPromise;
};

const getCollection = async <T extends Document>(name: BaseCollection) => {
	await ensureCollectionsMigrated();
	return (await getDb()).collection<T>(prefixedName(name));
};

export const collections = {
	players: async () => getCollection<PlayerDoc>('players'),
	games: async () => getCollection<GameDoc>('games'),
	sessions: async () => getCollection<SessionDoc>('sessions'),
	timeControls: async () => getCollection<TimeControlDoc>('timeControls')
};

export const DEFAULT_TIME_CONTROLS: TimeControlSettings = {
	Bullet: { lower: 0, upper: 10 },
	Blitz: { lower: 11, upper: 30 },
	Rapid: { lower: 31, upper: 60 },
	Classical: { lower: 61 }
};
