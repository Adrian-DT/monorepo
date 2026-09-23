import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(endpoint: string, params?: Record<string, string | number>) {
    let httpParams = new HttpParams();

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { params: httpParams });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body);
  }

  put<T>(endpoint: string, body: unknown) {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body);
  }

  delete<T>(endpoint: string) {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`);
  }
}
