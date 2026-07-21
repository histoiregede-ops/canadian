import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';

@Injectable({ providedIn: 'root' })
export class BarcodeService {
  generateBarcodeDataUrl(code: string, width = 2, height = 60): string {
    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, code, {
        format: 'CODE128',
        width,
        height,
        displayValue: false,
        margin: 5
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Barcode generation failed:', e);
      return this.generateFallbackImage(code);
    }
  }

  downloadBarcode(code: string, filename?: string): void {
    const dataUrl = this.generateBarcodeDataUrl(code);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename ? `${filename}.png` : `barcode-${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private generateFallbackImage(code: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CODE-BARRES', canvas.width / 2, 40);
    ctx.font = '14px monospace';
    ctx.fillText(code, canvas.width / 2, 70);
    ctx.font = '12px monospace';
    ctx.fillText('Format: CODE128', canvas.width / 2, 95);

    return canvas.toDataURL('image/png');
  }
}
