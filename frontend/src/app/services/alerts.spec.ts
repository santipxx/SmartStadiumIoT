import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AlertsService } from './alerts';

describe('Alerts', () => {
  let service: AlertsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AlertsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
