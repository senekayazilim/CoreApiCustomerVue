import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test utilities for ONAYLARIM Prime API Demo
 */

export interface Certificate {
  name: string;
  tcNo: string;
  pin: string;
}

export interface SignatureOptions {
  signatureType: 'Pades' | 'Cades' | 'Xades';
  signatureLevel: string;
  certificate: Certificate;
}

/**
 * Navigate to e-İmza V2 tab
 */
export async function navigateToEImzaV2(page: Page) {
  // Use specific selector to avoid matching multiple elements
  await page.getByLabel('Tabs').getByText('e-İmza V2').click();
  await expect(page.getByRole('heading', { name: 'e-İmza V2' })).toBeVisible();
}

/**
 * Upload a PDF file programmatically (bypasses file dialog)
 */
export async function uploadPdfFile(page: Page, filePath: string, fileName: string) {
  const result = await page.evaluate(async ({ filePath, fileName }) => {
    try {
      const response = await fetch(filePath);
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
      
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      const fileInput = document.getElementById('uploadFile') as HTMLInputElement;
      if (!fileInput) return { success: false, error: 'File input not found' };
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      
      return { success: true, size: file.size };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, { filePath, fileName });
  
  expect(result.success).toBe(true);
  return result;
}

/**
 * Select signature type (Pades, Cades, Xades)
 */
export async function selectSignatureType(page: Page, type: 'Pades' | 'Cades' | 'Xades') {
  await page.getByRole('radio', { name: type }).click();
}

/**
 * Select signature level from dropdown
 */
export async function selectSignatureLevel(page: Page, level: string, type: string) {
  const dropdownLabel = `${type} İmza Seviyesi`;
  await page.getByRole('button', { name: new RegExp(dropdownLabel) }).click();
  await page.getByRole('option', { name: level }).click();
}

/**
 * Click Başla button and wait for certificates to load
 */
export async function startSigningProcess(page: Page) {
  await page.getByRole('button', { name: 'Başla' }).click();
  
  // Wait for e-İmza tool connection
  await expect(page.getByRole('heading', { name: 'e-İmzalar' })).toBeVisible({ timeout: 30000 });
}

/**
 * Sign with a specific certificate
 */
export async function signWithCertificate(page: Page, certificate: Certificate) {
  // Find the certificate card by name
  const certificateCard = page.locator('dl').filter({ hasText: certificate.name });
  
  // Enter PIN
  await certificateCard.getByRole('textbox', { name: 'PIN' }).fill(certificate.pin);
  
  // Click İmzala button
  await certificateCard.getByRole('button', { name: 'İmzala' }).click();
  
  // Wait for signing to complete
  await expect(page.getByText('İmza işlemi tamamlandı')).toBeVisible({ timeout: 60000 });
}

/**
 * Download signed file via API
 */
export async function downloadSignedFile(page: Page, outputPath: string): Promise<string> {
  // Get operationId from network requests or page
  const downloadLink = page.getByText('e-İmzalı dosyayı indir');
  await downloadLink.click();
  
  // Wait for download
  await page.waitForTimeout(2000);
  
  return outputPath;
}

/**
 * Wait for file upload to complete
 */
export async function waitForUploadComplete(page: Page) {
  await expect(page.getByText('Dosya sunucuya başarıyla yüklendi')).toBeVisible({ timeout: 30000 });
}

/**
 * Wait for signature list to load
 */
export async function waitForSignatureList(page: Page) {
  // Either shows signatures or shows "no signatures" message
  const hasSignatures = page.locator('[class*="Önceki İmzalar"]').getByText('İmza Adı');
  const noSignatures = page.getByText('Belgede Pades türünde imza bulunmuyor');
  
  await expect(hasSignatures.or(noSignatures)).toBeVisible({ timeout: 30000 });
}

/**
 * Verify previous signatures are displayed
 */
export async function verifyPreviousSignatures(page: Page, expectedCount: number) {
  const signatureCards = page.locator('text=İmza Adı');
  await expect(signatureCards).toHaveCount(expectedCount);
}

/**
 * Get log messages from the page
 */
export async function getLogMessages(page: Page): Promise<string[]> {
  const logs = await page.locator('.İşlemler p, [class*="İşlemler"] p').allTextContents();
  return logs;
}

/**
 * Test certificates configuration
 * NOTE: Update these with actual test certificate details
 */
export const TEST_CERTIFICATES: Record<string, Certificate> = {
  ULUC: {
    name: 'ULUÇ EFE ÖZTÜRK',
    tcNo: '14495523968',
    pin: '123987', // WARNING: Don't commit real PINs to public repos!
  },
  
  BULENT: {
    name: 'BÜLENT DAYIOĞLU',
    tcNo: '20206372664',
    pin: '0606', // WARNING: Don't commit real PINs to public repos!
  },
  
  
};

/**
 * Test file paths
 */
export const TEST_FILES = {
  // PAdES test files
  SAMPLE_PDF: '/docs/sample.pdf',
  SIGNED_BES: '/docs/sample-signed-BES.pdf',
  SIGNED_LTV: '/docs/sample-signed-LTV.pdf',
  SIGNED_BES_BES: '/docs/sample-signed-BES-BES.pdf',
  SIGNED_BES_LTV: '/docs/sample-signed-BES-LTV.pdf',
  // CAdES test files (generated by previous tests in test-results/cades/)
  CADES_BES: '/docs/test-results/cades/C5.1-sample-cades-BES.p7m',
  CADES_T: '/docs/test-results/cades/C5.2-sample-cades-T.p7m',
  CADES_XL: '/docs/test-results/cades/C5.3-sample-cades-XL.p7m',
  // XAdES test files
  SAMPLE_XML: '/docs/sample.xml',
  // XAdES signed files (generated by previous tests in test-results/xades/)
  XADES_BES: '/docs/test-results/xades/X5.1-sample-xades-BES-enveloped.xsig',
  XADES_T: '/docs/test-results/xades/X5.2-sample-xades-T-enveloped.xsig',
  XADES_XL: '/docs/test-results/xades/X5.3-sample-xades-XL-enveloped.xsig',
  XADES_BES_ENVELOPING: '/docs/test-results/xades/X5.4-sample-xades-BES-enveloping.xsig',
  XADES_T_ENVELOPING: '/docs/test-results/xades/X5.5-sample-xades-T-enveloping.xsig',
  XADES_XL_ENVELOPING: '/docs/test-results/xades/X5.6-sample-xades-XL-enveloping.xsig',
};

/**
 * Select CAdES signature method (Seri/Paralel)
 */
export async function selectSignatureMethod(page: Page, method: 'Seri' | 'Paralel') {
  await page.getByRole('button', { name: /İmza Metodu/ }).click();
  await page.getByRole('option', { name: method }).click();
}

/**
 * Upload a file for CAdES signing (supports PDF and P7M)
 */
export async function uploadFileForCades(page: Page, filePath: string, fileName: string) {
  const result = await page.evaluate(async ({ filePath, fileName }) => {
    try {
      const response = await fetch(filePath);
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
      
      const blob = await response.blob();
      const mimeType = fileName.endsWith('.p7m') ? 'application/pkcs7-mime' : 'application/pdf';
      const file = new File([blob], fileName, { type: mimeType });
      
      const fileInput = document.getElementById('uploadFile') as HTMLInputElement;
      if (!fileInput) return { success: false, error: 'File input not found' };
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      
      return { success: true, size: file.size };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, { filePath, fileName });
  
  expect(result.success).toBe(true);
  return result;
}

/**
 * Wait for CAdES signature list to load
 */
export async function waitForCadesSignatureList(page: Page) {
  // Either shows signatures or shows "no CAdES signatures" message
  const hasSignatures = page.getByText('İmza Adı');
  const noSignatures = page.getByText('Belgede Cades türünde imza bulunmuyor');
  
  await expect(hasSignatures.or(noSignatures)).toBeVisible({ timeout: 30000 });
}

/**
 * Download signed CAdES file to Playwright artifacts
 */
export async function downloadCadesFile(page: Page) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('e-İmzalı dosyayı indir').click();
  const download = await downloadPromise;
  return download;
}

/**
 * Download signed file and save to public/docs/test-results/{type}/ folder
 * Files are saved with test ID prefix for easy identification
 * @param page - Playwright page
 * @param targetFileName - Target file name (e.g., 'sample-cades-BES-BES.p7m')
 * @param testId - Test scenario ID (e.g., 'C5.1', 'C6.2', 'X5.1') - will be prepended to filename
 * @param signatureType - 'cades' or 'xades' to determine target folder
 * @returns Download path
 */
export async function downloadAndSaveSignedFile(page: Page, targetFileName: string, testId?: string, signatureType: 'cades' | 'xades' = 'cades'): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('e-İmzalı dosyayı indir').click();
  const download = await downloadPromise;
  
  // Prepend test ID to filename if provided
  const finalFileName = testId ? `${testId}-${targetFileName}` : targetFileName;
  
  // Save to public/docs/test-results/{type}/ folder
  const targetDir = `public/docs/test-results/${signatureType}`;
  const targetPath = `${targetDir}/${finalFileName}`;
  
  // Ensure directory exists
  const fullDirPath = path.resolve(targetDir);
  if (!fs.existsSync(fullDirPath)) {
    fs.mkdirSync(fullDirPath, { recursive: true });
  }
  
  // Playwright saveAs expects relative path from project root
  await download.saveAs(targetPath);
  
  return targetPath;
}

// =====================================================
// XAdES Helper Functions
// =====================================================

/**
 * Select XAdES signature type (Enveloped/Enveloping)
 */
export async function selectXadesSignatureType(page: Page, type: 'Enveloped' | 'Enveloping') {
  await page.getByRole('button', { name: /Xades İmza Türü/ }).click();
  await page.getByRole('option', { name: type }).click();
}

/**
 * Upload a file for XAdES signing (supports XML and XSIG)
 */
export async function uploadFileForXades(page: Page, filePath: string, fileName: string) {
  const result = await page.evaluate(async ({ filePath, fileName }) => {
    try {
      const response = await fetch(filePath);
      if (!response.ok) return { success: false, error: `HTTP ${response.status}` };
      
      const blob = await response.blob();
      let mimeType = 'application/xml';
      if (fileName.endsWith('.xsig')) {
        mimeType = 'application/xml';
      } else if (fileName.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      }
      const file = new File([blob], fileName, { type: mimeType });
      
      const fileInput = document.getElementById('uploadFile') as HTMLInputElement;
      if (!fileInput) return { success: false, error: 'File input not found' };
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      
      return { success: true, size: file.size };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, { filePath, fileName });
  
  expect(result.success).toBe(true);
  return result;
}

/**
 * Wait for XAdES signature list to load
 */
export async function waitForXadesSignatureList(page: Page) {
  // Either shows signatures or shows "no XAdES signatures" message
  const hasSignatures = page.getByText('İmza Adı');
  const noSignatures = page.getByText('Belgede Xades türünde imza bulunmuyor');
  
  await expect(hasSignatures.or(noSignatures)).toBeVisible({ timeout: 30000 });
}
