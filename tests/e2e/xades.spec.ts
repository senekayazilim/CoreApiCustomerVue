import { test, expect } from '@playwright/test';
import {
  navigateToEImzaV2,
  uploadPdfFile,
  uploadFileForXades,
  selectSignatureType,
  selectSignatureLevel,
  selectSignatureMethod,
  selectXadesSignatureType,
  startSigningProcess,
  signWithCertificate,
  waitForUploadComplete,
  waitForXadesSignatureList,
  downloadAndSaveSignedFile,
  TEST_CERTIFICATES,
  TEST_FILES,
} from './test-utils';

/**
 * XAdES (XML Advanced Electronic Signatures) Test Suite
 * 
 * Prerequisites:
 * - Backend API running on https://localhost:7294
 * - e-İmza Aracı installed and running
 * - Smart card reader with test certificates
 * - Test files in public/docs/
 * 
 * XAdES Signature Levels:
 * - aslBES: Basic Electronic Signature
 * - aslBaselineT: Timestamped
 * - aslBaselineLT: X-L (with revocation values)
 * 
 * XAdES Signature Types:
 * - Enveloped: Signature inside XML document
 * - Enveloping: Document wrapped inside signature (for non-XML files like PDF)
 * 
 * Signature Methods:
 * - Seri (Serial): Signatures in chain (S0 -> S0:S0 -> S0:S0:S0)
 * - Paralel: Signatures side by side (S0, S1, S2)
 * 
 * Run tests:
 *   npm run test:e2e tests/e2e/xades.spec.ts
 *   npm run test:e2e:headed tests/e2e/xades.spec.ts
 */


test.describe('XAdES - e-İmza V2', () => {
  test.describe('Enveloped (XML)', () => {
    test.describe('Tek İmza', () => {
      // Enveloped: XML dosyası içine imza gömülür
      // Çalıştırmak için: npx playwright test --grep "X5.1|X5.2|X5.3" --headed
      test('X5.1 - aslBES ile XML imzalama (Enveloped) → sample-xades-BES-enveloped.xsig', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.SAMPLE_XML, 'sample.xml');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped.xsig', 'X5.1', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X5.1-sample-xades-BES-enveloped.xsig');
      });

      test('X5.2 - aslBaselineT ile XML imzalama (Enveloped) → sample-xades-T-enveloped.xsig', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.SAMPLE_XML, 'sample.xml');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped.xsig', 'X5.2', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X5.2-sample-xades-T-enveloped.xsig');
      });

      test('X5.3 - aslBaselineLT ile XML imzalama (Enveloped) → sample-xades-XL-enveloped.xsig', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.SAMPLE_XML, 'sample.xml');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped.xsig', 'X5.3', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X5.3-sample-xades-XL-enveloped.xsig');
      });
    });

    test.describe('Paralel İmza', () => {
      // Paralel imza: Aynı seviyede yan yana imzalar (S0, S1, S2...)
      // Önce X5.1-X5.3 testleri çalışmalı (BES, T, XL dosyaları oluşturulmalı)
      test('X6.1 - BES dosyasına Paralel BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES, 'sample-xades-BES-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped-P-BES.xsig', 'X6.1', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.1-sample-xades-BES-enveloped-P-BES.xsig');
      });

      test('X6.2 - BES dosyasına Paralel BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES, 'sample-xades-BES-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped-P-T.xsig', 'X6.2', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.2-sample-xades-BES-enveloped-P-T.xsig');
      });

      test('X6.3 - BES dosyasına Paralel BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES, 'sample-xades-BES-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped-P-XL.xsig', 'X6.3', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.3-sample-xades-BES-enveloped-P-XL.xsig');
      });

      test('X6.4 - T dosyasına Paralel BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T, 'sample-xades-T-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped-P-BES.xsig', 'X6.4', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.4-sample-xades-T-enveloped-P-BES.xsig');
      });

      test('X6.5 - T dosyasına Paralel BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T, 'sample-xades-T-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped-P-T.xsig', 'X6.5', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.5-sample-xades-T-enveloped-P-T.xsig');
      });

      test('X6.6 - T dosyasına Paralel BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T, 'sample-xades-T-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped-P-XL.xsig', 'X6.6', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.6-sample-xades-T-enveloped-P-XL.xsig');
      });

      test('X6.7 - XL dosyasına Paralel BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL, 'sample-xades-XL-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped-P-BES.xsig', 'X6.7', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.7-sample-xades-XL-enveloped-P-BES.xsig');
      });

      test('X6.8 - XL dosyasına Paralel BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL, 'sample-xades-XL-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped-P-T.xsig', 'X6.8', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.8-sample-xades-XL-enveloped-P-T.xsig');
      });

      test('X6.9 - XL dosyasına Paralel BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL, 'sample-xades-XL-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped-P-XL.xsig', 'X6.9', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.9-sample-xades-XL-enveloped-P-XL.xsig');
      });
    });

    test.describe('Seri İmza', () => {
      // Seri imza: Zincir halinde imzalar (S0 -> S0:S0 -> S0:S0:S0...)
      // Önce X5.1-X5.3 testleri çalışmalı (BES, T, XL dosyaları oluşturulmalı)
      test('X7.1 - BES dosyasına Seri BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES, 'sample-xades-BES-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped-S-BES.xsig', 'X7.1', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.1-sample-xades-BES-enveloped-S-BES.xsig');
      });

      test('X7.2 - BES dosyasına Seri BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES, 'sample-xades-BES-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped-S-T.xsig', 'X7.2', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.2-sample-xades-BES-enveloped-S-T.xsig');
      });

      test('X7.3 - BES dosyasına Seri BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES, 'sample-xades-BES-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloped-S-XL.xsig', 'X7.3', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.3-sample-xades-BES-enveloped-S-XL.xsig');
      });

      test('X7.4 - T dosyasına Seri BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T, 'sample-xades-T-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped-S-BES.xsig', 'X7.4', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.4-sample-xades-T-enveloped-S-BES.xsig');
      });

      test('X7.5 - T dosyasına Seri BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T, 'sample-xades-T-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped-S-T.xsig', 'X7.5', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.5-sample-xades-T-enveloped-S-T.xsig');
      });

      test('X7.6 - T dosyasına Seri BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T, 'sample-xades-T-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloped-S-XL.xsig', 'X7.6', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.6-sample-xades-T-enveloped-S-XL.xsig');
      });

      test('X7.7 - XL dosyasına Seri BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL, 'sample-xades-XL-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped-S-BES.xsig', 'X7.7', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.7-sample-xades-XL-enveloped-S-BES.xsig');
      });

      test('X7.8 - XL dosyasına Seri BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL, 'sample-xades-XL-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped-S-T.xsig', 'X7.8', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.8-sample-xades-XL-enveloped-S-T.xsig');
      });

      test('X7.9 - XL dosyasına Seri BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL, 'sample-xades-XL-enveloped.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloped');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloped-S-XL.xsig', 'X7.9', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.9-sample-xades-XL-enveloped-S-XL.xsig');
      });
    });
  });

  test.describe('Enveloping (PDF)', () => {
    test.describe('Tek İmza', () => {
      // Enveloping: PDF dosyası base64 olarak XML içine sarılır
      // Çalıştırmak için: npx playwright test --grep "X5.4|X5.5|X5.6" --headed
      test('X5.4 - aslBES ile PDF imzalama (Enveloping) → sample-xades-BES-enveloping.xsig', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloping.xsig', 'X5.4', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X5.4-sample-xades-BES-enveloping.xsig');
      });

      test('X5.5 - aslBaselineT ile PDF imzalama (Enveloping) → sample-xades-T-enveloping.xsig', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloping.xsig', 'X5.5', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X5.5-sample-xades-T-enveloping.xsig');
      });

      test('X5.6 - aslBaselineLT ile PDF imzalama (Enveloping) → sample-xades-XL-enveloping.xsig', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloping.xsig', 'X5.6', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X5.6-sample-xades-XL-enveloping.xsig');
      });
    });

    test.describe('Paralel İmza', () => {
      // Enveloping modunda paralel imza testleri
      // Önce X5.4-X5.6 testleri çalışmalı
      test('X6.10 - BES Enveloping dosyasına Paralel BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES_ENVELOPING, 'sample-xades-BES-enveloping.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloping-P-BES.xsig', 'X6.10', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.10-sample-xades-BES-enveloping-P-BES.xsig');
      });

      test('X6.11 - T Enveloping dosyasına Paralel BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T_ENVELOPING, 'sample-xades-T-enveloping.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloping-P-T.xsig', 'X6.11', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.11-sample-xades-T-enveloping-P-T.xsig');
      });

      test('X6.12 - XL Enveloping dosyasına Paralel BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL_ENVELOPING, 'sample-xades-XL-enveloping.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await selectSignatureMethod(page, 'Paralel');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloping-P-XL.xsig', 'X6.12', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X6.12-sample-xades-XL-enveloping-P-XL.xsig');
      });
    });

    test.describe('Seri İmza', () => {
      // Enveloping modunda seri imza testleri
      // Önce X5.4-X5.6 testleri çalışmalı
      test('X7.10 - BES Enveloping dosyasına Seri BES imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_BES_ENVELOPING, 'sample-xades-BES-enveloping.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBES', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-BES-enveloping-S-BES.xsig', 'X7.10', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.10-sample-xades-BES-enveloping-S-BES.xsig');
      });

      test('X7.11 - T Enveloping dosyasına Seri BaselineT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_T_ENVELOPING, 'sample-xades-T-enveloping.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-T-enveloping-S-T.xsig', 'X7.11', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.11-sample-xades-T-enveloping-S-T.xsig');
      });

      test('X7.12 - XL Enveloping dosyasına Seri BaselineLT imza ekleme', async ({ page }) => {
        await page.goto('/');
        await navigateToEImzaV2(page);
        await selectSignatureType(page, 'Xades');
        
        await uploadFileForXades(page, TEST_FILES.XADES_XL_ENVELOPING, 'sample-xades-XL-enveloping.xsig');
        await waitForUploadComplete(page);
        
        await selectSignatureLevel(page, 'aslBaselineLT', 'Xades');
        await selectXadesSignatureType(page, 'Enveloping');
        await selectSignatureMethod(page, 'Seri');
        await startSigningProcess(page);
        
        await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
        
        await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
        const savedPath = await downloadAndSaveSignedFile(page, 'sample-xades-XL-enveloping-S-XL.xsig', 'X7.12', 'xades');
        expect(savedPath).toContain('public/docs/test-results/xades/');
        expect(savedPath).toContain('X7.12-sample-xades-XL-enveloping-S-XL.xsig');
      });
    });
  });
});
