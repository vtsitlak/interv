# state-auth

Auth state library — Firebase auth wrapped behind a Service, NgRx signalStore, and a Facade that components consume.

- `AuthService` — Firebase auth API wrapper (sign-in, sign-up, popup, redirect, sign-out).
- `AuthStore` — `signalStore` holding `AuthState` (user, loading, error). Calls the service, never touches Router.
- `AuthFacade` — Public API for components: exposes signals + delegates methods, handles post-login/logout navigation.

Components and guards must depend on `AuthFacade` only.
