from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


@database_sync_to_async
def get_user_from_token(token_key: str):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        token = AccessToken(token_key)
        user_id = token["user_id"]
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Извлекает JWT из query param ?token=<access_token>
    и кладёт user в scope.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = dict(qc.split("=") for qc in query_string.split("&") if "=" in qc)
        token = params.get("token", "")

        scope["user"] = await get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
