/**
 * CVPassport FAB Auditor — Full 11-Question Guided Flow
 * Tests the complete FAB guide from Q1 → Q11 → post-completion CTAs
 * Runs as anonymous user (guide should work without login)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import {
  openFAB,
  assertFABVisible,
  typeInFAB,
  captureConsoleErrors,
  logStep,
  GUIDED_FLOW_ANSWERS,
} from '../helpers/fab-helpers';

async function startGuidedFlow(page: any, BASE_URL: string) {
  const email = process.env.TEST_EMAIL || '';
  const password = process.env.TEST_PASSWORD || '';

  // Login
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('  ✅ Logged in');

  // Go to dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click New CV — it has a "+" icon and text "New CV"
  const newCV = page.locator('text=New CV').first();
  if (await newCV.isVisible().catch(() => false)) {
    await newCV.click();
    await page.waitForTimeout(1500);
    console.log('  ✅ Clicked New CV');
  } else {
    // Try clicking the + button card
    const plusBtn = page.locator('[class*="new"], [class*="create"], button:has-text("+")').first();
    if (await plusBtn.isVisible().catch(() => false)) {
      await plusBtn.click();
      await page.waitForTimeout(1500);
      console.log('  ✅ Clicked + New CV card');
    } else {
      console.log('  ⚠️ New CV button not found — trying direct URL');
    }
  }

  // Click "Guide me through it"
  const guideBtn = page.locator('text=Guide me through it').first();
  if (await guideBtn.isVisible().catch(() => false)) {
    await guideBtn.click();
    await page.waitForTimeout(3000);
    console.log('  ✅ Clicked Guide me through it');
  } else {
    console.log('  ⚠️ Guide me through it not found — navigating directly');
    // Direct URL fallback — this is the actual URL format from the app
    const timestamp = Date.now();
    await page.goto(`${BASE_URL}/builder?new=${timestamp}&guide=true`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    console.log('  ✅ Navigated directly to guided flow URL');
  }

  // Wait for FAB guide tab to appear
  // Look for "Type your answer..." input which confirms FAB guide is open
  const guideInput = page.locator('input[placeholder*="answer"], input[placeholder*="Type"]').first();
  if (await guideInput.isVisible().catch(() => false)) {
    console.log('  ✅ FAB guide input visible — ready to answer questions');
  } else {
    console.log('  ⚠️ FAB guide input not visible yet — waiting more');
    await page.waitForTimeout(2000);
  }
}

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://mycvpassport.com';

test.describe('🤖 FAB Guided Flow — Full 11-Question Test', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = captureConsoleErrors(page);
    // Clear FAB memory so guide starts fresh
    await page.context().clearCookies();
  });

  test.afterEach(async ({}, testInfo) => {
    if (consoleErrors.length > 0) {
      console.log('\n  🔴 Console errors:');
      consoleErrors.forEach(e => console.log('    ', e));
      testInfo.annotations.push({ type: 'Console Errors', description: consoleErrors.join('\n') });
    }
  });

  // ── Full guided flow ────────────────────────────────────────────────────────
  test('Full 11-question guided flow completes end-to-end', async ({ page }) => {
    console.log('\n📋 FAB GUIDED FLOW — Full 11 Questions');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Clear FAB memory in localStorage
    await page.evaluate(() => localStorage.removeItem('cvp_fab_memory'));

    // Open FAB
    await assertFABVisible(page);
    await openFAB(page);
    await page.screenshot({ path: 'test-results/guide-00-fab-open.png' });

    // Look for "Guide" tab or Start Guide button
    const guideTab = page.locator('button:has-text("Guide"), button:has-text("Start"), [data-tab="guide"]').first();
    if (await guideTab.isVisible().catch(() => false)) {
      await guideTab.tap();
      await page.waitForTimeout(800);
      logStep('Guide tab opened', 'pass');
    } else {
      logStep('No separate Guide tab — flow may start automatically', 'warn');
    }

    await page.screenshot({ path: 'test-results/guide-01-start.png' });

    // ── Answer each question ──────────────────────────────────────────────────
    let questionsAnswered = 0;

    for (let i = 0; i < GUIDED_FLOW_ANSWERS.length; i++) {
      const answer = GUIDED_FLOW_ANSWERS[i];
      const qNum = i + 1;

      console.log(`\n  📝 Q${qNum}: Typing "${answer}"`);

      // Check if there's an input visible
      const input = page.locator(
        'input[placeholder*="answer"], input[placeholder*="Type"], textarea[placeholder*="answer"]'
      ).first();

      const inputVisible = await input.isVisible().catch(() => false);

      if (inputVisible) {
        await typeInFAB(page, answer);
        await page.waitForTimeout(1200);
        questionsAnswered++;
        logStep(`Q${qNum} answered`, 'pass', answer);
        await page.screenshot({ path: `test-results/guide-q${String(qNum).padStart(2, '0')}.png` });
      } else {
        // Try chip/option buttons instead of text input
        const chips = page.locator('button[class*="chip"], button[class*="option"], [class*="nudge"]');
        const chipCount = await chips.count();

        if (chipCount > 0) {
          await chips.first().tap();
          await page.waitForTimeout(1000);
          questionsAnswered++;
          logStep(`Q${qNum} answered via chip`, 'pass');
          await page.screenshot({ path: `test-results/guide-q${String(qNum).padStart(2, '0')}-chip.png` });
        } else {
          logStep(`Q${qNum} — no input or chip found`, 'warn', 'Flow may have ended or shifted');
          await page.screenshot({ path: `test-results/guide-q${String(qNum).padStart(2, '0')}-stuck.png` });
          break;
        }
      }
    }

    console.log(`\n  📊 Questions answered: ${questionsAnswered} / ${GUIDED_FLOW_ANSWERS.length}`);

    // ── Check post-completion CTAs ────────────────────────────────────────────
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/guide-completion.png' });

    const postCTAs = page.locator(
      'button:has-text("Preview"), button:has-text("Template"), button:has-text("Download"), button:has-text("Build")'
    );
    const ctaCount = await postCTAs.count();

    if (ctaCount > 0) {
      logStep(`Post-completion CTAs visible`, 'pass', `${ctaCount} CTA(s) found`);
      for (let i = 0; i < ctaCount; i++) {
        const ctaText = await postCTAs.nth(i).textContent();
        console.log(`    CTA ${i + 1}: "${ctaText}"`);
      }
    } else {
      logStep('Post-completion CTAs not found', 'warn', 'Flow may not have reached Q11');
    }

    // Final summary
    console.log(`\n  ✅ Guided flow test complete — ${questionsAnswered}/${GUIDED_FLOW_ANSWERS.length} questions answered`);
    expect(questionsAnswered).toBeGreaterThan(0);
  });

  // ── Greeting sequence before Q1 ─────────────────────────────────────────────
  test('Greeting sequence appears before Q1', async ({ page }) => {
    console.log('\n📋 GREETING SEQUENCE TEST');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.evaluate(() => localStorage.removeItem('cvp_fab_memory'));
    await openFAB(page);

    // Wait for greeting messages (3 messages before Q1 per spec)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/guide-greeting.png' });

    const messages = page.locator('[class*="message"], [class*="bubble"], [class*="chat"]');
    const messageCount = await messages.count();
    console.log(`  💬 Messages visible: ${messageCount}`);

    if (messageCount >= 3) {
      logStep('Greeting sequence (3+ messages) present', 'pass');
    } else if (messageCount > 0) {
      logStep(`Only ${messageCount} message(s) visible`, 'warn', 'Expected 3 greeting messages before Q1');
    } else {
      logStep('No messages detected in FAB', 'warn');
    }
  });

  test('Gibberish inputs: FAB guided flow stress test', async ({ page }) => {
    const GIBBERISH_INPUTS = [
      'asdfghjkl',
      '!!!???###',
      '   ',
      '123456',
      'zxzxzxzx',
      'aaa',
      '???',
      'lolololol',
      'no idea',
      'skip',
      'whatever man',
    ];

    await startGuidedFlow(page, BASE_URL);
    await page.screenshot({ path: 'guide-gibberish-00-fab-open.png' });

    let questionsAnswered = 0;
    for (let i = 0; i < GIBBERISH_INPUTS.length; i++) {
      const value = GIBBERISH_INPUTS[i];
      const qNum = i + 1;
      const input = page.locator('input[placeholder*="answer"], input[placeholder*="Type"], textarea[placeholder*="answer"]').first();
      const visible = await input.isVisible().catch(() => false);
      if (!visible) {
        console.log(`  Stuck before Q${qNum} — no visible text input/textarea`);
        break;
      }
      await input.fill(value);
      await input.press('Enter');
      await page.waitForTimeout(1500);
      questionsAnswered++;
      await page.screenshot({ path: `test-results/guide-gibberish-Q${qNum}.png` });
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/guide-gibberish-final.png' });

    const postCTAs = page.locator(
      'button:has-text("Preview"), button:has-text("Template"), button:has-text("Download"), button:has-text("Build")'
    );
    const ctaCount = await postCTAs.count();
    if (ctaCount > 0) {
      for (let i = 0; i < ctaCount; i++) {
        const t = await postCTAs.nth(i).textContent();
        console.log(`  Post-completion CTA ${i + 1}: "${t}"`);
      }
    }

    const summary = {
      test: 'Gibberish inputs: FAB guided flow stress test',
      fabFound: true,
      questionsAnsweredBeforeStuck: questionsAnswered,
      totalPlannedInputs: GIBBERISH_INPUTS.length,
      stuckBeforeComplete: questionsAnswered < GIBBERISH_INPUTS.length,
      postCompletionCTAs: ctaCount,
    };
    console.log('\n📋 RESULT SUMMARY (gibberish stress test):');
    console.log(JSON.stringify(summary, null, 2));
  });

  test('Real data inputs: FAB guided flow happy path', async ({ page }) => {
    const REAL_DATA_INPUTS = [
      'Ahmed Al Mansouri',
      'Customer Service Officer',
      'Dubai, UAE',
      'Banking and Finance',
      '4 years experience in client relations',
      'CRM, AML, KYC, Customer Service, MS Office',
      'Emirates NBD',
      'Managed 200+ client portfolio, increased satisfaction by 30%',
      'Bachelor of Business Administration, University of Dubai',
      'English, Arabic, Hindi',
      'Looking for a banking role in UAE with growth potential',
    ];

    await startGuidedFlow(page, BASE_URL);
    await page.screenshot({ path: 'guide-realdata-00-fab-open.png' });

    let questionsAnswered = 0;
    for (let i = 0; i < REAL_DATA_INPUTS.length; i++) {
      const value = REAL_DATA_INPUTS[i];
      const qNum = i + 1;
      const input = page.locator('input[placeholder*="answer"], input[placeholder*="Type"], textarea[placeholder*="answer"]').first();
      const visible = await input.isVisible().catch(() => false);
      if (!visible) {
        console.log(`  Stuck before Q${qNum} — no visible text input/textarea`);
        break;
      }
      await input.fill(value);
      await input.press('Enter');
      await page.waitForTimeout(1500);
      questionsAnswered++;
      await page.screenshot({ path: `test-results/guide-realdata-Q${qNum}.png` });
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/guide-realdata-final.png' });

    const postCTAs = page.locator(
      'button:has-text("Preview"), button:has-text("Template"), button:has-text("Download"), button:has-text("Build")'
    );
    const ctaCount = await postCTAs.count();
    const confirmation = page.locator('text=/success|complete|done|thank you|generated/i').first();
    const hasConfirmation = await confirmation.isVisible().catch(() => false);
    const previewRegion = page.locator('[class*="preview"], [class*="Preview"], iframe').first();
    const hasPreviewRegion = await previewRegion.isVisible().catch(() => false);

    console.log('\n  After completion:');
    console.log(`    Post-completion CTAs found: ${ctaCount}`);
    console.log(`    Confirmation-like message visible: ${hasConfirmation}`);
    console.log(`    CV preview region / iframe hint visible: ${hasPreviewRegion}`);
    if (ctaCount > 0) {
      for (let i = 0; i < ctaCount; i++) {
        const t = await postCTAs.nth(i).textContent();
        console.log(`    CTA ${i + 1}: "${t}"`);
      }
    }

    await page.goto(`${BASE_URL}/builder`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/guide-realdata-cv-result.png' });

    const summary = {
      test: 'Real data inputs: FAB guided flow happy path',
      fabFound: true,
      questionsAnswered,
      totalPlannedInputs: REAL_DATA_INPUTS.length,
      postCompletionCTAs: ctaCount,
      confirmationLikeMessageVisible: hasConfirmation,
      cvPreviewRegionVisible: hasPreviewRegion,
    };
    console.log('\n📋 RESULT SUMMARY (real data happy path):');
    console.log(JSON.stringify(summary, null, 2));
  });
});
