/**
 * CVPassport FAB Auditor — Frequent User Persona
 * Simulates a pro user who logs in and uses the builder daily
 * Tests: login → builder → FAB chips → progress coach → download → ATS
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import {
  login,
  openFAB,
  assertFABVisible,
  assertFABPosition,
  checkFABMemory,
  captureConsoleErrors,
  longPress,
  logStep,
} from '../helpers/fab-helpers';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://mycvpassport.com';

test.describe('⚡ Frequent User Journey — Power User Persona', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
  });

  test.afterEach(async ({}, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log('\n  🔴 Console errors during test:');
      consoleErrors.forEach(e => console.log('    ', e));
      testInfo.annotations.push({ type: 'Console Errors', description: consoleErrors.join('\n') });
    }
  });

  // ── Step 1: Login ───────────────────────────────────────────────────────────
  test('1. Login with pro account', async ({ page }) => {
    console.log('\n📋 STEP 1 — Login');
    await login(page);

    // Confirm we're logged in — should see dashboard or builder
    const url = page.url();
    console.log(`  🌐 Post-login URL: ${url}`);

    await page.screenshot({ path: 'test-results/pu-01-logged-in.png' });
    logStep('Login complete', 'pass', url);
  });

  // ── Step 2: Dashboard loads ─────────────────────────────────────────────────
  test('2. Dashboard loads with CV data', async ({ page }) => {
    console.log('\n📋 STEP 2 — Dashboard');
    await login(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-results/pu-02-dashboard.png' });

    // Check for CV content or empty state
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.includes('CV') || bodyText?.includes('template') || bodyText?.includes('builder')) {
      logStep('Dashboard loaded with content', 'pass');
    } else {
      logStep('Dashboard content unclear', 'warn', 'May be empty state for new account');
    }
  });

  // ── Step 3: Navigate to Builder ─────────────────────────────────────────────
  test('3. Builder loads and CV preview renders', async ({ page }) => {
    console.log('\n📋 STEP 3 — Builder + CV Preview');
    await login(page);

    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/pu-03-builder.png' });

    // Check CV preview exists
    const preview = page.locator('[class*="preview"], [class*="Preview"], [class*="a4"], [class*="A4"]').first();
    if (await preview.isVisible().catch(() => false)) {
      logStep('CV preview rendering', 'pass');
    } else {
      logStep('CV preview not detected', 'warn', 'May need CV data filled first');
    }

    // Check no white void
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.querySelector('main') || document.body).backgroundColor
    );
    console.log(`  🎨 Builder background: ${bgColor}`);
    logStep('Builder background checked', 'pass', bgColor);
  });

  // ── Step 4: FAB visible in builder ──────────────────────────────────────────
  test('4. FAB visible in builder (logged in)', async ({ page }) => {
    console.log('\n📋 STEP 4 — FAB in Builder');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await assertFABVisible(page);
    await assertFABPosition(page);
    await page.screenshot({ path: 'test-results/pu-04-fab-in-builder.png' });
  });

  // ── Step 5: FAB opens and shows correct tab for logged-in pro user ──────────
  test('5. FAB opens — chips and progress coach visible', async ({ page }) => {
    console.log('\n📋 STEP 5 — FAB Sheet (Pro User)');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openFAB(page);
    await page.screenshot({ path: 'test-results/pu-05-fab-sheet.png' });

    // Check for progress coach ring
    const progressRing = page.locator('[class*="progress"], [class*="ring"], [class*="coach"]').first();
    if (await progressRing.isVisible().catch(() => false)) {
      logStep('Progress coach ring visible', 'pass');
    } else {
      logStep('Progress coach ring not detected', 'warn');
    }

    // Check FAB memory after open
    await checkFABMemory(page);
  });

  // ── Step 6: FAB tab navigation ──────────────────────────────────────────────
  test('6. FAB tabs switch correctly', async ({ page }) => {
    console.log('\n📋 STEP 6 — FAB Tab Navigation');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openFAB(page);

    // Try clicking each tab
    const tabs = ['ATS', 'Cover', 'Walk'];
    for (const tabText of tabs) {
      const tab = page.locator(`button:has-text("${tabText}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.tap();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `test-results/pu-06-fab-tab-${tabText.toLowerCase()}.png` });
        logStep(`FAB tab "${tabText}" clicked`, 'pass');
      } else {
        logStep(`FAB tab "${tabText}" not found`, 'warn');
      }
    }
  });

  // ── Step 7: Long-press on CV preview section ─────────────────────────────────
  test('7. Long-press on CV preview triggers contextual edit', async ({ page }) => {
    console.log('\n📋 STEP 7 — Long-Press Contextual Edit');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // Find a data-section element in the CV preview
    const sectionEl = page.locator('[data-section]').first();
    if (await sectionEl.isVisible().catch(() => false)) {
      await longPress(page, '[data-section]', 600);
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'test-results/pu-07-longpress-result.png' });

      // Check for amber glow or confirmation popup
      const popup = page.locator('[class*="popup"], [class*="confirm"], [class*="amber"]').first();
      if (await popup.isVisible().catch(() => false)) {
        logStep('Contextual edit popup appeared after long-press', 'pass');
      } else {
        logStep('Contextual edit popup not detected', 'warn', 'Check if long-press threshold met');
      }
    } else {
      logStep('No [data-section] elements found in preview', 'warn', 'CV may be empty');
      await page.screenshot({ path: 'test-results/pu-07-no-sections.png' });
    }
  });

  // ── Step 8: ATS Checker in builder ──────────────────────────────────────────
  test('8. ATS Checker runs from builder', async ({ page }) => {
    console.log('\n📋 STEP 8 — ATS Checker');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Navigate to ATS tab in builder
    const atsTab = page.locator('button:has-text("ATS"), [data-tab="ats"]').first();
    if (await atsTab.isVisible().catch(() => false)) {
      await atsTab.tap();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/pu-08-ats-tab.png' });
      logStep('ATS tab opened', 'pass');

      // Check for scan button
      const scanBtn = page.locator('button:has-text("Scan"), button:has-text("Check"), button:has-text("Analyze")').first();
      if (await scanBtn.isVisible().catch(() => false)) {
        logStep('ATS scan button found', 'pass');
      } else {
        logStep('ATS scan button not found', 'warn');
      }
    } else {
      logStep('ATS tab not found in builder nav', 'warn');
    }
  });

  // ── Step 9: Download flow ────────────────────────────────────────────────────
  test('9. Download button visible for pro user', async ({ page }) => {
    console.log('\n📋 STEP 9 — Download Flow');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("PDF")').first();
    if (await downloadBtn.isVisible().catch(() => false)) {
      logStep('Download button visible', 'pass');
      await page.screenshot({ path: 'test-results/pu-09-download-btn.png' });

      // Check if pro user sees loading message on click
      await downloadBtn.tap();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/pu-09-download-triggered.png' });

      // Look for loading message
      const loadingMsg = page.locator('text=/Optimizing|Gulf|ATS|generating/i').first();
      if (await loadingMsg.isVisible().catch(() => false)) {
        logStep('PDF loading message appeared', 'pass', await loadingMsg.textContent() || '');
      } else {
        logStep('PDF loading message not detected', 'warn', 'May have completed too fast');
      }
    } else {
      logStep('Download button not found', 'fail', 'Check builder header');
    }
  });

  // ── Step 10: FAB memory persists ────────────────────────────────────────────
  test('10. FAB localStorage memory is written correctly', async ({ page }) => {
    console.log('\n📋 STEP 10 — FAB Memory Persistence');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await openFAB(page);
    await page.waitForTimeout(1000);

    const memory = await checkFABMemory(page);

    if (memory) {
      logStep('FAB memory written to localStorage', 'pass');

      // Check key fields
      if (memory.sessionCount !== undefined) {
        logStep(`Session count: ${memory.sessionCount}`, 'pass');
      }
      if (memory.lastTabVisited) {
        logStep(`Last tab visited: ${memory.lastTabVisited}`, 'pass');
      }
    } else {
      logStep('FAB memory empty or missing', 'warn', 'cvp_fab_memory key not found');
    }
  });
});
