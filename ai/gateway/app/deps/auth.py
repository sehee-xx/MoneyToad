"""
Authentication and authorization dependencies
"""
from typing import Literal, Optional
from fastapi import Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Role type definition
Role = Literal["admin", "user"]

# Optional: Bearer token security scheme for Swagger UI
security = HTTPBearer(auto_error=False)


async def get_current_role(
    x_role: Optional[str] = Header(None, alias="X-Role"),
    authorization: Optional[HTTPAuthorizationCredentials] = None
) -> Role:
    """
    Get current user role from headers.
    
    In production mode (AUTH_ENABLED=True):
    - Decode JWT token from Authorization header
    - Extract role from token claims
    
    In development mode (AUTH_ENABLED=False):
    - Use X-Role header for quick testing
    - Default to "user" if not provided
    
    Args:
        x_role: Role header for development mode
        authorization: Bearer token for production mode
    
    Returns:
        Role: Either "admin" or "user"
    
    Raises:
        HTTPException: If authentication fails in production mode
    """
    
    if settings.AUTH_ENABLED:
        # Production mode: Use JWT authentication
        if not authorization or not authorization.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            # Decode JWT token
            if not settings.JWT_SECRET_KEY:
                logger.error("JWT_SECRET_KEY not configured")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication not properly configured"
                )
            
            payload = jwt.decode(
                authorization.credentials,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Extract role from token
            role = payload.get("role", "user")
            if role not in ["admin", "user"]:
                role = "user"
            
            return role
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Development mode: Use X-Role header
        if x_role and x_role.lower() in ["admin", "user"]:
            return x_role.lower()
        return "user"  # Default role


async def require_admin(role: Role = get_current_role) -> Role:
    """
    Dependency to require admin role.
    
    Use this dependency on endpoints that require admin privileges.
    
    Args:
        role: Current user role from get_current_role
    
    Returns:
        Role: The admin role
    
    Raises:
        HTTPException: If user is not an admin (403 Forbidden)
    """
    if role != "admin":
        logger.warning(f"Access denied: User with role '{role}' attempted to access admin endpoint")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return role


async def require_user(role: Role = get_current_role) -> Role:
    """
    Dependency to require at least user role.
    
    This allows both 'user' and 'admin' roles.
    Use this for endpoints accessible to all authenticated users.
    
    Args:
        role: Current user role from get_current_role
    
    Returns:
        Role: The current role
    """
    # Both admin and user roles are allowed
    return role


# Helper function to generate JWT tokens (for testing/development)
def create_access_token(role: Role, user_id: Optional[str] = None) -> str:
    """
    Create a JWT access token (mainly for testing).
    
    Args:
        role: User role to encode in token
        user_id: Optional user identifier
    
    Returns:
        str: Encoded JWT token
    
    Note:
        This is mainly for development/testing. 
        In production, tokens should be issued by a proper auth service.
    """
    if not settings.JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY not configured")
    
    payload = {
        "role": role,
        "sub": user_id or f"{role}_user",
    }
    
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )