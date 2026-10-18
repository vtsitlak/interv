import { ENVIRONMENT_INITIALIZER, inject } from '@angular/core';
import { NavigationError, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

const STALE_CHUNK_MESSAGE = 'Failed to fetch dynamically imported module';

/** Reload the target URL when a lazy chunk 404s after dev-server HMR. */
export function provideChunkLoadRecovery() {
  return {
    provide: ENVIRONMENT_INITIALIZER,
    multi: true,
    useValue: () => {
      const router = inject(Router);
      router.events
        .pipe(filter((event): event is NavigationError => event instanceof NavigationError))
        .subscribe((event) => {
          const message =
            event.error instanceof Error
              ? event.error.message
              : String(event.error ?? '');
          if (message.includes(STALE_CHUNK_MESSAGE)) {
            window.location.assign(event.url);
          }
        });
    },
  };
}
