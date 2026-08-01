import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService, User } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:3000/api/users';

  const user: User = {
    id: '1',
    username: 'admin',
    fullName: 'Admin User',
    email: 'admin@test.com',
    role: 'admin'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers', () => {
    it('should call GET on the users endpoint', () => {
      let users: User[] = [];
      service.getUsers().subscribe((u) => (users = u));
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('GET');
      req.flush([user]);
      expect(users.length).toBe(1);
    });

    // Cas limite : erreur HTTP -> retourne un tableau vide (géré par catchError)
    it('should return an empty array when the request fails', () => {
      let users: User[] | null = null;
      service.getUsers().subscribe((u) => (users = u));
      const req = httpMock.expectOne(API);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      expect(users).toEqual([]);
    });
  });

  describe('getUser', () => {
    it('should call GET /:id', () => {
      service.getUser('1').subscribe();
      const req = httpMock.expectOne(`${API}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(user);
    });
  });

  describe('createUser', () => {
    it('should POST the user to the endpoint', () => {
      const body = { username: 'new', password: 'pw', email: 'new@test.com', fullName: 'New', role: 'cashier' };
      service.createUser(body).subscribe();
      const req = httpMock.expectOne(API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: '2', ...body });
    });
  });

  describe('updateUser', () => {
    it('should PUT the update to /:id', () => {
      service.updateUser('1', { fullName: 'Updated Name' }).subscribe();
      const req = httpMock.expectOne(`${API}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ fullName: 'Updated Name' });
      req.flush({ ...user, fullName: 'Updated Name' });
    });
  });

  describe('deleteUser', () => {
    it('should DELETE /:id', () => {
      service.deleteUser('1').subscribe();
      const req = httpMock.expectOne(`${API}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
    });
  });

  describe('blockUser / unblockUser', () => {
    it('blockUser should PUT /:id/block', () => {
      service.blockUser('1').subscribe();
      const req = httpMock.expectOne(`${API}/1/block`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({});
    });

    it('unblockUser should PUT /:id/unblock', () => {
      service.unblockUser('1').subscribe();
      const req = httpMock.expectOne(`${API}/1/unblock`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({});
    });
  });

  describe('registerUser', () => {
    it('should POST to the register endpoint', () => {
      const body = { username: 'u', password: 'p', role: 'client' };
      service.registerUser(body).subscribe();
      const req = httpMock.expectOne('http://localhost:3000/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: '3', ...body });
    });
  });
});
