
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const credentials = authService.getCredentials();

  const isClinicApi = request.url.startsWith(
    'http://localhost:8080/api/'
  );

  if (!credentials || !isClinicApi) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Basic ${credentials}`
    }
  });

  return next(authenticatedRequest);
};
