# state-profile

Profile state library — Firestore reads/writes and `/ingest` calls wrapped behind a Service, NgRx signalStore, and a Facade that components consume.

- `ProfileService` — Firestore (`profiles/{uid}`) and backend `/ingest` calls. Resolves the current Firebase user before any read/write.
- `ProfileStore` — `signalStore` holding `ProfileState` (profile, loading flags, error, successMessage).
- `ProfileFacade` — Public API for components.

Components must depend on `ProfileFacade` only.
