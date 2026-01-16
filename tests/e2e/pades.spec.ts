import { test, expect } from '@playwright/test';
import {
  navigateToEImzaV2,
  uploadPdfFile,
  selectSignatureType,
  selectSignatureLevel,
  startSigningProcess,
  signWithCertificate,
  waitForUploadComplete,
  TEST_CERTIFICATES,
  TEST_FILES,
} from './test-utils';

/**
 * PAdES (PDF Advanced Electronic Signatures) Test Suite
 * 
 * Prerequisites:
 * - Backend API running on https://localhost:7294
 * - e-İmza Aracı installed and running
 * - Smart card reader with test certificates
 * - Test PDF files in public/docs/
 * 
 * Run tests:
 *   npm run test:e2e
 *   npm run test:e2e:ui  (with UI)
 */

test.describe('PAdES - e-İmza V2', () => {
  
  test.describe('UI ve Başlangıç Durumu', () => {
    
    test('P1.1 - Varsayılan imza türü Pades olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      const padesRadio = page.getByRole('radio', { name: 'Pades' });
      await expect(padesRadio).toBeChecked();
    });

    test('P1.2 - Pades seçiliyken sadece 1 dropdown görünmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      // Pades should have only "Pades İmza Seviyesi" dropdown
      await expect(page.getByText('Pades İmza Seviyesi')).toBeVisible();
      
      // "İmza Metodu" should NOT be visible (only for Cades/Xades)
      await expect(page.getByText('İmza Metodu')).not.toBeVisible();
    });

    test('P1.3 - Varsayılan imza seviyesi paslBES olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await expect(page.getByRole('button', { name: /paslBES/ })).toBeVisible();
    });

    test('P1.4 - Dosya seçim alanı "Seçili dosya yok" göstermeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await expect(page.getByText('Seçili dosya yok')).toBeVisible();
    });

    test('P1.5 - Önceki imzalar "Belge yüklenmedi" göstermeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await expect(page.getByText('Belge yüklenmedi')).toBeVisible();
    });
  });

  test.describe('Dropdown Testleri', () => {
    
    test('P2.1 - Dropdown açılıp kapanmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      const dropdown = page.getByRole('button', { name: /Pades İmza Seviyesi/ });
      
      // Open dropdown
      await dropdown.click();
      await expect(page.getByRole('listbox')).toBeVisible();
      
      // Close by clicking outside (Headless UI behavior)
      await page.getByRole('heading', { name: 'e-İmza V2' }).click();
      await page.waitForTimeout(500); // Wait for animation
      await expect(page.getByRole('listbox')).not.toBeVisible();
    });

    test('P2.2 - paslBES ve paslLTV seçenekleri mevcut olmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await page.getByRole('button', { name: /Pades İmza Seviyesi/ }).click();
      
      await expect(page.getByRole('option', { name: 'paslBES' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'paslLTV' })).toBeVisible();
    });

    test('P2.3 - İmza seviyesi değiştirilebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      // Change to paslLTV
      await selectSignatureLevel(page, 'paslLTV', 'Pades');
      
      // Verify selection
      await expect(page.getByRole('button', { name: /paslLTV/ })).toBeVisible();
    });
  });

  test.describe('Dosya Yükleme Testleri', () => {
    
    test('P3.1 - PDF dosyası yüklenebilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      
      // Verify file name is displayed
      await expect(page.getByText('sample.pdf').first()).toBeVisible();
      
      // Wait for upload
      await waitForUploadComplete(page);
    });

    test('P3.2 - İmzasız PDF için imza listesi kontrol edilmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      // Wait for signature list check
      await page.waitForTimeout(3000);
      
      // After upload, "Belge yüklenmedi" should be replaced with actual status
      // Either shows "no signatures" message or signature list loaded message
      const statusArea = page.locator('[class*="Önceki İmzalar"]').or(page.getByText('Dosyadaki Önceki İmzalar').locator('..'));
      
      // Verify the status area no longer shows "Belge yüklenmedi"
      await expect(page.getByText('Belge yüklenmedi')).not.toBeVisible({ timeout: 5000 });
    });

    test.skip('P3.3 - BES imzalı PDF yüklendiğinde önceki imza görüntülenmeli', async ({ page }) => {
      // NOT: Bu test P5.1 çalıştıktan sonra sample-signed-BES.pdf oluşunca çalışır
      // Önce: npm run test:e2e:headed -- --grep "P5.1"
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SIGNED_BES, 'sample-signed-BES.pdf');
      await waitForUploadComplete(page);
      
      // Wait for signature list
      await page.waitForTimeout(3000);
      
      // Should show previous signature info
      await expect(page.getByText('İmza Adı')).toBeVisible();
      await expect(page.getByText('paslBaselineB')).toBeVisible();
    });
  });

  test.describe('e-İmza Aracı Bağlantı Testleri', () => {
    
    test('P4.1 - Başla butonu e-İmza aracına bağlanmalı', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await startSigningProcess(page);
      
      // Should show certificate list
      await expect(page.getByRole('heading', { name: 'e-İmzalar' })).toBeVisible();
    });

    test('P4.2 - Sertifika listesi görüntülenmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await startSigningProcess(page);
      
      // Should show certificate details (using term/definition list)
      await expect(page.locator('dt').filter({ hasText: 'Ad Soyad' }).first()).toBeVisible();
      await expect(page.locator('dt').filter({ hasText: 'TC Kimlik No' }).first()).toBeVisible();
      await expect(page.locator('dt').filter({ hasText: 'Geçerlilik' }).first()).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'PIN' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'İmzala' }).first()).toBeVisible();
    });
  });

  test.describe('İmzalama Testleri (Requires Smart Card)', () => {
    // Bu testler akıllı kart ve e-İmza Aracı gerektirir
    // Sıralı çalışmalı: P5.1 → P5.2 → P5.3 → P5.4
    
    test('P5.1 - paslBES ile imzalama → sample-signed-BES.pdf', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'paslBES', 'Pades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const downloadPromise = page.waitForEvent('download');
      await page.getByText('e-İmzalı dosyayı indir').click();
      const download = await downloadPromise;
      await download.saveAs('public/docs/sample-signed-BES.pdf');
    });

    test('P5.2 - paslLTV ile imzalama → sample-signed-LTV.pdf', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SAMPLE_PDF, 'sample.pdf');
      await waitForUploadComplete(page);
      
      await selectSignatureLevel(page, 'paslLTV', 'Pades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.ULUC);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const downloadPromise = page.waitForEvent('download');
      await page.getByText('e-İmzalı dosyayı indir').click();
      const download = await downloadPromise;
      await download.saveAs('public/docs/sample-signed-LTV.pdf');
    });

    test('P5.3 - BES + BES (farklı kişi) → sample-signed-BES-BES.pdf', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SIGNED_BES, 'sample-signed-BES.pdf');
      await waitForUploadComplete(page);
      
      // Verify existing signature is shown
      await page.waitForTimeout(3000);
      await expect(page.getByText('İmza Adı')).toBeVisible();
      
      await selectSignatureLevel(page, 'paslBES', 'Pades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const downloadPromise = page.waitForEvent('download');
      await page.getByText('e-İmzalı dosyayı indir').click();
      const download = await downloadPromise;
      await download.saveAs('public/docs/sample-signed-BES-BES.pdf');
    });

    test('P5.4 - BES + LTV (farklı kişi) → sample-signed-BES-LTV.pdf', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await uploadPdfFile(page, TEST_FILES.SIGNED_BES, 'sample-signed-BES.pdf');
      await waitForUploadComplete(page);
      
      await page.waitForTimeout(3000);
      
      await selectSignatureLevel(page, 'paslLTV', 'Pades');
      await startSigningProcess(page);
      
      await signWithCertificate(page, TEST_CERTIFICATES.BULENT);
      
      // Download and save
      await expect(page.getByText('e-İmzalı dosyayı indir')).toBeVisible();
      const downloadPromise = page.waitForEvent('download');
      await page.getByText('e-İmzalı dosyayı indir').click();
      const download = await downloadPromise;
      await download.saveAs('public/docs/sample-signed-BES-LTV.pdf');
    });
  });

  test.describe('İmza Türü Değiştirme', () => {
    
    test('P6.1 - Cades seçildiğinde UI değişmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await selectSignatureType(page, 'Cades');
      
      // Should show Cades dropdown and İmza Metodu
      await expect(page.getByText('Cades İmza Seviyesi')).toBeVisible();
      await expect(page.getByText('İmza Metodu')).toBeVisible();
    });

    test('P6.2 - Xades seçildiğinde UI değişmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      await selectSignatureType(page, 'Xades');
      
      // Should show Xades dropdown, İmza Türü, and İmza Metodu
      await expect(page.getByText('Xades İmza Seviyesi')).toBeVisible();
      await expect(page.getByText('Xades İmza Türü')).toBeVisible();
      await expect(page.getByText('İmza Metodu')).toBeVisible();
    });

    test('P6.3 - Pades geri seçildiğinde UI normale dönmeli', async ({ page }) => {
      await page.goto('/');
      await navigateToEImzaV2(page);
      
      // Switch to Cades then back to Pades
      await selectSignatureType(page, 'Cades');
      await selectSignatureType(page, 'Pades');
      
      // Should only show Pades dropdown
      await expect(page.getByText('Pades İmza Seviyesi')).toBeVisible();
      await expect(page.getByText('İmza Metodu')).not.toBeVisible();
    });
  });
});
