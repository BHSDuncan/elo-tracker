<script lang="ts">
	import type { ActionData } from './$types';

	const { form } = $props<{ form: ActionData | null }>();
</script>

<section class="auth-card">
	<p class="eyebrow">Admin access</p>
	<h1>Sign in</h1>
	<form method="POST" class="auth-form">
		<label>
			<span>Email</span>
			<input type="email" name="email" placeholder="captain@club.local" required />
		</label>

		<label>
			<span>Password</span>
			<input type="password" name="password" placeholder="••••••••" required />
		</label>

		{#if form?.message}
			<p class="form-error">{form.message}</p>
		{/if}

		<button type="submit">Enter command deck</button>
	</form>
</section>
