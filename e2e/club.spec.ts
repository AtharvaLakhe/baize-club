import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Functional checks use the real WebGL scene at a lower pixel density so CPU-only
  // CI runners can process input/playback in time. CSS viewport and physics stay intact;
  // full-resolution visual QA is performed separately through the browser plugin.
  await page.addInitScript(() => Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: .5 }));
  await page.addInitScript(() => localStorage.setItem('baize.prefs.v1', JSON.stringify({
    profile: { name: 'Alex', avatar: '🦉', cue: 'maple' }, seenHowTo: true, sound: 0,
  })));
  await page.goto('/');
});

test('the interactive eight reveals the table and can be restored with the keyboard', async ({ page }) => {
  const ball = page.getByRole('button', { name: 'Roll the eight to reveal the table', exact: true });
  await expect(ball).toBeVisible();
  await ball.focus();
  await page.keyboard.press('Enter');
  const reset = page.getByRole('button', { name: 'Bring back the eight', exact: true });
  await expect(reset).toBeFocused();
  await expect(page.locator('.table-preview')).toHaveAttribute('data-open', 'true');
  await reset.press('Enter');
  await expect(ball).toBeFocused();
  await expect(page.locator('.table-preview')).toHaveAttribute('data-open', 'false');
});

test('a horizontal drag rolls the eight away without a second click reversing the reveal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const ball = page.getByRole('button', { name: 'Roll the eight to reveal the table', exact: true });
  const bounds = await ball.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2, y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 110, y + 12, { steps: 8 });
  await expect.poll(() => ball.evaluate(el => parseFloat(el.style.getPropertyValue('--drag-x')))).toBeGreaterThan(30);
  await page.mouse.up();
  await expect(page.locator('.table-preview')).toHaveAttribute('data-open', 'true');
  await expect(page.getByRole('button', { name: 'Bring back the eight', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bring back the eight', exact: true }).click();
  const release = await page.locator('.table-preview').evaluate(el => el.style.getPropertyValue('--release-x'));
  expect(release).toBe('');
  await page.getByRole('button', { name: 'Snooker', exact: true }).click();
  await expect(page.locator('.table-preview')).toHaveAttribute('data-open', 'true');
});

test('cancelling a drag restores the ball and leaves the next activation usable', async ({ page }) => {
  const ball = page.getByRole('button', { name: 'Roll the eight to reveal the table', exact: true });
  const bounds = await ball.boundingBox();
  const x = bounds!.x + bounds!.width / 2, y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y, { steps: 4 });
  await ball.dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true });
  await page.mouse.up();
  await expect(page.locator('.table-preview')).toHaveAttribute('data-open', 'false');
  await expect(ball).not.toHaveClass(/dragging/);
  await ball.click();
  await expect(page.locator('.table-preview')).toHaveAttribute('data-open', 'true');
});

test('game and mode selections remain keyboard focused and update the action', async ({ page }) => {
  await page.getByRole('button', { name: '8-ball pool', exact: true }).click();
  await expect(page.getByRole('button', { name: '8-ball pool', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: '8-ball pool', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'The computer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'The computer', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Hard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hard', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Play the computer', exact: true })).toBeVisible();
});

test('profile traps focus after replacing an avatar and restores its trigger on Escape', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Edit your profile' });
  await trigger.click();
  await page.getByRole('button', { name: '🐼', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog').locator(':focus')).toHaveCount(1);
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('invalid invites show an inline error and a pending join can be cancelled', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Table code or invite link' }).fill('abc');
  await page.getByRole('button', { name: 'Join table', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('six-character');
  await page.getByRole('textbox', { name: 'Table code or invite link' }).fill('https://example.com/t/ABC234');
  await page.getByRole('button', { name: 'Join table', exact: true }).click();
  await page.getByRole('button', { name: 'Back to the club', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'obsidian', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('pass-and-play can concede and start a rematch on one device', async ({ page }) => {
  test.setTimeout(60_000); // Includes software WebGL initialization and several real input round trips.
  await page.getByRole('button', { name: '8-ball pool', exact: true }).click();
  await page.getByRole('button', { name: 'Pass-and-play', exact: true }).click();
  await page.getByRole('button', { name: 'Set up pass-and-play', exact: true }).click();
  await page.getByRole('textbox', { name: 'Opponent name' }).fill('Sam');
  await page.getByRole('button', { name: 'Start pass-and-play', exact: true }).click();
  await page.getByRole('region', { name: 'Scoreboard' }).waitFor();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Concede frame' }).click();
  await expect(page.getByRole('button', { name: 'Concede', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Concede', exact: true }).click();
  await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toContainText('Frame 1');
  await expect(page.locator('.score')).toHaveText(['0', '0']);
});

test('practice starts in both games', async ({ page }) => {
  test.setTimeout(60_000); // Builds two complete WebGL rooms on CPU-only runners.
  for (const game of ['Snooker', '8-ball pool']) {
    await page.goto('/');
    await page.getByRole('button', { name: game, exact: true }).click();
    await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
    await page.getByRole('button', { name: 'Start practising', exact: true }).click();
    await expect(page.locator('canvas.table')).toHaveAttribute('aria-label', game === 'Snooker' ? 'Snooker table' : '8-ball pool table');
    await expect(page.locator('.room-kind')).toContainText('Solo practice');
  }
});

test('reduced motion starts with a paused preview and supports a static game switch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'Roll the eight to reveal the table', exact: true }).click();
  await expect(page.locator('.ball-gate')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Play table preview', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '8-ball pool', exact: true }).click();
  await expect(page.getByRole('heading', { name: '8-ball pool', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play table preview', exact: true })).toBeVisible();
});

test('switching games releases the previous table graphics', async ({ page }) => {
  const counts = await page.evaluate(async () => {
    const { Renderer3D } = await import('/src/render/renderer3d.ts');
    const { DEFAULT_SETTINGS, tableFor, rack } = await import('/src/core/rules.ts');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:-2000px;width:600px;height:300px';
    document.body.append(canvas);
    const renderer = new Renderer3D(canvas, tableFor(DEFAULT_SETTINGS), 'championship');
    const counts: number[] = [];
    try {
      for (let i = 0; i < 5; i++) {
        const settings = { ...DEFAULT_SETTINGS, game: i % 2 ? 'pool8' : 'snooker' };
        const table = tableFor(settings);
        renderer.setTable(table, 'championship');
        renderer.draw({ balls: rack(settings, table), pots: [], now: performance.now(), cue: null, guide: null, placing: null, labels: false, orient: () => [1, 0, 0, 0, 1, 0, 0, 0, 1], moving: false });
        counts.push(renderer.gl.info.memory.geometries);
      }
      return counts;
    } finally { renderer.dispose(); canvas.remove(); }
  });
  expect(counts[2]).toBe(counts[0]);
  expect(counts[4]).toBe(counts[0]);
});

test('the shot clock accounts for time spent replaying the shot', async ({ page }) => {
  await page.evaluate(async () => {
    const { Session } = await import('/src/net/session.ts');
    const { GameView } = await import('/src/ui/game.ts');
    const { DEFAULT_SETTINGS, newMatch, tableFor, resolveShot } = await import('/src/core/rules.ts');
    const { makeWorld, simulate } = await import('/src/core/physics.ts');
    const settings = { ...DEFAULT_SETTINGS, playAgain: false, freeBall: false, shotClock: 20 };
    const match = newMatch(settings, 0);
    match.frame.ballInHand = false;
    const link = { send() {}, close() {}, onMessage: (_msg: unknown) => {}, onClose() {} };
    const session = new Session(link, null, () => {});
    link.onMessage({ t: 'welcome', you: 'alex', room: { code: 'LOCAL', hostId: 'alex', kind: 'local', members: [{ id: 'alex', name: 'Alex', avatar: '🦉', cue: 'maple', connected: true }], seats: ['alex', 'sam', null, null], settings, status: 'playing', rematchVotes: [] }, match });
    const view = new GameView(session, { leave() {} });
    document.querySelector('#app')!.replaceChildren();
    view.mount(document.querySelector('#app')!);
    const params = { dx: 0, dy: -1, power: .08, spinX: 0, spinY: 0 };
    const world = makeWorld(tableFor(settings), match.frame.balls);
    const record = simulate(world, params);
    const result = resolveShot(match, record, world.balls);
    const clockMs = 20000 + world.time * 1000 + 600;
    const sentAt = performance.now();
    (window as any).clockQA = { view, expectedDeadline: sentAt + clockMs };
    link.onMessage({ t: 'shot', seq: match.seq, start: match.frame.balls, params, result, clockMs });
  });
  await page.waitForFunction(() => (window as any).clockQA.view.match.seq === 1 && !(window as any).clockQA.view.anim);
  const error = await page.evaluate(() => Math.abs((window as any).clockQA.view.clockDeadline - (window as any).clockQA.expectedDeadline));
  expect(error).toBeLessThan(200);
});

test('the club remains usable when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl' || type === 'webgl2' ? null : getContext.apply(this, [type, ...args] as any);
    } as typeof getContext;
  });
  await page.reload();
  await page.getByRole('button', { name: 'Roll the eight to reveal the table', exact: true }).click();
  await expect(page.locator('.preview-fallback')).toBeVisible();
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  await page.getByRole('button', { name: 'Start practising', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('WebGL support');
});

for (const width of [375, 768, 1024, 1440]) {
  test(`home controls fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Join table', exact: true }).scrollIntoViewIfNeeded();
    const fits = await page.locator('.site').evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(fits).toBe(true);
    await expect(page.getByRole('button', { name: 'Join table', exact: true })).toBeVisible();
  });
}

test('the landscape lobby keeps its content and start action accessible', async ({ page }) => {
  for (const viewport of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      const { buildLobby } = await import('/src/ui/lobby.ts');
      const { Session } = await import('/src/net/session.ts');
      const { HostRoom } = await import('/src/net/host.ts');
      const { DEFAULT_SETTINGS } = await import('/src/core/rules.ts');
      const host = new HostRoom('ABC234', 'alex', 'online', DEFAULT_SETTINGS);
      host.room.members = [{ id: 'alex', name: 'Alex', avatar: '🦉', cue: 'maple', connected: true }];
      host.room.seats = ['alex', null, null, null];
      const session = new Session({ send() {}, close() {}, onMessage() {}, onClose() {} }, host, () => {});
      session.room = host.room; session.you = 'alex';
      const root = document.createElement('div'); root.className = 'game';
      let tab = 'players';
      const render = () => root.replaceChildren(buildLobby(session, { leave() {}, preview() {}, tab, selectTab(next) { tab = next; render(); } }));
      render(); document.querySelector('#app')!.replaceChildren(root);
    });
    const content = await page.locator('.lobby-content').boundingBox();
    const start = await page.locator('.lobby-foot button').boundingBox();
    expect(content!.height).toBeGreaterThan(80);
    expect(start!.y + start!.height).toBeLessThan(viewport.height);
    await page.getByRole('tab', { name: 'House rules', exact: true }).click();
    await page.getByText('Marbles', { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText('Marbles', { exact: true })).toBeVisible();
  }
});
