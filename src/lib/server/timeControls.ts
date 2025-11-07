import { TIME_CONTROL_TYPES, type TimeControlSettings, type TimeControlType } from '$lib/types';
import { collections, DEFAULT_TIME_CONTROLS } from './db';

const DOC_ID = 'settings';

export const getTimeControlSettings = async (): Promise<TimeControlSettings> => {
	const col = await collections.timeControls();
	const doc = await col.findOne({ _id: DOC_ID });
	if (doc?.ranges) {
		return doc.ranges;
	}
	await col.updateOne(
		{ _id: DOC_ID },
		{ $set: { ranges: DEFAULT_TIME_CONTROLS }, $setOnInsert: { _id: DOC_ID } },
		{ upsert: true }
	);
	return DEFAULT_TIME_CONTROLS;
};

export const saveTimeControlSettings = async (ranges: TimeControlSettings) => {
	const col = await collections.timeControls();
	await col.updateOne({ _id: DOC_ID }, { $set: { ranges } }, { upsert: true });
};

export const determineTimeControlType = (
	startMinutes: number | null,
	incrementSeconds: number | null,
	settings: TimeControlSettings
): TimeControlType => {
	if (startMinutes == null && incrementSeconds == null) {
		return 'Classical';
	}

	const totalMinutes = Math.max(0, (startMinutes ?? 0) + (incrementSeconds ?? 0) / 60);

	for (const type of TIME_CONTROL_TYPES) {
		const range = settings[type];
		const upper = range.upper ?? Number.POSITIVE_INFINITY;
		if (totalMinutes >= range.lower && totalMinutes < upper) {
			return type;
		}
	}

	return 'Classical';
};

export interface TimeControlUppers {
	Bullet: number;
	Blitz: number;
	Rapid: number;
	Classical?: number;
}

export const convertUppersToRanges = (uppers: TimeControlUppers): TimeControlSettings => {
	if (uppers.Bullet < 0) throw new Error('Bullet upper bound must be ≥ 0');

	const bullet = { lower: 0, upper: uppers.Bullet };
	const blitzLower = bullet.upper + 1;
	if (uppers.Blitz < blitzLower) throw new Error('Blitz upper must be ≥ Bullet upper + 1');
	const blitz = { lower: blitzLower, upper: uppers.Blitz };

	const rapidLower = blitz.upper + 1;
	if (uppers.Rapid < rapidLower) throw new Error('Rapid upper must be ≥ Blitz upper + 1');
	const rapid = { lower: rapidLower, upper: uppers.Rapid };

	const classicalLower = rapid.upper + 1;
	if (uppers.Classical !== undefined && uppers.Classical < classicalLower) {
		throw new Error('Classical upper must be ≥ Rapid upper + 1');
	}
	const classical = { lower: classicalLower, upper: uppers.Classical };

	return {
		Bullet: bullet,
		Blitz: blitz,
		Rapid: rapid,
		Classical: classical
	};
};
