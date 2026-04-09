import { Page, expect } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────
export const FAB_BUTTON_SELECTORS = [
  '[data-testid="fab-button"]',
  'button[aria-label*="assistant"]',
  'button[aria-label*="FAB"]',
  '.fab-button',
  'button:has-text("✦")',
  // Fallback: find any fixed-position circular button in bottom-right
];

export const GUIDED_FLOW_ANSWERS = [
  'Ahmed Al Mansouri',           // Q1: Name
  'Sales Executive',             // Q2: Job title
  'Dubai, UAE',                  // Q3: Location
  'Banking and Finance',         // Q4: Industry
  '5 years',                     // Q5: Experience
  'Customer relationship management, AML/KYC, CRM', // Q6: Skills
  'Emirates NBD',                // Q7: Current/last company
  'Managed a portfolio of 200+ clients', // Q8: Achievement
  'MBA in Finance',              // Q9: Education
  'English, Arabic',             // Q10: Languages
  'Looking for senior banking role in UAE', // Q11: Goal
];

// ─── Find FAB button ──────────────────────────────────────────────────────────
export async function findFAB(page: Page) {
  for (const selector of FAB_BUTTON_SELECTORS) {
    const el = page.locator(selector).first();
    if (await el.isVisible().catch(() => false)) {
      return el;
    }
  }
  // Last resort: screenshot and fail with helpful message
  await page.screenshot({ path: 'test-results/fab-not-found.png' });
  throw new Error('FAB button not found. Screenshot saved to test-results/fab-not-found.png');
}

// ─── Open FAB sheet ───────────────────────────────────────────────────────────
export async function openFAB(page: Page) {
  const fab = await findFAB(page);
  await fab.tap();
  // Wait for sheet to animate in
  await page.waitForTimeout(800);
  console.log('  ✅ FAB opened');
}

// ─── Check FAB is visible ─────────────────────────────────────────────────────
export async function assertFABVisible(page: Page) {
  const fab = await findFAB(page);
  await expect(fab).toBeVisible();
  console.log('  ✅ FAB button is visible on screen');
}

// ─── Check FAB position (should not be hidden behind tab bar) ────────────────
export async function assertFABPosition(page: Page) {
  const fab = await findFAB(page);
  const box = await fab.boundingBox();
  if (!box) throw new Error('Could not get FAB bounding box');

  const viewportSize = page.viewportSize();
  if (!viewportSize) throw new Error('Could not get viewport size');

  // FAB should be in bottom-right quadrant but above bottom 60px (tab bar)
  const fromBottom = viewportSize.height - (box.y + box.height);
  const fromRight = viewportSize.width - (box.x + box.width);

  console.log(`  📍 FAB position — from bottom: ${fromBottom}px, from right: ${fromRight}px`);

  if (fromBottom < 60) {
    console.warn('  ⚠️  FAB may be hidden behind tab bar (less than 60px from bottom)');
  }
  if (fromRight > 100) {
    console.warn('  ⚠️  FAB seems too far from right edge');
  }

  console.log('  ✅ FAB position checked');
}

// ─── Login helper ─────────────────────────────────────────────────────────────
export async function login(page: Page) {
  const email = process.env.TEST_EMAIL || '';
  const password = process.env.TEST_PASSWORD || '';

  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env');
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Try to find login/sign in button
  const signInBtn = page.locator('button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Login"), a:has-text("Login")').first();

  if (await signInBtn.isVisible().catch(() => false)) {
    await signInBtn.click();
    await page.waitForTimeout(500);
  } else {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  console.log('  ✅ Logged in as', email);
}

// ─── Type into FAB chat input ─────────────────────────────────────────────────
export async function typeInFAB(page: Page, text: string) {
  const input = page.locator('input[placeholder*="Type"], textarea[placeholder*="Type"], input[type="text"]').last();
  await input.fill(text);
  await page.waitForTimeout(300);

  // Find and click send button
  const sendBtn = page.locator('button[aria-label*="send"], button:has-text("Send"), button[type="submit"]').last();
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.tap();
  } else {
    await input.press('Enter');
  }

  await page.waitForTimeout(1000);
  console.log(`  💬 Typed: "${text}"`);
}

// ─── Check localStorage for FAB memory ───────────────────────────────────────
export async function checkFABMemory(page: Page) {
  const memory = await page.evaluate(() => {
    const raw = localStorage.getItem('cvp_fab_memory');
    return raw ? JSON.parse(raw) : null;
  });

  if (!memory) {
    console.warn('  ⚠️  cvp_fab_memory not found in localStorage');
    return null;
  }

  console.log('  🧠 FAB Memory dump:', JSON.stringify(memory, null, 2));
  return memory;
}

// ─── Check for JS console errors ─────────────────────────────────────────────
export function captureConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.message}`);
  });
  return errors;
}

// ─── Simulate long press on an element ───────────────────────────────────────
export async function longPress(page: Page, selector: string, duration = 600) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();

  const box = await el.boundingBox();
  if (!box) throw new Error(`Cannot long-press — element not found: ${selector}`);

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.touchscreen.tap(x, y); // initial tap
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(duration);
  await page.mouse.up();

  console.log(`  👆 Long-pressed on ${selector} for ${duration}ms`);
  await page.waitForTimeout(500);
}

// ─── Audit logger — pretty prints step results ────────────────────────────────
export function logStep(step: string, status: 'pass' | 'fail' | 'warn', detail?: string) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️ ';
  const line = `  ${icon} ${step}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
}
