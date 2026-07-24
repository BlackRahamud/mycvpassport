import {
  computeEntitlements,
  isWithinOfferWindow,
  freeDownloadLimit,
  FREE_IMPORT_LIMIT,
  ORIGINAL_FREE_DOWNLOAD_LIMIT,
  LAUNCH_OFFER,
  OFFER_END_ISO,
} from './launchOffer';

describe('launchOffer entitlement matrix', () => {
  test('free account, offer OFF → original plan (1 download, 3 imports, no all-templates)', () => {
    const e = computeEntitlements({ isPro: false, offerActive: false, isSignedIn: true });
    expect(e.downloadsLimit).toBe(ORIGINAL_FREE_DOWNLOAD_LIMIT); // 1
    expect(e.uploadsLimit).toBe(FREE_IMPORT_LIMIT);              // 3 (always)
    expect(e.allTemplates).toBe(false);
    expect(e.offerActive).toBe(false);
  });

  test('free account, offer ON → 3 downloads, 3 imports, all templates', () => {
    const e = computeEntitlements({ isPro: false, offerActive: true, isSignedIn: true });
    expect(e.downloadsLimit).toBe(LAUNCH_OFFER.maxDownloads); // 3
    expect(e.uploadsLimit).toBe(FREE_IMPORT_LIMIT);           // 3
    expect(e.allTemplates).toBe(true);
    expect(e.offerActive).toBe(true);
  });

  test('imports are a flat 3 whether the offer is on or off', () => {
    const off = computeEntitlements({ isPro: false, offerActive: false, isSignedIn: true });
    const on = computeEntitlements({ isPro: false, offerActive: true, isSignedIn: true });
    expect(off.uploadsLimit).toBe(on.uploadsLimit);
    expect(off.uploadsLimit).toBe(FREE_IMPORT_LIMIT);
  });

  test('Pro is unlimited and all-templates regardless of offer state', () => {
    for (const offerActive of [false, true]) {
      const e = computeEntitlements({ isPro: true, offerActive, isSignedIn: true });
      expect(e.downloadsLimit).toBe(Infinity);
      expect(e.uploadsLimit).toBe(Infinity);
      expect(e.canUpload).toBe(true);
      expect(e.canDownload).toBe(true);
      expect(e.allTemplates).toBe(true);
    }
  });

  test('counts decrement uploadsLeft / downloadsLeft and flip can* at the cap', () => {
    const at2 = computeEntitlements({ isPro: false, offerActive: true, isSignedIn: true, uploadCount: 2, downloadCount: 2 });
    expect(at2.uploadsLeft).toBe(1);
    expect(at2.downloadsLeft).toBe(1);
    expect(at2.canUpload).toBe(true);
    expect(at2.canDownload).toBe(true);

    const atCap = computeEntitlements({ isPro: false, offerActive: true, isSignedIn: true, uploadCount: 3, downloadCount: 3 });
    expect(atCap.uploadsLeft).toBe(0);
    expect(atCap.downloadsLeft).toBe(0);
    expect(atCap.canUpload).toBe(false);
    expect(atCap.canDownload).toBe(false);
  });

  test('signed-out free visitor must sign in before uploading (lead capture)', () => {
    const e = computeEntitlements({ isPro: false, offerActive: true, isSignedIn: false });
    expect(e.requiresSignIn).toBe(true);
    expect(e.canUpload).toBe(false);
  });

  test('freeDownloadLimit tracks the offer switch', () => {
    expect(freeDownloadLimit(false)).toBe(ORIGINAL_FREE_DOWNLOAD_LIMIT);
    expect(freeDownloadLimit(true)).toBe(LAUNCH_OFFER.maxDownloads);
  });

  test('window closes after the end date (auto-revert)', () => {
    const endMs = Date.parse(OFFER_END_ISO);
    expect(isWithinOfferWindow(endMs - 1000)).toBe(true);
    expect(isWithinOfferWindow(endMs + 1000)).toBe(false);
  });
});
