import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { NotificationService, AppNotification } from './notification.service';
import { WebSocketService } from './websocket';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let wsNotification$: BehaviorSubject<any>;
  let notifs: AppNotification[] = [];
  let unread: number = 0;

  const API = 'http://localhost:3000/api/notifications';

  const notifsFixture: AppNotification[] = [
    { id: 'n1', title: 'Nouvelle commande', body: 'Commande #1', type: 'order', read: false, createdAt: '2026-01-01T10:00:00.000Z' },
    { id: 'n2', title: 'Stock faible', body: 'Produit X', type: 'low_stock', read: true, createdAt: '2026-01-02T10:00:00.000Z' }
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    wsNotification$ = new BehaviorSubject<any>(null);
    notifs = [];
    unread = 0;

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WebSocketService, useValue: { notification$: wsNotification$ } }
      ]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    service.notifications$.subscribe((n) => (notifs = n));
    service.unreadCount$.subscribe((c) => (unread = c));
  });

  afterEach(() => {
    httpMock?.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty list and a zero unread count', () => {
    expect(notifs).toEqual([]);
    expect(unread).toBe(0);
  });

  describe('loadNotifications', () => {
    it('should fetch the notifications and update the list + unread count', () => {
      service.loadNotifications();
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush(notifsFixture);
      expect(notifs.length).toBe(2);
      expect(unread).toBe(1); // n1 non lue
    });

    it('should tolerate an HTTP error and keep the empty list', () => {
      service.loadNotifications();
      const req = httpMock.expectOne(API);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      expect(notifs.length).toBe(0);
      expect(unread).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark the notification as read locally and PATCH the server', () => {
      service.loadNotifications();
      httpMock.expectOne(API).flush(notifsFixture);

      service.markAsRead('n1');
      const req = httpMock.expectOne(`${API}/n1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush({});

      expect(notifs.find((n) => n.id === 'n1')?.read).toBe(true);
      expect(unread).toBe(0);
    });

    // Cas limite : id inconnu -> pas d'erreur, état inchangé, appel HTTP quand même
    it('should not change the state for an unknown id', () => {
      service.loadNotifications();
      httpMock.expectOne(API).flush(notifsFixture);

      service.markAsRead('does-not-exist');
      httpMock.expectOne(`${API}/does-not-exist/read`).flush({});

      expect(unread).toBe(1);
    });
  });

  describe('removeNotification', () => {
    it('should remove the notification locally and DELETE on the server', () => {
      service.loadNotifications();
      httpMock.expectOne(API).flush(notifsFixture);

      service.removeNotification('n1');
      const req = httpMock.expectOne(`${API}/n1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      expect(notifs.length).toBe(1);
      expect(notifs[0].id).toBe('n2');
    });

    // Cas limite : suppression de la dernière notification
    it('should handle removing the last notification', () => {
      service.loadNotifications();
      httpMock.expectOne(API).flush(notifsFixture);

      service.removeNotification('n1');
      httpMock.expectOne(`${API}/n1`).flush({});
      service.removeNotification('n2');
      httpMock.expectOne(`${API}/n2`).flush({});

      expect(notifs).toEqual([]);
      expect(unread).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and POST read-all', () => {
      service.loadNotifications();
      httpMock.expectOne(API).flush(notifsFixture);

      service.markAllAsRead();
      const req = httpMock.expectOne(`${API}/read-all`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      expect(notifs.every((n) => n.read)).toBe(true);
      expect(unread).toBe(0);
    });
  });

  describe('websocket integration', () => {
    // Cas limite : notification websocket nulle -> ignorée
    it('should ignore null websocket notifications', () => {
      const before = notifs.length;
      wsNotification$.next(null);
      expect(notifs.length).toBe(before);
    });

    it('should prepend an incoming websocket notification to the list', () => {
      const before = notifs.length;
      wsNotification$.next({ title: 'Nouveau message', body: 'Bonjour', type: 'message' });
      expect(notifs.length).toBe(before + 1);
      expect(notifs[0].title).toBe('Nouveau message');
      expect(notifs[0].read).toBe(false);
      expect(unread).toBe(1);
    });

    it('should default the type to info when the websocket payload has none', () => {
      wsNotification$.next({ title: 'Info', body: 'body' });
      expect(notifs[0].type).toBe('info');
    });
  });
});
