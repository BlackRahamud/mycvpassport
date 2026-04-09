/**
 * CVPassport FAB Auditor — Edge Cases & Stress Tests
 * Tests: nonsense classifier, rapid tapping, localStorage corruption, empty inputs
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import {
  openFAB,
  assertFABVisible,
  typeInFAB,
  checkFABMemory,
  captureConsoleErrors,
  logStep,
  login,
} from '../helpers/fab-helpers';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://mycvpassport.com';

const NONSENSE_INPUTS = [
  'asdfghjkl',
  '!@#$%^&*()',
  '   ',
  'a',
  '1234567890',
  'هذا نص عشوائي',    // Arabic random text
  'यह बेकार है',       // Hindi random text
  '<script>alert(1)</script>', // XSS attempt
  'x'.repeat(500),     // Very long string
];

test.describe('🔥 FAB Edge Cases & Stress Tests', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
  });

  test.afterEach(async ({}, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log('\n  🔴 Console errors:');
      consoleErrors.forEach(e => console.log('    ', e));
      testInfo.annotations.push({ type: 'Console Errors', description: consoleErrors.join('\n') });
    }
  });

  // ── Nonsense classifier test ─────────────────────────────────────────────────
  test('Nonsense inputs are handled gracefully', async ({ page }) => {
    console.log('\n📋 NONSENSE CLASSIFIER TEST');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openFAB(page);

    let crashCount = 0;
    let handledCount = 0;

    for (const nonsense of NONSENSE_INPUTS) {
      const label = nonsense.length > 20 ? nonsense.substring(0, 20) + '...' : nonsense;
      console.log(`\n  🧪 Testing nonsense: "${label}"`);

      try {
        await typeInFAB(page, nonsense);
        await page.waitForTimeout(1500);

        // Check page didn't crash
        const bodyVisible = await page.locator('body').isVisible();
        if (!bodyVisible) {
          crashCount++;
          logStep(`Nonsense "${label}" crashed the page`, 'fail');
        } else {
          // Check for error message or graceful handling
          const errorMsg = page.locator('text=/error|invalid|try again|unclear/i').first();
          const hasError = await errorMsg.isVisible().catch(() => false);

          if (hasError) {
            logStep(`Nonsense "${label}" — graceful error shown`, 'pass');
          } else {
            logStep(`Nonsense "${label}" — handled (no crash)`, 'pass');
          }
          handledCount++;
        }

        await page.screenshot({ path: `test-results/edge-nonsense-${handledCount}.png` });
      } catch (e) {
        crashCount++;
        logStep(`Nonsense "${label}" caused exception`, 'fail');
      }
    }

    console.log(`\n  📊 Handled: ${handledCount}/${NONSENSE_INPUTS.length} — Crashes: ${crashCount}`);
    expect(crashCount).toBe(0);
  });

  // ── Rapid FAB tapping ────────────────────────────────────────────────────────
  test('Rapid FAB open/close does not break state', async ({ page }) => {
    console.log('\n📋 RAPID TAP TEST');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await assertFABVisible(page);

    // Tap FAB rapidly 5 times
    for (let i = 0; i < 5; i++) {
      const fab = page.locator('[class*="fab"], button[aria-label*="assistant"]').first();
      if (await fab.isVisible().catch(() => false)) {
        await fab.tap();
        await page.waitForTimeout(200);
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/edge-rapid-tap.png' });

    // Page should still be functional
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
    logStep('Rapid tapping — page still functional', 'pass');
  });

  // ── LocalStorage corruption test ────────────────────────────────────────────
  test('Corrupted FAB localStorage does not crash app', async ({ page }) => {
    console.log('\n📋 LOCALSTORAGE CORRUPTION TEST');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Corrupt the FAB memory
    await page.evaluate(() => {
      localStorage.setItem('cvp_fab_memory', 'THIS IS NOT JSON {{{{broken');
      localStorage.setItem('cvp_anon_downloads', 'not-a-number');
    });

    // Reload and check app still works
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/edge-corrupted-storage.png' });

    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
    logStep('Corrupted localStorage — app still loads', 'pass');

    // Check if FAB still works after corruption
    await assertFABVisible(page);
    logStep('FAB still visible after localStorage corruption', 'pass');
  });

  // ── Anonymous download limit test ───────────────────────────────────────────
  test('Anonymous download limit (3) is enforced', async ({ page }) => {
    console.log('\n📋 ANONYMOUS DOWNLOAD LIMIT TEST');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Set anon downloads to 3 (the limit)
    await page.evaluate(() => {
      localStorage.setItem('cvp_anon_downloads', '3');
    });

    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to download
    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("PDF")').first();
    if (await downloadBtn.isVisible().catch(() => false)) {
      await downloadBtn.tap();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/edge-download-limit.png' });

      // Should show a gatekeeper/paywall message
      const gatekeeperMsg = page.locator('text=/limit|sign|upgrade|free/i').first();
      if (await gatekeeperMsg.isVisible().catch(() => false)) {
        logStep('Download gatekeeper shown at limit', 'pass', await gatekeeperMsg.textContent() || '');
      } else {
        logStep('Download gatekeeper not visible at limit', 'warn', 'Check FAB gatekeeper logic');
      }
    } else {
      logStep('Download button not found in builder', 'warn');
    }
  });

  // ── Progress coach color test ────────────────────────────────────────────────
  test('Progress coach ring has color (not white)', async ({ page }) => {
    console.log('\n📋 PROGRESS COACH COLOR TEST');
    await login(page);
    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await openFAB(page);
    await page.waitForTimeout(800);

    // Find SVG circle (progress ring)
    const ringColor = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle[stroke]');
      if (circles.length === 0) return null;
      // Get the progress circle (not background)
      for (const circle of circles) {
        const stroke = (circle as SVGCircleElement).getAttribute('stroke');
        if (stroke && stroke !== 'none' && stroke !== 'transparent' && !stroke.includes('white') && stroke !== '#ffffff' && stroke !== 'rgb(255, 255, 255)') {
          return stroke;
        }
      }
      return 'white or not found';
    });

    console.log(`  🎨 Progress ring stroke color: ${ringColor}`);
    await page.screenshot({ path: 'test-results/edge-progress-ring.png' });

    if (!ringColor) {
      logStep('Progress ring SVG circle not found', 'warn', 'May use different element');
    } else if (ringColor.includes('white') || ringColor === '#ffffff') {
      logStep('Progress ring is WHITE', 'fail', 'Bug confirmed — ring should be colored');
    } else {
      logStep('Progress ring has color', 'pass', ringColor);
    }
  });

  // ── Tab bar hidden when FAB open ────────────────────────────────────────────
  test('Tab bar hides when FAB sheet is open', async ({ page }) => {
    console.log('\n📋 TAB BAR HIDE TEST');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check tab bar before FAB open
    const tabBar = page.locator('[class*="tab-bar"], [class*="tabbar"], [class*="MobileTabBar"], nav').first();
    const tabBarVisibleBefore = await tabBar.isVisible().catch(() => false);
    console.log(`  Tab bar visible before FAB open: ${tabBarVisibleBefore}`);

    await openFAB(page);
    await page.waitForTimeout(600);

    const tabBarVisibleAfter = await tabBar.isVisible().catch(() => false);
    console.log(`  Tab bar visible after FAB open: ${tabBarVisibleAfter}`);

    await page.screenshot({ path: 'test-results/edge-tabbar-hidden.png' });

    if (tabBarVisibleBefore && !tabBarVisibleAfter) {
      logStep('Tab bar correctly hides when FAB opens', 'pass');
    } else if (!tabBarVisibleBefore) {
      logStep('Tab bar not detected before FAB open', 'warn');
    } else {
      logStep('Tab bar still visible when FAB open', 'warn', 'Should hide per spec');
    }
  });
});
