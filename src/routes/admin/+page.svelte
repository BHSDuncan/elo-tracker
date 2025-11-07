<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { format } from 'date-fns';

	const { data, form } = $props<{ data: PageData; form: ActionData | null }>();
	const { players, games, timeControls, resultValues, resultCauses } = data;
	const today = new Date().toISOString().split('T')[0];
</script>

<section class="admin-header">
	<div>
		<p class="eyebrow">Command deck</p>
		<h1>Admin console</h1>
		<p class="tagline">Manage players, log games, and tune time controls.</p>
	</div>
	<form method="POST" action="?/logout">
		<button type="submit">Log out</button>
	</form>
</section>

{#if form?.message}
	<p class="form-alert">{form.message}</p>
{/if}

<section class="panel-grid">
	<article class="panel">
		<h2>Add player</h2>
		<form method="POST" action="?/addPlayer">
			<label>
				<span>First name</span>
				<input name="firstName" required placeholder="Ada" />
			</label>
			<label>
				<span>Last name</span>
				<input name="lastName" required placeholder="Lovelace" />
			</label>
			<button type="submit">Add player</button>
		</form>
	</article>

	<article class="panel">
		<h2>Recent games</h2>
		<div class="table-wrapper">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>White</th>
						<th>Black</th>
						<th>Result</th>
						<th>Control</th>
					</tr>
				</thead>
				<tbody>
					{#if games.length === 0}
						<tr>
							<td colspan="5">No games yet.</td>
						</tr>
					{:else}
					{#each games as game (game.id)}
							<tr>
								<td>{format(new Date(game.playedAt), 'MMM d, yyyy')}</td>
								<td>{game.whiteName}</td>
								<td>{game.blackName}</td>
								<td>{game.result}</td>
								<td>{game.timeControlType}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</article>
</section>

<section class="panel-grid">
	<article class="panel wide">
		<h2>Players</h2>
		<div class="player-list">
			{#if players.length === 0}
				<p class="muted">No players yet.</p>
			{:else}
				{#each players as player (player.id)}
					<div class="player-item">
						<form class="player-edit" method="POST" action="?/updatePlayer">
							<input type="hidden" name="playerId" value={player.id} />
							<input name="firstName" value={player.firstName} />
							<input name="lastName" value={player.lastName} />
							<button type="submit">Save</button>
						</form>
						<form method="POST" action="?/deletePlayer">
							<input type="hidden" name="playerId" value={player.id} />
							<button type="submit" class="ghost">Delete</button>
						</form>
					</div>
				{/each}
			{/if}
		</div>
	</article>
</section>

<section class="panel-grid">
	<article class="panel">
		<h2>Log a game</h2>
		<form method="POST" action="?/addGame">
			<label>
				<span>White</span>
				<select name="whiteId" required>
					<option value="" disabled selected>Select player</option>
					{#each players as player (player.id)}
						<option value={player.id}>{player.firstName} {player.lastName}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Black</span>
				<select name="blackId" required>
					<option value="" disabled selected>Select player</option>
					{#each players as player (player.id)}
						<option value={player.id}>{player.firstName} {player.lastName}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Result</span>
				<select name="result" required>
					{#each resultValues as value (value)}
						<option value={value}>{value}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Played on</span>
				<input type="date" name="playedAt" max={today} value={today} />
			</label>

			<div class="time-inputs">
				<label>
					<span>Start minutes</span>
					<input type="number" name="startMinutes" min="0" step="1" placeholder="5" />
				</label>

				<label>
					<span>Increment (sec)</span>
					<input type="number" name="incrementSeconds" min="0" step="1" placeholder="3" />
				</label>
			</div>

			<label>
				<span>Cause</span>
				<select name="cause">
					<option value="">—</option>
					{#each resultCauses as cause (cause)}
						<option value={cause}>{cause}</option>
					{/each}
				</select>
			</label>

			<button type="submit">Record game</button>
		</form>
	</article>

	<article class="panel">
		<h2>Time controls</h2>
		<form method="POST" action="?/updateTimeControls">
			<p class="muted">
				Set upper bounds (minutes). Lower bounds are locked to preserve continuity.
			</p>

			<label>
				<span>Bullet upper</span>
				<input type="number" name="bulletUpper" min="0" value={timeControls.Bullet.upper ?? 0} />
			</label>
			<label>
				<span>Blitz upper</span>
				<input
					type="number"
					name="blitzUpper"
					min={(timeControls.Bullet.upper ?? 0) + 1}
					value={timeControls.Blitz.upper ?? 0}
				/>
			</label>
			<label>
				<span>Rapid upper</span>
				<input
					type="number"
					name="rapidUpper"
					min={(timeControls.Blitz.upper ?? 0) + 1}
					value={timeControls.Rapid.upper ?? 0}
				/>
			</label>
			<label>
				<span>Classical upper (optional)</span>
				<input
					type="number"
					name="classicalUpper"
					min={(timeControls.Rapid.upper ?? 0) + 1}
					value={timeControls.Classical.upper ?? ''}
				/>
			</label>

			<button type="submit">Save ranges</button>
		</form>
	</article>
</section>
