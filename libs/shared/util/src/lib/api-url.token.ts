import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('INTERV_API_URL', {
  factory: () => 'http://localhost:8000',
});

export const WS_URL = new InjectionToken<string>('INTERV_WS_URL', {
  factory: () => 'ws://127.0.0.1:8000',
});
