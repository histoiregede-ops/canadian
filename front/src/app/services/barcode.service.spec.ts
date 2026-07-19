import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { BarcodeService } from './barcode.service';

describe('BarcodeService', () => {
  let service: BarcodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BarcodeService, provideHttpClient()]
    });
    service = TestBed.inject(BarcodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate barcode data URL', () => {
    const dataUrl = service.generateBarcodeDataUrl('TEST123');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('should generate different barcodes for different codes', () => {
    const url1 = service.generateBarcodeDataUrl('CODE1');
    const url2 = service.generateBarcodeDataUrl('CODE2');
    expect(url1).not.toBe(url2);
  });

  it('should generate fallback image on error', () => {
    const dataUrl = service.generateBarcodeDataUrl('');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('should have downloadBarcode method', () => {
    expect(typeof service.downloadBarcode).toBe('function');
  });
});
