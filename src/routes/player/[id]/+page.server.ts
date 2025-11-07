import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/db';
import { getTimeControlSettings } from '$lib/server/timeControls';
import {
	DEFAULT_PLAYER_STATS,
	TIME_CONTROL_TYPES,
	type TimeControlSettings,
	type TimeControlType
} from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	if (!ObjectId.isValid(id)) {
		throw error(404, 'Player not found');
	}

	const players = await collections.players();
	const playerDoc = await players.findOne({ _id: new ObjectId(id) });

	if (!playerDoc) {
		throw error(404, 'Player not found');
	}

	const allPlayers = await players.find().toArray();
	const playerLookup = new Map(allPlayers.map((p) => [p._id.toString(), `${p.firstName} ${p.lastName}`]));

	const gamesCollection = await collections.games();
	const games = await gamesCollection
		.find({ $or: [{ whiteId: id }, { blackId: id }] })
		.sort({ playedAt: -1 })
		.toArray();

	const timeControls = await getTimeControlSettings();

	return {
		player: {
			id: playerDoc._id.toString(),
			firstName: playerDoc.firstName,
			lastName: playerDoc.lastName,
			stats: TIME_CONTROL_TYPES.reduce((acc, type) => {
				acc[type] = playerDoc.stats?.[type] ?? DEFAULT_PLAYER_STATS(playerDoc.startingRating ?? 1200);
				return acc;
			}, {} as Record<TimeControlType, ReturnType<typeof DEFAULT_PLAYER_STATS>>)
		},
		games: games.map((game) => {
			const isWhite = game.whiteId === id;
			const opponentId = isWhite ? game.blackId : game.whiteId;
			return {
				id: game._id.toString(),
				date: game.playedAt,
				color: isWhite ? 'White' : 'Black',
				opponentName: playerLookup.get(opponentId) ?? 'Unknown',
				opponentId,
				result: game.result,
				timeControlType: game.timeControlType,
				startMinutes: game.startMinutes,
				incrementSeconds: game.incrementSeconds,
				cause: game.cause ?? '—'
			};
		}),
		timeControls: timeControls as TimeControlSettings
	};
};
