"""
AUTH-01: JWT verification via Supabase JWKS (ES256 / asymmetric keys).

Flow:
  1. Client sends `Authorization: Bearer <supabase_access_token>`.
  2. `get_current_user()` validates the token: signature (via JWKS), aud, iss, exp.
  3. Returns an AuthUser(id=sub, email=...) — used by every protected router.

Test seam: override `get_current_user` via `app.dependency_overrides` in tests.
"""
import logging
import os
from dataclasses import dataclass

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# ── Configuration (from env) ──────────────────────────────────────────────────

# Required — no hardcoded fallback (a real project ref must never be baked into
# source). Copy .env.example to .env and set SUPABASE_URL. Fails fast if missing.
_SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
if not _SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is not set. Copy .env.example to .env and set your "
        "Supabase project URL (see the AUTH-01 section)."
    )

_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL",
    f"{_SUPABASE_URL}/auth/v1/.well-known/jwks.json",
)

_EXPECTED_AUD = "authenticated"
_EXPECTED_ISS = f"{_SUPABASE_URL}/auth/v1"

# PyJWKClient caches the fetched JWKS in memory; lifespan_in_seconds=3600 avoids
# hammering the endpoint on every request while staying fresh for key rotations.
_jwks_client = PyJWKClient(_JWKS_URL, lifespan=3600)

# HTTPBearer parses the `Authorization: Bearer <token>` header and returns 403
# if the header is missing.  We override with 401 in get_current_user() below.
_bearer = HTTPBearer(auto_error=False)


# ── User object returned by the dependency ────────────────────────────────────

@dataclass
class AuthUser:
    """Authenticated caller.  .id is the Supabase `sub` claim (UUID str)."""
    id: str
    email: str
    # display_name comes from Supabase user_metadata (set at signup). Used only to
    # seed AppUser.display_name on first request; None when the user never set one.
    display_name: str | None = None


# ── FastAPI dependency ─────────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    """
    Validate the Supabase JWT and return the caller's identity.

    Raises HTTP 401 on:
      - missing Authorization header
      - invalid / expired token
      - wrong audience or issuer
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Fetch the matching signing key from the JWKS endpoint
        signing_key = _jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience=_EXPECTED_AUD,
            issuer=_EXPECTED_ISS,
            options={"verify_exp": True},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        # SEC-01-2: log the specifics server-side, return a generic message so we
        # don't hand token-fingerprinting detail to unauthenticated callers.
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        # Infrastructure failure (e.g. JWKS endpoint unreachable) — distinct from a
        # malformed token. Log it; surface a generic 503 without internal detail.
        logger.error("Token verification error (infrastructure): %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify token",
        )

    sub: str | None = payload.get("sub")
    email: str = payload.get("email", "")

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    # Supabase carries signup user_metadata in the token; pull display_name if set.
    user_metadata = payload.get("user_metadata") or {}
    display_name = user_metadata.get("display_name")
    if isinstance(display_name, str):
        display_name = display_name.strip() or None
    else:
        display_name = None

    return AuthUser(id=sub, email=email, display_name=display_name)
