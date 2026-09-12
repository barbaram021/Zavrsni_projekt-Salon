/**
 * Produkcijska konfiguracija (Render).
 * Zamjenjuje environment.ts pri `ng build --configuration production`
 * preko `fileReplacements` u angular.json.
 */
export const environment = {
  production: true,
  apiUrl: 'https://salon-backend-om75.onrender.com',
};
