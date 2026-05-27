import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { TelemetryService } from './telemetry';

describe('Telemetry', () => {
  let service: TelemetryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(TelemetryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
