import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './services/auth.service';

const authServiceMock = {
  username: signal<string | null>('test'),
  isAuthenticated: signal(true),
  userRoles: signal<string[]>([]),
  logout: () => {},
  hasRole: () => false,
  init: () => Promise.resolve(true),
  getValidToken: () => Promise.resolve('mock-token'),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
