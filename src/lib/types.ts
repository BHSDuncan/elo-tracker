import type { ObjectId } from 'mongodb';

export const TIME_CONTROL_TYPES = ['Bullet', 'Blitz', 'Rapid', 'Classical'] as const;
export type TimeControlType = (typeof TIME_CONTROL_TYPES)[number];

export const RESULT_VALUES = ['1-0', '0-1', '0.5-0.5'] as const;
export type GameResultValue = (typeof RESULT_VALUES)[number];

export const RESULT_CAUSES = [
	'Checkmate',
	'Resignation',
	'Time expired',
	'Forefit',
	'Stalemate',
	'Threefold repetition',
	'Fivefold repetition',
	'50-move rule',
	'Mutual agreement',
	'Dead position',
	'Time expired + insufficient material'
] as const;
export type GameResultCause = (typeof RESULT_CAUSES)[number];

export interface PlayerStats {
	rating: number;
	wins: number;
	losses: number;
	draws: number;
}

export interface PlayerRecord {
	id: string;
	firstName: string;
	lastName: string;
	stats: Record<TimeControlType, PlayerStats>;
	createdAt: Date;
}

export interface GameRecord {
	_id: string;
	whiteId: string;
	blackId: string;
	result: GameResultValue;
	timeControlType: TimeControlType;
	startMinutes?: number;
	incrementSeconds?: number;
	cause?: GameResultCause;
	playedAt: Date;
}

export interface TimeControlRange {
	lower: number;
	upper?: number;
}

export type TimeControlSettings = Record<TimeControlType, TimeControlRange>;

export interface AdminSession {
	id: string;
	email: string;
	expiresAt: Date;
}

export interface PlayerWithRecord extends PlayerRecord {
	stats: Record<TimeControlType, PlayerStats>;
}

export const DEFAULT_PLAYER_STATS = (): PlayerStats => ({
	rating: 1200,
	wins: 0,
	losses: 0,
	draws: 0
});

export const SESSION_DURATION_MINUTES = 30;

export interface PlayerDoc {
	_id?: ObjectId;
	firstName: string;
	lastName: string;
	stats?: Record<TimeControlType, PlayerStats>;
	createdAt: Date;
	updatedAt?: Date;
}

export interface GameDoc {
	_id?: ObjectId;
	whiteId: string;
	blackId: string;
	result: GameResultValue;
	timeControlType: TimeControlType;
	startMinutes?: number | null;
	incrementSeconds?: number | null;
	cause?: GameResultCause | null;
	playedAt: Date;
}

export interface SessionDoc {
	_id?: ObjectId;
	email: string;
	tokenHash: string;
	createdAt: Date;
	expiresAt: Date;
}

export interface TimeControlDoc {
	_id: string;
	ranges: TimeControlSettings;
}
