## v0.3 FIXED

Fixed the mobile/browser overlay bug where elements using the HTML `hidden` attribute could remain visible because author CSS set `display:grid`. Added explicit `[hidden]` rules, plus safer local-storage fallback and broader browser compatibility in the app runtime.

# CS 2.0 Web v0.2

A much fuller browser/PWA build inspired by CloudStream's navigation and extension-centric architecture.

The official CloudStream project describes itself as an extension-based media center and lists ad-free operation, no tracking/analytics, bookmarks, phone/TV support, Chromecast and an extension system among its features. It also states that CloudStream itself does not provide video sources by default; extensions add functionality. This build follows that separation while adapting it to browser security constraints.

> We do not provide, host, or distribute extensions or any unauthorized or illegal video content.

## What's in v0.2

Home, Search, grouped provider results, filters, Library, local bookmarks, collections skeleton, Continue Watching, local history, progress, Downloads queue UI, Extensions manager, repository URL intake, manifest validation, source selection UI, episode selector UI, player shell, random title, PIN lock, JSON backup/restore, security audit, wipe controls, mobile navigation and PWA manifest.

## Extension model

For security, this browser build intentionally does **not** execute arbitrary remote JavaScript from a repository URL. A manifest can declare capabilities and origins, but a real provider adapter must be packaged/approved for this build.

This prevents a compromised extension repository from turning the site into an arbitrary-code execution surface.

Example manifest:

```json
{
  "name": "Example Provider",
  "version": "1.0.0",
  "description": "Metadata/search adapter",
  "capabilities": ["metadata", "search"]
}
```

## Hosting

Static HTTPS hosting is enough for the UI shell. For production, configure server headers:

- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy
- Referrer-Policy: no-referrer

The CSP in `index.html` is also strict, but server-delivered headers should be used in production.

## Media providers

The package intentionally does not ship unauthorized movie/series sources. Connect only media sources you have permission to access, and keep provider adapters isolated from the core UI.

## iPhone

Open the HTTPS deployment in Brave/Safari and add it to the Home Screen. Browser/PWA capabilities differ from Android; e.g. background downloads and Chromecast behavior are platform-dependent.

## License note

This package is an original web implementation inspired by CloudStream's public feature set. It is not the official CloudStream Android project.
