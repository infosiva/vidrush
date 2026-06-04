import logging

from supabase import Client, create_client

from app.config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None
_service_client: Client | None = None


def get_supabase_client() -> Client:
    """Get Supabase client using the anon key (for auth operations)."""
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _client


def get_supabase_service_client() -> Client:
    """Get Supabase client using the service role key (for DB operations)."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _service_client


# --- Auth helpers ---

def signup(email: str, password: str):
    client = get_supabase_client()
    return client.auth.sign_up({"email": email, "password": password})


def login(email: str, password: str):
    client = get_supabase_client()
    return client.auth.sign_in_with_password({"email": email, "password": password})


def refresh_token(refresh_token_str: str):
    client = get_supabase_client()
    return client.auth.refresh_session(refresh_token_str)


def get_user_from_token(access_token: str):
    client = get_supabase_client()
    return client.auth.get_user(access_token)


# --- DB helpers ---

def save_conversation(user_id: str, conversation_id: str, messages: list):
    client = get_supabase_service_client()
    return (
        client.table("conversations")
        .upsert({
            "id": conversation_id,
            "user_id": user_id,
            "messages": messages,
        })
        .execute()
    )


def get_conversation(conversation_id: str):
    client = get_supabase_service_client()
    result = (
        client.table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .maybe_single()
        .execute()
    )
    return result.data


def get_user_conversations(user_id: str):
    client = get_supabase_service_client()
    result = (
        client.table("conversations")
        .select("id, created_at, updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data


def get_alerts(active_only: bool = True):
    client = get_supabase_service_client()
    query = client.table("alerts").select("*")
    if active_only:
        query = query.eq("active", True)
    return query.execute().data


# --- Stock cache helpers (for prefetched data) ---

def get_stock_cache(symbol: str) -> dict | None:
    """Get prefetched stock data from stock_cache table."""
    try:
        client = get_supabase_service_client()
        result = (
            client.table("stock_cache")
            .select("*")
            .eq("symbol", symbol.upper())
            .maybe_single()
            .execute()
        )
        return result.data if result is not None else None
    except Exception:
        logger.exception("Error fetching stock cache for %s", symbol)
        return None


def upsert_stock_cache(
    symbol: str,
    price_data: dict | None = None,
    info_data: dict | None = None,
    news_data: dict | None = None,
    recommendations_data: dict | None = None,
):
    """Upsert stock data into stock_cache table (used by n8n prefetch)."""
    try:
        client = get_supabase_service_client()
        data = {"symbol": symbol.upper()}
        if price_data is not None:
            data["price_data"] = price_data
        if info_data is not None:
            data["info_data"] = info_data
        if news_data is not None:
            data["news_data"] = news_data
        if recommendations_data is not None:
            data["recommendations_data"] = recommendations_data
        return client.table("stock_cache").upsert(data).execute()
    except Exception:
        logger.exception("Error upserting stock cache for %s", symbol)
        return None


# --- User helpers ---

def get_user_email(user_id: str) -> str | None:
    """Get user email by user_id from auth.users."""
    try:
        client = get_supabase_service_client()
        result = client.auth.admin.get_user_by_id(user_id)
        if result and result.user:
            return result.user.email
        return None
    except Exception:
        logger.exception("Error fetching user email for %s", user_id)
        return None


def get_user_device_tokens(user_id: str) -> list[str]:
    """Get FCM device tokens for a user (if stored)."""
    try:
        client = get_supabase_service_client()
        result = (
            client.table("user_device_tokens")
            .select("token")
            .eq("user_id", user_id)
            .execute()
        )
        return [r["token"] for r in (result.data or [])]
    except Exception:
        logger.exception("Error fetching device tokens for %s", user_id)
        return []
