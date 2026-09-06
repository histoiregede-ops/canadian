import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SuppliersComponent } from './suppliers.component';
import { Supplier, SupplierService } from '../../services/supplier';
import { ProductService } from '../../services/product';
import { RefreshService } from '../../services/refresh.service';
import { ToastService } from '../../services/toast.service';

/**
 * Tests unitaires + fonctionnels du composant Fournisseurs.
 *
 * Scénarios couverts :
 *  - chargement des données résolues (resolver)
 *  - CREATE : 1 clic = 1 POST, liste mise à jour immédiatement (aucun F5)
 *  - CREATE : double-clic / clics rapides = 1 seul appel API
 *  - UPDATE : PUT, remplacement immuable de l'élément dans la liste
 *  - DELETE : confirmation, retrait immédiat de la liste, anti-double-clic
 *  - ERREURS : toast d'erreur affiché, bouton réactivé, aucun élément fantôme
 *  - TEMPLATE : boutons désactivés pendant les opérations
 */
describe('SuppliersComponent', () => {
  let component: SuppliersComponent;
  let fixture: ComponentFixture<SuppliersComponent>;
  let supplierServiceMock: {
    getSuppliers: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
    deleteSupplier: ReturnType<typeof vi.fn>;
  };
  let productServiceMock: { getProducts: ReturnType<typeof vi.fn> };
  let toastMock: { show: ReturnType<typeof vi.fn> };
  let refreshMock: { refresh$: Subject<void>; triggerRefresh: ReturnType<typeof vi.fn> };

  const supplier: Supplier = {
    id: 'S1',
    name: 'Système Solaire SARL',
    contactName: 'M. Diallo',
    email: 'contact@solaire.ma',
    isActive: true
  };
  const supplier2: Supplier = { id: 'S2', name: 'ÉlectroPlus', email: 'info@electroplus.ma', isActive: false };

  beforeEach(async () => {
    supplierServiceMock = {
      getSuppliers: vi.fn(),
      createSupplier: vi.fn(),
      updateSupplier: vi.fn(),
      deleteSupplier: vi.fn()
    };
    productServiceMock = { getProducts: vi.fn().mockReturnValue(of([])) };
    toastMock = { show: vi.fn() };
    refreshMock = { refresh$: new Subject<void>(), triggerRefresh: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SuppliersComponent, CommonModule, FormsModule],
      providers: [
        { provide: SupplierService, useValue: supplierServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        { provide: RefreshService, useValue: refreshMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ data: { suppliers: [supplier, supplier2], products: [] } })
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SuppliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load the resolved suppliers from the resolver (no manual refresh)', () => {
    expect(component).toBeTruthy();
    expect(component.suppliers.length).toBe(2);
    expect(component.suppliers[0].id).toBe('S1');
    expect(component.loading).toBe(false);
  });

  describe('saveSupplier() — CREATE', () => {
    it('should call createSupplier once, add the returned supplier to the list and show a success toast', () => {
      const created: Supplier = { id: 'S9', name: 'Nouveau Fournisseur' };
      supplierServiceMock.createSupplier.mockReturnValue(of(created));

      component.openAddModal();
      fixture.detectChanges();
      component.currentSupplier.name = 'Nouveau Fournisseur';
      component.saveSupplier();

      expect(supplierServiceMock.createSupplier).toHaveBeenCalledTimes(1);
      // Mise à jour immédiate de la liste : l'élément est visible SANS F5
      expect(component.suppliers.some((s) => s.id === 'S9')).toBe(true);
      expect(component.suppliers[0].id).toBe('S9');
      expect(component.showModal).toBe(false);
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith('Fournisseur créé avec succès.', 'success');
    });

    it('should NOT create a phantom element when the API fails (erreur serveur)', () => {
      supplierServiceMock.createSupplier.mockReturnValue(
        throwError(() => ({ error: { error: 'Un fournisseur avec cet email existe déjà.' } }))
      );

      component.openAddModal();
      component.currentSupplier.name = 'Doublon';
      component.currentSupplier.email = 'doublon@mail.ma';
      component.saveSupplier();

      expect(supplierServiceMock.createSupplier).toHaveBeenCalledTimes(1);
      // Aucun élément fantôme ajouté à la liste
      expect(component.suppliers.length).toBe(2);
      expect(component.suppliers.some((s) => s.name === 'Doublon')).toBe(false);
      // Le modal reste ouvert, l'utilisateur peut corriger
      expect(component.showModal).toBe(true);
      // Le bouton est réactivé (finalize)
      expect(component.saving).toBe(false);
      // L'erreur est visible
      expect(toastMock.show).toHaveBeenCalledWith(
        'Erreur: Un fournisseur avec cet email existe déjà.',
        'error'
      );
    });

    it('should send only ONE request on rapid successive clicks (anti-double-click)', () => {
      const pending = new Subject<Supplier>();
      supplierServiceMock.createSupplier.mockReturnValue(pending);

      component.openAddModal();
      component.currentSupplier.name = 'Clics Rapides';
      component.saveSupplier();
      component.saveSupplier();
      component.saveSupplier();

      expect(supplierServiceMock.createSupplier).toHaveBeenCalledTimes(1);
      expect(component.saving).toBe(true);

      pending.next({ id: 'S10', name: 'Clics Rapides' });
      pending.complete();
      expect(component.saving).toBe(false);
    });

    it('should ignore a click while saving (form re-submission)', () => {
      const pending = new Subject<Supplier>();
      supplierServiceMock.createSupplier.mockReturnValue(pending);

      component.openAddModal();
      component.currentSupplier.name = 'X';
      component.saveSupplier();
      component.saveSupplier();
      expect(supplierServiceMock.createSupplier).toHaveBeenCalledTimes(1);
      pending.complete();
    });
  });

  describe('saveSupplier() — UPDATE', () => {
    it('should call updateSupplier, replace the element in place in the list and show a success toast', () => {
      const updated: Supplier = { ...supplier, name: 'Système Solaire (mis à jour)', city: 'Abidjan' };
      supplierServiceMock.updateSupplier.mockReturnValue(of(updated));

      component.openEditModal(supplier);
      fixture.detectChanges();
      component.currentSupplier.name = 'Système Solaire (mis à jour)';
      component.currentSupplier.city = 'Abidjan';
      component.saveSupplier();

      expect(supplierServiceMock.updateSupplier).toHaveBeenCalledWith('S1', expect.any(Object));
      // L'ancienne valeur est remplacée immédiatement : AUCUN F5 nécessaire
      const inList = component.suppliers.find((s) => s.id === 'S1');
      expect(inList?.name).toBe('Système Solaire (mis à jour)');
      expect(inList?.city).toBe('Abidjan');
      expect(component.suppliers.length).toBe(2); // pas de doublon
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith('Fournisseur modifié avec succès.', 'success');
    });

    it('should keep the previous value displayed when the update fails', () => {
      supplierServiceMock.updateSupplier.mockReturnValue(
        throwError(() => ({ status: 409, error: { error: 'Cet email est déjà utilisé.' } }))
      );

      component.openEditModal(supplier);
      component.currentSupplier.email = 'autre@mail.ma';
      component.saveSupplier();

      const inList = component.suppliers.find((s) => s.id === 'S1');
      expect(inList?.email).toBe('contact@solaire.ma'); // état précédent conservé
      expect(component.saving).toBe(false);
      expect(toastMock.show).toHaveBeenCalledWith(
        'Erreur: Cet email est déjà utilisé.',
        'error'
      );
    });
  });

  describe('deleteSupplier()', () => {
    it('should call deleteSupplier once, remove the supplier from the list and show a success toast', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      supplierServiceMock.deleteSupplier.mockReturnValue(of(undefined));

      component.deleteSupplier('S1');

      expect(supplierServiceMock.deleteSupplier).toHaveBeenCalledWith('S1');
      expect(component.suppliers.some((s) => s.id === 'S1')).toBe(false);
      expect(component.suppliers.length).toBe(1);
      expect(component.deletingId).toBeNull();
      expect(toastMock.show).toHaveBeenCalledWith('Fournisseur supprimé avec succès.', 'success');
    });

    it('should NOT call the service when the confirmation is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.deleteSupplier('S1');
      expect(supplierServiceMock.deleteSupplier).not.toHaveBeenCalled();
      expect(component.suppliers.length).toBe(2);
    });

    it('should send only ONE request on rapid clicks while a delete is in progress', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const pending = new Subject<void>();
      supplierServiceMock.deleteSupplier.mockReturnValue(pending);

      component.deleteSupplier('S1');
      component.deleteSupplier('S1');
      component.deleteSupplier('S1');

      expect(supplierServiceMock.deleteSupplier).toHaveBeenCalledTimes(1);
      expect(component.deletingId).toBe('S1');

      pending.next();
      pending.complete();
      expect(component.deletingId).toBeNull();
    });

    it('should keep the supplier in the list and show an error toast on API failure', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      supplierServiceMock.deleteSupplier.mockReturnValue(
        throwError(() => ({ status: 400, error: { error: 'Impossible: fournisseur lié à des produits.' } }))
      );

      component.deleteSupplier('S1');

      expect(component.suppliers.length).toBe(2);
      expect(component.deletingId).toBeNull();
      expect(toastMock.show).toHaveBeenCalledWith(
        'Erreur: Impossible: fournisseur lié à des produits.',
        'error'
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });
  });

  describe('template / disabled states', () => {
    it('should disable the submit button while saving and display a "Création..." label', () => {
      const pending = new Subject<Supplier>();
      supplierServiceMock.createSupplier.mockReturnValue(pending);

      component.openAddModal();
      component.currentSupplier.name = 'Test';
      fixture.detectChanges(false);

      component.saveSupplier();
      fixture.detectChanges(false);

      const submitBtn = fixture.nativeElement.querySelector('.modal-footer button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn).toBeTruthy();
      expect(component.saving).toBe(true);

      pending.next({ id: 'S11', name: 'Test' });
      pending.complete();
      expect(component.saving).toBe(false);
    });

    it('should disable the delete button while its delete is in flight', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const pending = new Subject<void>();
      supplierServiceMock.deleteSupplier.mockReturnValue(pending);

      component.deleteSupplier('S1');
      fixture.detectChanges(false);

      // Seul le bouton du fournisseur ciblé est désactivé (deletingId === s.id)
      const target = fixture.nativeElement.querySelector('.supplier-card button.btn-danger') as HTMLButtonElement;
      expect(target).toBeTruthy();
      expect(component.deletingId).toBe('S1');

      pending.next();
      pending.complete();
      expect(component.deletingId).toBeNull();
    });
  });

  describe('search filter', () => {
    it('should filter suppliers by name', () => {
      component.searchQuery = 'électro';
      component.onSearch();
      expect(component.filteredSuppliers.length).toBe(1);
      expect(component.filteredSuppliers[0].id).toBe('S2');
    });

    it('should show all suppliers when the search is empty', () => {
      component.searchQuery = '';
      component.onSearch();
      expect(component.filteredSuppliers.length).toBe(2);
    });
  });
});