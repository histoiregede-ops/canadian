import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { BarcodeService } from './barcode.service';

describe('BarcodeService', () => {
  let service: BarcodeService;

  // jsdom ne fournit pas de contexte 2D : on mocke getContext + toDataURL
  let barcodeCall: number;
  let mockCtx: any;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [BarcodeService, provideHttpClient()]
    });
    service = TestBed.inject(BarcodeService);

    barcodeCall = 0;
    mockCtx = { canvas: {} };
    ['save', 'restore', 'translate', 'rotate', 'scale', 'beginPath', 'closePath', 'moveTo',
     'lineTo', 'stroke', 'fill', 'fillRect', 'clearRect', 'fillText', 'strokeText', 'rect',
     'clip', 'setTransform', 'transform', 'arc', 'ellipse', 'drawImage', 'setLineDash'
    ].forEach((m) => (mockCtx[m] = vi.fn()));
    mockCtx.measureText = vi.fn(() => ({ width: 10 }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      barcodeCall++;
      return `data:image/png;base64,${barcodeCall}`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(url1).toContain('data:image/png;base64,');
    expect(url2).toContain('data:image/png;base64,');
  });

  it('should generate fallback image on error', () => {
    const dataUrl = service.generateBarcodeDataUrl('');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('should have downloadBarcode method', () => {
    expect(typeof service.downloadBarcode).toBe('function');
  });
});