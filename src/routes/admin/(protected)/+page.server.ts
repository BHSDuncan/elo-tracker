import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/db';
import {
	convertUppersToRanges,
	determineTimeControlType,
	getTimeControlSettings,
	saveTimeControlSettings
} from '$lib/server/timeControls';
import {
	DEFAULT_PLAYER_STATS,
	RESULT_CAUSES,
	RESULT_VALUES,
	TIME_CONTROL_TYPES,
	type TimeControlType
} from '$lib/types';
import { applyElo, recordOutcome } from '$lib/server/elo';
import { deleteSessionByToken } from '$lib/server/auth';

const cloneStats = (stats?: ReturnType<typeof DEFAULT_PLAYER_STATS>) => ({
	rating: stats?.rating ?? DEFAULT_PLAYER_STATS().rating,
	wins: stats?.wins ?? 0,
	losses: stats?.losses ?? 0,
	draws: stats?.draws ?? 0
});

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, '/admin/login');
	}

	const [playersCollection, gamesCollection] = await Promise.all([collections.players(), collections.games()]);

	const playersDocs = await playersCollection.find().sort({ lastName: 1 }).toArray();
	const timeControls = await getTimeControlSettings();

	const players = playersDocs.map((doc) => ({
		id: doc._id!.toString(),
		firstName: doc.firstName,
		lastName: doc.lastName,
		stats: TIME_CONTROL_TYPES.reduce((acc, type) => {
			acc[type] = doc.stats?.[type] ?? DEFAULT_PLAYER_STATS(doc.startingRating ?? 1200);
			return acc;
		}, {} as Record<TimeControlType, ReturnType<typeof DEFAULT_PLAYER_STATS>>)
	}));

	const playerLookup = new Map(players.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));

	const gamesDocs = await gamesCollection.find().sort({ playedAt: -1 }).limit(15).toArray();
	const games = gamesDocs.map((game) => ({
		id: game._id!.toString(),
		whiteId: game.whiteId,
		blackId: game.blackId,
		whiteName: playerLookup.get(game.whiteId) ?? 'Unknown',
		blackName: playerLookup.get(game.blackId) ?? 'Unknown',
		result: game.result,
		timeControlType: game.timeControlType,
		cause: game.cause ?? '—',
		playedAt: game.playedAt
	}));

	return {
		players,
		games,
		timeControls,
		resultValues: RESULT_VALUES,
		resultCauses: RESULT_CAUSES
	};
};

export const actions: Actions = {
	addPlayer: async ({ request }) => {
		const form = await request.formData();
		const firstName = String(form.get('firstName') ?? '').trim();
		const lastName = String(form.get('lastName') ?? '').trim();
		const startingRatingValue = form.get('startingRating');
		const startingRating =
			typeof startingRatingValue === 'string' && startingRatingValue !== ''
				? Number(startingRatingValue)
				: 1200;

		if (!firstName || !lastName) {
			return fail(400, { message: 'First and last name are required.' });
		}

		if (Number.isNaN(startingRating) || startingRating <= 0) {
			return fail(400, { message: 'Starting rating must be a positive number.' });
		}

		const playersCollection = await collections.players();
		const stats = TIME_CONTROL_TYPES.reduce((acc, type) => {
			acc[type] = DEFAULT_PLAYER_STATS(startingRating);
			return acc;
		}, {} as Record<TimeControlType, ReturnType<typeof DEFAULT_PLAYER_STATS>>);

		await playersCollection.insertOne({
			firstName,
			lastName,
			stats,
			startingRating,
			createdAt: new Date()
		});

		return { success: true };
	},

	updatePlayer: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('playerId') ?? '');
		const firstName = String(form.get('firstName') ?? '').trim();
		const lastName = String(form.get('lastName') ?? '').trim();

		if (!id || !firstName || !lastName) {
			return fail(400, { message: 'Missing fields.' });
		}

		if (!ObjectId.isValid(id)) {
			return fail(400, { message: 'Invalid identifier.' });
		}
		const objectId = new ObjectId(id);
		const playersCollection = await collections.players();
		await playersCollection.updateOne(
			{ _id: objectId },
			{ $set: { firstName, lastName, updatedAt: new Date() } }
		);

		return { success: true };
	},

	deletePlayer: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('playerId') ?? '');

		if (!id) {
			return fail(400, { message: 'Player id missing.' });
		}

		if (!ObjectId.isValid(id)) {
			return fail(400, { message: 'Invalid identifier.' });
		}
		const objectId = new ObjectId(id);
		const [playersCollection, gamesCollection] = await Promise.all([collections.players(), collections.games()]);

		await playersCollection.deleteOne({ _id: objectId });
		await gamesCollection.deleteMany({ $or: [{ whiteId: id }, { blackId: id }] });

		return { success: true };
	},

	addGame: async ({ request }) => {
		const form = await request.formData();
		const whiteId = String(form.get('whiteId') ?? '');
		const blackId = String(form.get('blackId') ?? '');
		const resultRaw = String(form.get('result') ?? '');
		const startMinutesValue = form.get('startMinutes');
		const incrementSecondsValue = form.get('incrementSeconds');
		const causeRaw = form.get('cause') ? String(form.get('cause')) : null;
		const playedAtValue = form.get('playedAt');

		if (!whiteId || !blackId || !resultRaw) {
			return fail(400, { message: 'All required fields must be filled.' });
		}

		if (whiteId === blackId) {
			return fail(400, { message: 'A player cannot play both colors.' });
		}

		if (!RESULT_VALUES.includes(resultRaw as (typeof RESULT_VALUES)[number])) {
			return fail(400, { message: 'Invalid result.' });
		}
		const result = resultRaw as (typeof RESULT_VALUES)[number];

		if (causeRaw && !RESULT_CAUSES.includes(causeRaw as (typeof RESULT_CAUSES)[number])) {
			return fail(400, { message: 'Invalid cause.' });
		}
		const cause = causeRaw ? (causeRaw as (typeof RESULT_CAUSES)[number]) : null;

		const startMinutes =
			typeof startMinutesValue === 'string' && startMinutesValue !== ''
				? Number(startMinutesValue)
				: null;
		const incrementSeconds =
			typeof incrementSecondsValue === 'string' && incrementSecondsValue !== ''
				? Number(incrementSecondsValue)
				: null;

		if (
			(startMinutes !== null && Number.isNaN(startMinutes)) ||
			(incrementSeconds !== null && Number.isNaN(incrementSeconds))
		) {
			return fail(400, { message: 'Time control inputs must be numbers.' });
		}

		if ((startMinutes ?? 0) < 0 || (incrementSeconds ?? 0) < 0) {
			return fail(400, { message: 'Time control inputs must be ≥ 0.' });
		}

		const playedAt =
			typeof playedAtValue === 'string' && playedAtValue
				? new Date(playedAtValue)
				: new Date();

		const [whiteObjectId, blackObjectId] = [whiteId, blackId].map((id) => {
			if (!ObjectId.isValid(id)) {
				throw fail(400, { message: 'Invalid player id.' });
			}
			return new ObjectId(id);
		});

		const playersCollection = await collections.players();
		const playersDocs = await playersCollection
			.find({ _id: { $in: [whiteObjectId, blackObjectId] } })
			.toArray();

		const whiteDoc = playersDocs.find((doc) => doc._id!.equals(whiteObjectId));
		const blackDoc = playersDocs.find((doc) => doc._id!.equals(blackObjectId));

		if (!whiteDoc || !blackDoc) {
			return fail(404, { message: 'Player not found.' });
		}

		const timeControls = await getTimeControlSettings();
		const timeControlType = determineTimeControlType(startMinutes, incrementSeconds, timeControls);

		const scoreMap: Record<(typeof RESULT_VALUES)[number], number> = {
			'1-0': 1,
			'0-1': 0,
			'0.5-0.5': 0.5
		};

		const whiteScore = scoreMap[result];
		const blackScore = 1 - whiteScore;

		const whiteStats = cloneStats(whiteDoc.stats?.[timeControlType]);
		const blackStats = cloneStats(blackDoc.stats?.[timeControlType]);

		const updatedWhite = recordOutcome(applyElo(whiteStats, blackStats, whiteScore), whiteScore);
		const updatedBlack = recordOutcome(applyElo(blackStats, whiteStats, blackScore), blackScore);

		await playersCollection.updateOne(
			{ _id: whiteObjectId },
			{ $set: { [`stats.${timeControlType}`]: updatedWhite } }
		);

		await playersCollection.updateOne(
			{ _id: blackObjectId },
			{ $set: { [`stats.${timeControlType}`]: updatedBlack } }
		);

		const gamesCollection = await collections.games();
		await gamesCollection.insertOne({
			whiteId,
			blackId,
			result,
			timeControlType,
			startMinutes,
			incrementSeconds,
			cause,
			playedAt
		});

		return { success: true };
	},

	updateTimeControls: async ({ request }) => {
		const form = await request.formData();
		const timeControls = await getTimeControlSettings();

		const parseOrFallback = (value: FormDataEntryValue | null, fallback: number): number => {
			if (typeof value !== 'string' || value.trim() === '') return fallback;
			const parsed = Number(value);
			if (Number.isNaN(parsed)) {
				throw fail(400, { message: 'Upper bounds must be numbers.' });
			}
			return parsed;
		};

		let bulletUpper = parseOrFallback(form.get('bulletUpper'), timeControls.Bullet.upper ?? 0);
		if (bulletUpper < 0) bulletUpper = 0;

		let blitzUpper = parseOrFallback(
			form.get('blitzUpper'),
			timeControls.Blitz.upper ?? bulletUpper + 10
		);
		if (blitzUpper < bulletUpper + 1) {
			blitzUpper = bulletUpper + 1;
		}

		let rapidUpper = parseOrFallback(
			form.get('rapidUpper'),
			timeControls.Rapid.upper ?? blitzUpper + 10
		);
		if (rapidUpper < blitzUpper + 1) {
			rapidUpper = blitzUpper + 1;
		}

		const classicalUpperRaw = form.get('classicalUpper');
		let classicalUpper: number | undefined;
		if (typeof classicalUpperRaw === 'string' && classicalUpperRaw.trim() !== '') {
			const parsed = Number(classicalUpperRaw);
			if (Number.isNaN(parsed)) {
				return fail(400, { message: 'Invalid classical upper bound.' });
			}
			classicalUpper = parsed;
		}
		if (classicalUpper !== undefined && classicalUpper < rapidUpper + 1) {
			classicalUpper = rapidUpper + 1;
		}

		try {
			const ranges = convertUppersToRanges({
				Bullet: bulletUpper,
				Blitz: blitzUpper,
				Rapid: rapidUpper,
				Classical: classicalUpper
			});
			await saveTimeControlSettings(ranges);
		} catch (err) {
			return fail(400, { message: err instanceof Error ? err.message : 'Invalid ranges.' });
		}

		return { success: true };
	},

	logout: async ({ cookies }) => {
		const token = cookies.get('session');
		if (token) {
			await deleteSessionByToken(token);
		}
		cookies.delete('session', { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
