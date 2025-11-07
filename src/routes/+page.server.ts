import type { PageServerLoad } from './$types';
import { collections } from '$lib/server/db';
import { getTimeControlSettings } from '$lib/server/timeControls';
import {
	DEFAULT_PLAYER_STATS,
	TIME_CONTROL_TYPES,
	type PlayerRecord,
	type TimeControlType,
	type TimeControlSettings
} from '$lib/types';

export const load: PageServerLoad = async () => {
	const playersCollection = await collections.players();
	const docs = await playersCollection.find().toArray();
	const timeControls = await getTimeControlSettings();

	const players = docs.map((doc) => ({
		id: doc._id.toString(),
		firstName: doc.firstName,
		lastName: doc.lastName,
		stats: TIME_CONTROL_TYPES.reduce((acc, type) => {
			acc[type as TimeControlType] = doc.stats?.[type] ?? DEFAULT_PLAYER_STATS(doc.startingRating ?? 1200);
			return acc;
		}, {} as Record<TimeControlType, ReturnType<typeof DEFAULT_PLAYER_STATS>>),
		createdAt: doc.createdAt ?? new Date()
	}));

	return {
		players,
		timeControls
	} satisfies {
		players: Array<PlayerRecord & { id: string }>;
		timeControls: TimeControlSettings;
	};
};
