
# Atherbyte Backend

Central backend for the Atherbyte platform.

## Architecture

- Frontend: GitHub Pages
- API: Cloudflare Workers
- Database and authentication infrastructure: Supabase

## Planned features

- Shared accounts across Atherbyte games
- Username and password login
- Optional email verification for account recovery
- Profile management and profile pictures
- Secure leaderboard submission and retrieval

## Security requirements

- Never commit secret keys or passwords.
- Keep privileged database credentials on the server.
- Validate all sensitive operations on the backend.
- Keep leaderboard submissions disabled until score validation is implemented.
- Preserve the existing Supabase database and game deployments.

## Status

Initial Cloudflare Worker health check completed.
