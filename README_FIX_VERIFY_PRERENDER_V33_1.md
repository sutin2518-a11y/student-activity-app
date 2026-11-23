# v33.1 — Fix certificate verification prerender error

## Cause

Next.js 16.4.2 is configured with `cacheComponents: true` and `partialPrefetching: true`. The certificate verification route read the dynamic URL segment using `useParams()` in a Client Component without a Suspense boundary. During prerender/instant-navigation validation, Next.js raised `CLIENT_HOOK_DYNAMIC` (`blocking-prerender-client-hook`).

## Change

- `src/app/group-sports/certificates/verify/[token]/page.tsx` is now a Server Component and wraps the URL-dependent client content in a local `<Suspense>` boundary.
- `src/app/group-sports/certificates/verify/[token]/verify-certificate-client.tsx` contains the existing client-side verification flow. `useParams()` remains in this child component, now under Suspense.
- The fallback preserves the certificate verification page shell and displays a loading message.
- Supabase RPC name, token validation, certificate fields, and QR verification behavior are unchanged.

## Apply

Copy the two files in this folder into the matching route folder in the project, then run:

```bash
npm run build
```

No SQL migration or database change is required for this fix.
