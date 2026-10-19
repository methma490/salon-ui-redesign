import { isOriginAllowed, parseAllowedOrigins } from './cors.util';

describe('Finding 09: CORS Hardening Spec', () => {
  const allowedOriginsList = parseAllowedOrigins(
    'https://saloon-client.bc.dartcodes.com',
    'https://dashboard.dartcodes.com,https://app.dartcodes.com',
  );

  it('allows approved frontend origins in the whitelist', () => {
    expect(isOriginAllowed('https://saloon-client.bc.dartcodes.com', allowedOriginsList, true)).toBe(true);
    expect(isOriginAllowed('https://dashboard.dartcodes.com', allowedOriginsList, true)).toBe(true);
    expect(isOriginAllowed('https://app.dartcodes.com', allowedOriginsList, true)).toBe(true);
  });

  it('strictly rejects arbitrary/unknown dartcodes subdomains (no wildcard subdomain trust)', () => {
    expect(isOriginAllowed('https://malicious.dartcodes.com', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('https://evil.dartcodes.com', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('https://sub.saloon-client.bc.dartcodes.com', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('https://dartcodes.com', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('https://anything.dartcodes.com', allowedOriginsList, true)).toBe(false);
  });

  it('strictly rejects malicious third-party external origins', () => {
    expect(isOriginAllowed('https://attacker.com', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('https://fake-salon.lk', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('http://saloon-client.bc.dartcodes.com.attacker.com', allowedOriginsList, true)).toBe(false);
  });

  it('allows no-origin requests for server-to-server and webhooks (PayHere IPN, cURL, Mobile apps)', () => {
    expect(isOriginAllowed(undefined, allowedOriginsList, true)).toBe(true);
    expect(isOriginAllowed('', allowedOriginsList, true)).toBe(true);
  });

  it('allows localhost and 127.0.0.1 in non-production, but rejects in production unless explicitly whitelisted', () => {
    expect(isOriginAllowed('http://localhost:5173', allowedOriginsList, false)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:3000', allowedOriginsList, false)).toBe(true);

    expect(isOriginAllowed('http://localhost:5173', allowedOriginsList, true)).toBe(false);
    expect(isOriginAllowed('http://127.0.0.1:3000', allowedOriginsList, true)).toBe(false);
  });
});
