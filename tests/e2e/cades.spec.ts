import { test, expect } from '@playwright/test';
import {
  navigateToEImzaV2,
  uploadPdfFile,
  uploadFileForCades,
  selectSignatureType,
  selectSignatureLevel,
  selectSignatureMethod,
  startSigningProcess,
  signWithCertificate,
  waitForUploadComplete,
  waitForCadesSignatureList,
  downloadCadesFile,
  downloadAndSaveSignedFile,
  TEST_CERTIFICATES,
  TEST_FILES,
} from './test-utils';

/**
 * CAdES (CMS Advanced Electronic Signatures) Test Suite
 * 
 * Prerequisites:
 * - Backend API running on https://localhost:7294
 * - e-İmza Aracı installed and running
 * - Smart card reader with test certificates
 * - Test files in public/docs/
 * 
 * CAdES Signature Levels:
 * - aslBES: Basic Electronic Signature
 * - aslT: Timestamped
 * - aslXLType2: X-L Type 2 (with revocation values)
 * 
 * Signature Methods:
 * - Seri (Serial): Signatures in chain (S0 -> S0:S0 -> S0:S0:S0)
 * - Paralel: Signatures side by side (S0, S1, S2)
 * 
 * Run tests:
 *   npm run test:e2e tests/e2e/cades.spec.ts
 *   npm run test:e2e:headed tests/e2e/cades.spec.ts
 */


test.describe('CAdES - e-İmza V2', () => {
  
  test.describe('UI ve Başlangıç Durumu', () => {
    
    test('C1.1 - Cades seçildiğinde Cades İmza Seviyesi dropdown görünmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await expect(page.getByText('Cades İmza Seviyesi')).toBeVisible();
    });

    test('C1.2 - Cades seçildiğinde İmza Metodu dropdown görünmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await expect(page.getByText('İmza Metodu')).toBeVisible();
    });

    test('C1.3 - Varsayılan Cades imza seviyesi aslBES olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await expect(page.getByRole('button', { name: /aslBES/ })).toBeVisible();
    });

    test('C1.4 - Varsayılan İmza Metodu Seri olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await expect(page.getByRole('button', { name: /Seri/ })).toBeVisible();
    });
  });

  test.describe('Dropdown Testleri', () => {
    
    test('C2.1 - Cades İmza Seviyesi dropdown açılıp kapanmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      const dropdown = page.getByRole('button', { name: /Cades İmza Seviyesi/ });
      
      // Open dropdown
      await dropdown.click();
      await expect(page.getByRole('listbox')).toBeVisible();
      
      // Close by clicking outside (Headless UI behavior)
      await page.getByRole('heading', { name: 'e-İmza V2' }).click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('listbox')).not.toBeVisible();
    });

    test('C2.2 - Tüm Cades imza seviyeleri mevcut olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await page.getByRole('button', { name: /Cades İmza Seviyesi/ }).click();
      
      await expect(page.getByRole('option', { name: 'aslBES' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'aslT' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'aslXLType2' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'aslA' })).toBeVisible();
    });

    test('C2.3 - İmza Metodu dropdown Seri ve Paralel seçenekleri olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await page.getByRole('button', { name: /İmza Metodu/ }).click();
      
      await expect(page.getByRole('option', { name: 'Seri' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Paralel' })).toBeVisible();
    });

    test('C2.4 - İmza seviyesi aslT olarak değiştirilebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      
      await expect(page.getByRole('button', { name: /aslT/ })).toBeVisible();
    });

    test('C2.5 - İmza seviyesi aslXLType2 olarak değiştirilebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      
      await expect(page.getByRole('button', { name: /aslXLType2/ })).toBeVisible();
    });

    test('C2.6 - İmza Metodu Paralel olarak değiştirilebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await selectSignatureMethod(page, 'Paralel');
      
      await expect(page.getByRole('button', { name: /Paralel/ })).toBeVisible();
    });
  });

  test.describe('Dosya Yükleme Testleri', () => {
    
    test('C3.1 - PDF dosyası Cades için yüklenebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      
      // Verify file name is displayed
      await expect(page.getByText('sample.pdf').first()).toBeVisible();
      await waitForUploadComplete(page);
    });

    test('C3.2 - İmzasız PDF için Cades imza listesi kontrol edilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      // Wait for signature list check
      await page.waitForTimeout(3000);
      
      // Should show "no CAdES signatures" message
      await expect(page.getByText('Belgede Cades türünde imza bulunmuyor')).toBeVisible();
    });

    test('C3.3 - BES imzalı P7M dosyası yüklendiğinde önceki imza görüntülenmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      // Wait for signature list
      await page.waitForTimeout(3000);
      
      // Should show previous signature info - use exact match to avoid matching "Üstüne İmza Atılacak İmza Adı"
      await expect(page.getByText('İmza Adı', { exact: true }).first()).toBeVisible();
    });

    test('C3.4 - T imzalı P7M dosyası yüklenebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      // Wait for signature list
      await page.waitForTimeout(3000);
      
      // Should show previous signature info
      await expect(page.getByText('İmza Adı', { exact: true }).first()).toBeVisible();
    });

    test('C3.5 - XL imzalı P7M dosyası yüklenebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      // Wait for signature list
      await page.waitForTimeout(3000);
      
      // Should show previous signature info
      await expect(page.getByText('İmza Adı', { exact: true }).first()).toBeVisible();
    });

  });

  test.describe('e-İmza Aracı Bağlantı Testleri', () => {
    
    test('C4.1 - Başla butonu Cades için e-İmza aracına bağlanmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await startSigningProcess(page);
      
      // Should show certificate list
      await expect(page.getByRole('heading', { name: 'e-İmzalar' })).toBeVisible();
    });

    test('C4.2 - Sertifika listesi Cades için görüntülenmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await startSigningProcess(page);
      
      // Should show certificate details
      await expect(page.locator('dt').filter({ hasText: 'Ad Soyad' }).first()).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'PIN' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'İmzala' }).first()).toBeVisible();
    });
  });

  test.describe('Tek İmza Testleri (Requires Smart Card)', () => {
    // Bu testler akıllı kart ve e-İmza aracı gerektiriyor
    // Çalıştırmak için: npx playwright test --grep "C5" --headed
    
    test('C5.1 - aslBES ile PDF imzalama → sample-cades-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES.p7m', 'C5.1');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C5.1-sample-cades-BES.p7m');
    });

    test('C5.2 - aslT ile PDF imzalama → sample-cades-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T.p7m', 'C5.2');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C5.2-sample-cades-T.p7m');
    });

    test('C5.3 - aslXLType2 ile PDF imzalama → sample-cades-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL.p7m', 'C5.3');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C5.3-sample-cades-XL.p7m');
    });

  });

  test.describe('Paralel İmza Testleri (Requires Smart Card)', () => {
    // Paralel imza: Aynı seviyede yan yana imzalar (S0, S1, S2...)
    
    test('C6.1 - BES dosyasına Paralel BES imza ekleme', async ({ page }) => {
      // BES -> BES (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-P-BES.p7m', 'C6.1');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.1-sample-cades-BES-P-BES.p7m');
    });

    test('C6.2 - BES dosyasına Paralel T imza ekleme', async ({ page }) => {
      // BES -> T (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-P-T.p7m', 'C6.2');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.2-sample-cades-BES-P-T.p7m');
    });

    test('C6.3 - T dosyasına Paralel XL imza ekleme', async ({ page }) => {
      // T -> XL (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-P-XL.p7m', 'C6.3');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.3-sample-cades-T-P-XL.p7m');
    });

    test('C6.4 - BES dosyasına Paralel XL imza ekleme', async ({ page }) => {
      // BES -> XL (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-P-XL.p7m', 'C6.4');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.4-sample-cades-BES-P-XL.p7m');
    });

    test('C6.5 - T dosyasına Paralel BES imza ekleme', async ({ page }) => {
      // T -> BES (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-P-BES.p7m', 'C6.6');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.6-sample-cades-T-P-BES.p7m');
    });

    test('C6.7 - T dosyasına Paralel T imza ekleme', async ({ page }) => {
      // T -> T (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-P-T.p7m', 'C6.7');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.7-sample-cades-T-P-T.p7m');
    });

    test('C6.8 - XL dosyasına Paralel BES imza ekleme', async ({ page }) => {
      // XL -> BES (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-P-BES.p7m', 'C6.9');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.9-sample-cades-XL-P-BES.p7m');
    });

    test('C6.10 - XL dosyasına Paralel T imza ekleme', async ({ page }) => {
      // XL -> T (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-P-T.p7m', 'C6.10');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.10-sample-cades-XL-P-T.p7m');
    });

    test('C6.11 - XL dosyasına Paralel XL imza ekleme', async ({ page }) => {
      // XL -> XL (Paralel) = S0, S1
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-P-XL.p7m', 'C6.11');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C6.11-sample-cades-XL-P-XL.p7m');
    });

  });

  test.describe('Seri İmza Testleri (Requires Smart Card)', () => {
    // Seri imza: Zincir halinde imzalar (S0 -> S0:S0 -> S0:S0:S0...)
    
    test('C7.1 - BES dosyasına Seri BES imza ekleme', async ({ page }) => {
      // BES -> BES (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-S-BES.p7m', 'C7.1');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.1-sample-cades-BES-S-BES.p7m');
    });

    test('C7.2 - BES dosyasına Seri T imza ekleme', async ({ page }) => {
      // BES -> T (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-S-T.p7m', 'C7.2');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.2-sample-cades-BES-S-T.p7m');
    });

    test('C7.3 - T dosyasına Seri XL imza ekleme', async ({ page }) => {
      // T -> XL (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-S-XL.p7m', 'C7.3');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.3-sample-cades-T-S-XL.p7m');
    });

    test('C7.4 - XL dosyasına Seri BES imza ekleme', async ({ page }) => {
      // XL -> BES (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-S-BES.p7m', 'C7.4');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.4-sample-cades-XL-S-BES.p7m');
    });

    test('C7.5 - BES dosyasına Seri XL imza ekleme', async ({ page }) => {
      // BES -> XL (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-S-XL.p7m', 'C7.5');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.5-sample-cades-BES-S-XL.p7m');
    });

    test('C7.6 - T dosyasına Seri BES imza ekleme', async ({ page }) => {
      // T -> BES (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-S-BES.p7m', 'C7.7');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.7-sample-cades-T-S-BES.p7m');
    });

    test('C7.8 - T dosyasına Seri T imza ekleme', async ({ page }) => {
      // T -> T (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-S-T.p7m', 'C7.8');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.8-sample-cades-T-S-T.p7m');
    });

    test('C7.9 - XL dosyasına Seri T imza ekleme', async ({ page }) => {
      // XL -> T (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-S-T.p7m', 'C7.10');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.10-sample-cades-XL-S-T.p7m');
    });

    test('C7.11 - XL dosyasına Seri XL imza ekleme', async ({ page }) => {
      // XL -> XL (Seri) = S0:S0
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-S-XL.p7m', 'C7.11');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C7.11-sample-cades-XL-S-XL.p7m');
    });

  });

  test.describe('İmza Türü Geçişleri', () => {
    
    test('C8.1 - Cades\'ten Pades\'e geçişte UI değişmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      // Start with Cades
      await selectSignatureType(page, 'Cades');
      await expect(page.getByText('İmza Metodu')).toBeVisible();
      
      // Switch to Pades
      await selectSignatureType(page, 'Pades');
      await expect(page.getByText('İmza Metodu')).not.toBeVisible();
      await expect(page.getByText('Pades İmza Seviyesi')).toBeVisible();
    });

    test('C8.2 - Cades\'ten Xades\'e geçişte UI değişmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      // Start with Cades
      await selectSignatureType(page, 'Cades');
      await expect(page.getByText('Cades İmza Seviyesi')).toBeVisible();
      
      // Switch to Xades
      await selectSignatureType(page, 'Xades');
      await expect(page.getByText('Xades İmza Seviyesi')).toBeVisible();
      await expect(page.getByText('Xades İmza Türü')).toBeVisible();
    });

    test('C8.3 - Cades geri seçildiğinde UI normale dönmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      // Go to Pades then back to Cades
      await selectSignatureType(page, 'Cades');
      await selectSignatureType(page, 'Pades');
      await selectSignatureType(page, 'Cades');
      
      await expect(page.getByText('Cades İmza Seviyesi')).toBeVisible();
      await expect(page.getByText('İmza Metodu')).toBeVisible();
    });
  });

  test.describe('Dosya Boyutu Doğrulama', () => {
    
    test('C9.1 - BES dosyası minimum boyut kontrolü', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      const result = await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      
      // BES should be around 958KB
      expect(result.size).toBeGreaterThan(900000);
    });

    test('C9.2 - T dosyası BES\'ten büyük olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      const besResult = await page.evaluate(async (filePath) => {
        const response = await fetch(filePath);
        const blob = await response.blob();
        return blob.size;
      }, TEST_FILES.CADES_BES);
      
      const tResult = await page.evaluate(async (filePath) => {
        const response = await fetch(filePath);
        const blob = await response.blob();
        return blob.size;
      }, TEST_FILES.CADES_T);
      
      // T should be larger than BES (timestamp added)
      expect(tResult).toBeGreaterThan(besResult);
    });

    test('C9.3 - XL dosyası T\'den büyük olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      const tResult = await page.evaluate(async (filePath) => {
        const response = await fetch(filePath);
        const blob = await response.blob();
        return blob.size;
      }, TEST_FILES.CADES_T);
      
      const xlResult = await page.evaluate(async (filePath) => {
        const response = await fetch(filePath);
        const blob = await response.blob();
        return blob.size;
      }, TEST_FILES.CADES_XL);
      
      // XL should be larger than T (revocation data added)
      expect(xlResult).toBeGreaterThan(tResult);
    });
  });

  test.describe('Dosya Oluşturma Testleri (Saves to public/docs/test-results/cades)', () => {
    // Bu testler imzalı dosyaları public/docs/test-results/cades klasörüne kaydeder
    // Çalıştırmak için: npx playwright test --grep "C10" --headed
    
    test('C10.1 - BES dosyasına Paralel BES imza → sample-cades-BES-P-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      // Download and save to public/docs/test-results/cades
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-P-BES.p7m', 'C10.1');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.1-sample-cades-BES-P-BES.p7m');
    });

    test('C10.2 - BES dosyasına Seri T imza → sample-cades-BES-S-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      // Download and save to public/docs/test-results/cades
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-S-T.p7m', 'C10.2');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.2-sample-cades-BES-S-T.p7m');
    });

    test('C10.3 - T dosyasına Paralel XL imza → sample-cades-T-P-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      // Download and save to public/docs/test-results/cades
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-P-XL.p7m', 'C10.3');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.3-sample-cades-T-P-XL.p7m');
    });

    test('C10.4 - BES dosyasına Paralel T imza → sample-cades-BES-P-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-P-T.p7m', 'C10.4');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.4-sample-cades-BES-P-T.p7m');
    });

    test('C10.5 - BES dosyasına Paralel XL imza → sample-cades-BES-P-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-P-XL.p7m', 'C10.5');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.5-sample-cades-BES-P-XL.p7m');
    });

    test('C10.6 - BES dosyasına Seri BES imza → sample-cades-BES-S-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-S-BES.p7m', 'C10.7');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.7-sample-cades-BES-S-BES.p7m');
    });

    test('C10.8 - BES dosyasına Seri XL imza → sample-cades-BES-S-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_BES, 'sample-cades-BES.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-BES-S-XL.p7m', 'C10.8');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.8-sample-cades-BES-S-XL.p7m');
    });

    test('C10.9 - T dosyasına Paralel BES imza → sample-cades-T-P-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-P-BES.p7m', 'C10.10');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.10-sample-cades-T-P-BES.p7m');
    });

    test('C10.11 - T dosyasına Paralel T imza → sample-cades-T-P-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-P-T.p7m', 'C10.11');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.11-sample-cades-T-P-T.p7m');
    });

    test('C10.12 - T dosyasına Seri BES imza → sample-cades-T-S-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-S-BES.p7m', 'C10.13');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.13-sample-cades-T-S-BES.p7m');
    });

    test('C10.14 - T dosyasına Seri T imza → sample-cades-T-S-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-S-T.p7m', 'C10.14');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.14-sample-cades-T-S-T.p7m');
    });

    test('C10.15 - T dosyasına Seri XL imza → sample-cades-T-S-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_T, 'sample-cades-T.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-T-S-XL.p7m', 'C10.15');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.15-sample-cades-T-S-XL.p7m');
    });

    test('C10.16 - XL dosyasına Paralel BES imza → sample-cades-XL-P-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-P-BES.p7m', 'C10.17');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.17-sample-cades-XL-P-BES.p7m');
    });

    test('C10.18 - XL dosyasına Paralel T imza → sample-cades-XL-P-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-P-T.p7m', 'C10.18');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.18-sample-cades-XL-P-T.p7m');
    });

    test('C10.19 - XL dosyasına Paralel XL imza → sample-cades-XL-P-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Paralel');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-P-XL.p7m', 'C10.19');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.19-sample-cades-XL-P-XL.p7m');
    });

    test('C10.20 - XL dosyasına Seri BES imza → sample-cades-XL-S-BES.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslBES', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-S-BES.p7m', 'C10.21');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.21-sample-cades-XL-S-BES.p7m');
    });

    test('C10.22 - XL dosyasına Seri T imza → sample-cades-XL-S-T.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslT', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-S-T.p7m', 'C10.22');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.22-sample-cades-XL-S-T.p7m');
    });

    test('C10.23 - XL dosyasına Seri XL imza → sample-cades-XL-S-XL.p7m', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      await selectSignatureType(page, 'Cades');
      
      await uploadFileForCades(page, TEST_FILES.CADES_XL, 'sample-cades-XL.p7m');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'aslXLType2', 'Cades');
      await selectSignatureMethod(page, 'Seri');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      const savedPath = await downloadAndSaveSignedFile(page, 'sample-cades-XL-S-XL.p7m', 'C10.23');
      expect(savedPath).toContain('public/docs/test-results/cades/');
      expect(savedPath).toContain('C10.23-sample-cades-XL-S-XL.p7m');
    });

  });
});
