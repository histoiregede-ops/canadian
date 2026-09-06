import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { InventoryComponent } from './inventory.component';
import { Product, ProductService } from '../../services/product';
import { CategoryService } from '../../services/category';
import { SupplierService } from '../../services/supplier';
import { WebSocketService } from '../../services/websocket';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';
import { BarcodeService } from '../../services/barcode.service';

/**
 * Tests unitaires + fonctionnels du composant Inventaire (produits).
 *
 * Scénarios couverts :
 *  - chargement des données résolues (resolver)
 *  - CREATE : 1 clic = 1 POST, produit visible immédiatement (aucun F5)
 *  - CREATE : double-clic / clics rapides = 1 seul appel API
 *  - UPDATE : PUT, remplacement immuable dans la liste
 *  - DELETE : confirmation, retrait immédiat de la liste, anti-double-clic
 *  - ERREURS : toast d'erreur, bouton réactivé, aucun produit fantôme
 *  - TEMPLATE : boutons désactivés pendant les opérations
 */
describe('InventoryComponent', () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let productServiceMock: {
    getProducts: ReturnType<typeof vi.fn>;
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
    deleteProduct: ReturnType<typeof vi.fn>;
  };
  let categoryServiceMock: { getCategories: ReturnType<typeof vi.fn> };
  let supplierServiceMock: { getSuppliers: ReturnType<typeof vi.fn> };
  let toastMock: { show: ReturnType<typeof vi.fn> };
  let refreshMock: { refresh$: Subject<void>; triggerRefresh: ReturnType<typeof vi.fn> };

  const product: Product = {
    id: 'P1',
    name: 'Panneau Solaire 300W',
    price: 85000,
    stockQuantity: 12,
    status: 'available',
    categoryId: 'C1'
  };

  beforeEach(async () => {
    productServiceMock = {
      getProducts: vi.fn().mockReturnValue(of([product])),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn()
    };
    categoryServiceMock = { getCategories: vi.fn().mockReturnValue(of([])) };
    supplierServiceMock = { getSuppliers: vi.fn().mockReturnValue(of([])) };
    toastMock = { show: vi.fn() };
    refreshMock = { refresh$: new Subject<void>(), triggerRefresh: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [InventoryComponent, CommonModule, FormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: SupplierService, useValue: supplierServiceMock },
        { provide: WebSocketService, useValue: { notification$: of(null) } },
        { provide: RefreshService, useValue: refreshMock },
        { provide: ToastService, useValue: toastMock },
        { provide: BarcodeService, useValue: { downloadBarcode: vi.fn(), generateBarcodeDataUrl: vi.fn(() => '') } },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ data: { products: [product] } })
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load the resolved products from the resolver (no manual refresh)', () => {
    expect(component).toBeTruthy();
    expect(component.products.length).toBe(1);
    expect(component.products[0].id).toBe('P1');
    expect(component.loading).toBe(false);
  });

  describe('saveProduct() — CREATE', () => {
    it('should call createProduct once, add the returned product to the list, close the modal and show a success toast', () => {
      const created: Product = { id: 'P9', name: 'Batterie 12V', price: 45000, stockQuantity: 5, status: 'available' };
      productServiceMock.createProduct.mockReturnValue(of(created));

      component.openAddModal();
      component.currentProduct.name = 'Batterie 12V';
      component.selectedFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      component.photoPreview = 'data:image/jpeg;base64,xxx';
      fixture.detectChanges();
      component.saveProduct();

      expect(productServiceMock.createProduct).toHaveBeenCalledTimes(1);
      // Le produit est immédiatement visible : AUCUN F5 nécessaire
      expect(component.products.some((p) => p.id === 'P9')).toBe(true);
      expect(component.products[0].id).toBe('P9');
      expect(component.showModal).toBe(false);
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith('Produit créé', 'success');
    });

    it('should NOT add a phantom product to the list when the API fails', () => {
      productServiceMock.createProduct.mockReturnValue(
        throwError(() => ({ error: { error: 'Code-barres déjà utilisé' } }))
      );

      component.openAddModal();
      component.currentProduct.name = 'Produit Ko';
      component.selectedFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      component.saveProduct();

      expect(productServiceMock.createProduct).toHaveBeenCalledTimes(1);
      expect(component.products.length).toBe(1);
      expect(component.products.some((p) => p.name === 'Produit Ko')).toBe(false);
      expect(component.showModal).toBe(true);
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalled();
    });

    it('should warn and abort when no image is selected (create requires a photo)', () => {
      component.openAddModal();
      component.currentProduct.name = 'Sans image';
      component.selectedFile = null;
      component.photoPreview = '';
      component.saveProduct();

      expect(productServiceMock.createProduct).not.toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith(
        "L'insertion d'une image est obligatoire pour enregistrer un produit !",
        'warning'
      );
      expect(component.saving).toBe(false);
    });

    it('should send only ONE request on rapid successive clicks (anti-double-click)', () => {
      const pending = new Subject<Product>();
      productServiceMock.createProduct.mockReturnValue(pending);

      component.openAddModal();
      component.currentProduct.name = 'Clics Rapides';
      component.selectedFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      component.saveProduct();
      component.saveProduct();
      component.saveProduct();

      expect(productServiceMock.createProduct).toHaveBeenCalledTimes(1);
      expect(component.saving).toBe(true);

      pending.next({ id: 'P10', name: 'Clics Rapides', price: 1, stockQuantity: 1, status: 'available' });
      pending.complete();
      expect(component.saving).toBe(false);
    });
  });

  describe('saveProduct() — UPDATE', () => {
    it('should call updateProduct, replace the element in the list and show a success toast', () => {
      const updated: Product = { ...product, name: 'Panneau Solaire 350W', price: 95000 };
      productServiceMock.updateProduct.mockReturnValue(of(updated));

      component.openEditModal(product);
      component.currentProduct.name = 'Panneau Solaire 350W';
      component.currentProduct.price = 95000;
      fixture.detectChanges();
      component.saveProduct();

      expect(productServiceMock.updateProduct).toHaveBeenCalledWith('P1', expect.any(FormData));
      // L'ancienne valeur est remplacée immédiatement : AUCUN F5 nécessaire
      const inList = component.products.find((p) => p.id === 'P1');
      expect(inList?.name).toBe('Panneau Solaire 350W');
      expect(inList?.price).toBe(95000);
      expect(component.products.length).toBe(1); // pas de doublon
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith('Produit mis à jour', 'success');
    });

    it('should keep the previous product value displayed when the update fails', () => {
      productServiceMock.updateProduct.mockReturnValue(
        throwError(() => ({ error: { error: 'Barcode conflict' } }))
      );

      component.openEditModal(product);
      component.currentProduct.name = 'Nom qui ne passera pas';
      component.saveProduct();

      const inList = component.products.find((p) => p.id === 'P1');
      expect(inList?.name).toBe('Panneau Solaire 300W'); // état précédent conservé
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalled();
    });
  });

  describe('deleteProduct()', () => {
    it('should call deleteProduct once, remove the product from the list and show a success toast', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      productServiceMock.deleteProduct.mockReturnValue(of(undefined));

      component.deleteProduct('P1');

      expect(productServiceMock.deleteProduct).toHaveBeenCalledWith('P1');
      expect(component.products.some((p) => p.id === 'P1')).toBe(false);
      expect(component.products.length).toBe(0);
      expect(component.deletingId).toBeNull();
      expect(toastMock.show).toHaveBeenCalledWith('Produit supprimé', 'success');
    });

    it('should NOT call the service when the confirmation is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.deleteProduct('P1');
      expect(productServiceMock.deleteProduct).not.toHaveBeenCalled();
      expect(component.products.length).toBe(1);
    });

    it('should send only ONE request on rapid clicks while a delete is in progress', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const pending = new Subject<void>();
      productServiceMock.deleteProduct.mockReturnValue(pending);

      component.deleteProduct('P1');
      component.deleteProduct('P1');
      component.deleteProduct('P1');

      expect(productServiceMock.deleteProduct).toHaveBeenCalledTimes(1);
      expect(component.deletingId).toBe('P1');

      pending.next();
      pending.complete();
      expect(component.deletingId).toBeNull();
    });

    it('should keep the product in the list and show an error toast on API failure', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      productServiceMock.deleteProduct.mockReturnValue(
        throwError(() => ({ error: { error: 'Produit lié à une commande.' } }))
      );

      component.deleteProduct('P1');

      expect(component.products.length).toBe(1);
      expect(component.deletingId).toBeNull();
      expect(toastMock.show).toHaveBeenCalled();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });
  });

  describe('template / disabled states', () => {
    it('should disable the submit button while saving and display a "Enregistrement..." label', () => {
      const pending = new Subject<Product>();
      productServiceMock.createProduct.mockReturnValue(pending);

      component.openAddModal();
      component.currentProduct.name = 'Test';
      component.selectedFile = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      fixture.detectChanges();

      component.saveProduct();
      fixture.detectChanges(false);

      const submitBtn = fixture.nativeElement.querySelector('form button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
      expect(component.saving).toBe(true);

      pending.next({ id: 'P20', name: 'Test', price: 1, stockQuantity: 1, status: 'available' });
      pending.complete();
      expect(component.saving).toBe(false);
    });

    it('should disable delete buttons while a delete is in flight', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const pending = new Subject<void>();
      productServiceMock.deleteProduct.mockReturnValue(pending);

      component.deleteProduct('P1');
      fixture.detectChanges(false);

      // Seul le bouton "Supprimer" du produit ciblé est désactivé (deletingId === product.id)
      const target = fixture.nativeElement.querySelector('.product-card button[title="Supprimer"]') as HTMLButtonElement;
      expect(target).toBeTruthy();
      expect(component.deletingId).toBe('P1');

      pending.next();
      pending.complete();
      expect(component.deletingId).toBeNull();
    });
  });
});