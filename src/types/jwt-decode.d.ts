declare module 'jwt-decode' {
  /**
   * Decode a JWT and return the payload typed as T.
   */
  export function jwtDecode<T = unknown>(token: string): T;
}
