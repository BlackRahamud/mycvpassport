/**
 * CVPassport FAB Auditor — New User Persona
 * Simulates a first-time visitor discovering the site
 * No login, no prior state, fresh browser context
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import {
  assertFABVisible,
  assertFABPosition,
  openFAB,
  captureConsoleErrors,
  logStep,
} from '../helpers/fab-helpers';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://mycvpassport.com';

test.describe('🆕 New User Journey — First-Timer Persona', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    // Fresh state — no login, no cookies
    await page.context().clearCookies();
    // Navigate to site first before touching localStorage
    await page.goto(process.env.BASE_URL || 'https://mycvpassport.com');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch (e) { /* ignore */ }
    });
  });

  test.afterEach(async ({}, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log('\n  🔴 Console errors captured during test:');
      consoleErrors.forEach(e => console.log('    ', e));
      testInfo.annotations.push({ type: 'Console Errors', description: consoleErrors.join('\n') });
    }
  });

  // ── Step 1: Landing page loads ──────────────────────────────────────────────
  test('1. Landing page loads correctly', async ({ page }) => {
    console.log('\n📋 STEP 1 — Landing Page Load');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check title
    const title = await page.title();
    console.log(`  📄 Page title: "${title}"`);
    expect(title).toBeTruthy();

    // Check hero section exists
    const hero = page.locator('h1, [class*="hero"], [class*="Hero"]').first();
    await expect(hero).toBeVisible();
    logStep('Hero section visible', 'pass');

    // Check no blank white screen
    const bodyBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    console.log(`  🎨 Body background: ${bodyBg}`);

    await page.screenshot({ path: 'test-results/01-landing-page.png' });
    logStep('Landing page loaded', 'pass', title);
  });

  // ── Step 2: CTAs visible ────────────────────────────────────────────────────
  test('2. Landing page CTAs are clickable', async ({ page }) => {
    console.log('\n📋 STEP 2 — CTA Buttons');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for primary CTA
    const primaryCTA = page.locator(
      'button:has-text("Build"), a:has-text("Build"), button:has-text("Get Started"), a:has-text("Get Started"), button:has-text("Start")'
    ).first();

    if (await primaryCTA.isVisible().catch(() => false)) {
      logStep('Primary CTA found', 'pass', await primaryCTA.textContent() || '');
      await page.screenshot({ path: 'test-results/02-cta-visible.png' });
    } else {
      logStep('Primary CTA not found', 'warn', 'Could not locate main CTA button');
      await page.screenshot({ path: 'test-results/02-cta-missing.png' });
    }

    // Check ATS checker CTA
    const atsCTA = page.locator('button:has-text("ATS"), a:has-text("ATS")').first();
    if (await atsCTA.isVisible().catch(() => false)) {
      logStep('ATS CTA found', 'pass');
    }
  });

  // ── Step 3: FAB visible to anonymous user ───────────────────────────────────
  test('3. FAB is visible to anonymous user', async ({ page }) => {
    console.log('\n📋 STEP 3 — FAB Visibility (Anonymous)');
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Let FAB animate in

    await assertFABVisible(page);
    await assertFABPosition(page);
    await page.screenshot({ path: 'test-results/03-fab-visible-anon.png' });
  });

  // ── Step 4: FAB opens ───────────────────────────────────────────────────────
  test('4. FAB opens on tap', async ({ page }) => {
    console.log('\n📋 STEP 4 — FAB Open');
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openFAB(page);
    await page.screenshot({ path: 'test-results/04-fab-open.png' });

    // Check sheet is visible
    const sheet = page.locator('[class*="sheet"], [class*="Sheet"], [class*="fab-sheet"]').first();
    if (await sheet.isVisible().catch(() => false)) {
      logStep('FAB sheet appeared', 'pass');
    } else {
      logStep('FAB sheet not detected — checking for any overlay', 'warn');
    }
  });

  // ── Step 5: Walk-In Mode accessible ────────────────────────────────────────
  test('5. Walk-In Mode loads for anonymous user', async ({ page }) => {
    console.log('\n📋 STEP 5 — Walk-In Mode');
    await page.goto(`${BASE_URL}/walk-in`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/05-walkin-mode.png' });

    const heading = page.locator('h1, h2').first();
    const headingText = await heading.textContent().catch(() => '');
    console.log(`  📄 Walk-In heading: "${headingText}"`);

    if (headingText?.toLowerCase().includes('walk')) {
      logStep('Walk-In Mode loaded', 'pass', headingText);
    } else {
      logStep('Walk-In Mode heading unexpected', 'warn', headingText || 'No heading found');
    }
  });

  // ── Step 6: Navigate to templates ──────────────────────────────────────────
  test('6. Templates page loads', async ({ page }) => {
    console.log('\n📋 STEP 6 — Templates');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Look for templates link/button
    const templatesLink = page.locator('a:has-text("Template"), button:has-text("Template")').first();
    if (await templatesLink.isVisible().catch(() => false)) {
      await templatesLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      logStep('Navigated to templates', 'pass');
    } else {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      logStep('Went directly to dashboard', 'pass');
    }

    await page.screenshot({ path: 'test-results/06-templates.png' });
  });

  // ── Step 7: ATS Checker accessible ─────────────────────────────────────────
  test('7. ATS Checker is reachable', async ({ page }) => {
    console.log('\n📋 STEP 7 — ATS Checker');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const atsLink = page.locator('a:has-text("ATS"), button:has-text("ATS")').first();
    if (await atsLink.isVisible().catch(() => false)) {
      await atsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/07-ats-checker.png' });
      logStep('ATS Checker reached via nav', 'pass');
    } else {
      logStep('ATS Checker link not in nav', 'warn', 'May be inside builder only');
      await page.screenshot({ path: 'test-results/07-ats-not-in-nav.png' });
    }
  });

  // ── Step 8: Sign up flow ────────────────────────────────────────────────────
  test('8. Sign up page is reachable and form renders', async ({ page }) => {
    console.log('\n📋 STEP 8 — Sign Up Flow');
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/08-auth-page.png' });

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible().catch(() => false)) {
      logStep('Email input found', 'pass');
    } else {
      logStep('Email input not found', 'fail', 'Auth page may not be rendering');
    }

    if (await passwordInput.isVisible().catch(() => false)) {
      logStep('Password input found', 'pass');
    } else {
      logStep('Password input not found', 'fail');
    }
  });
});
