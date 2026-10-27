
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = authService.isLoggedIn();
  const user = authService.getCurrentUser();
  const userRole = authService.getRole();
  const allowedRoles = route.data['roles'] as string[] | undefined;

  // Diagnostic output only; do not log credentials.
  console.log('[AuthGuard] Route:', route.routeConfig?.path);
  console.log('[AuthGuard] Logged in:', isLoggedIn);
  console.log('[AuthGuard] Username:', user?.username ?? null);
  console.log('[AuthGuard] Role:', userRole);
  console.log('[AuthGuard] Allowed roles:', allowedRoles);

  if (!isLoggedIn) {
    console.warn('[AuthGuard] Redirecting to login: no session.');
    return router.createUrlTree(['/login']);
  }

  if (
    allowedRoles &&
    (!userRole || !allowedRoles.includes(userRole))
  ) {
    console.warn('[AuthGuard] Redirecting to unauthorized: role mismatch.');
    return router.createUrlTree(['/unauthorized']);
  }

  console.log('[AuthGuard] Access granted.');
  return true;
};
