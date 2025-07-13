"""
Membership Initiation System API
Main entry point for the MIS FastAPI application
"""
from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, HTTPBasic, HTTPBasicCredentials
from fastapi.responses import Response
import os
import logging
import secrets
from typing import Optional, Dict, Set, List, Union
from datetime import datetime
from dotenv import load_dotenv
from pydantic import AnyHttpUrl, SecretStr, Field, ConfigDict, field_validator
from pydantic_settings import BaseSettings
import weakref
import json
import asyncio
import uuid
import random
import string
import httpx
from utils.logging import setup_logging
import time
import re

# Initialize logging
setup_logging()
logger = logging.getLogger("api")

# Import our modules
from database import supabase
from models import (
    InvitationRequest, InvitationResponse,
    ValidateInvitationRequest, ValidateInvitationResponse,
    OnboardingRequest, OnboardingResponse,
    ApproveMembershipRequest, ApproveMembershipResponse,
    ValidateKeyRequest, ValidateKeyResponse,
    ChatRequest, ChatResponse,
    RegistrationRequest, RegistrationResponse,
    SetupRequest, SetupResponse,
    TelegramConnectRequest, TelegramConnectResponse
)
from middleware import TimingMiddleware, RateLimitMiddleware, RequestValidationMiddleware, SecurityMiddleware, CacheMiddleware
from control_center_client import control_center

class Settings(BaseSettings):
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = Field(default=3000, gt=0, lt=65536)
    DEBUG: bool = False
    
    # Security
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: SecretStr
    JWT_SECRET: SecretStr
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Database    
    POSTGRES_PASSWORD: SecretStr
    DATABASE_URL: Optional[str] = None  # Changed to Optional to accept the value being passed in environment
    SUPABASE_URL: AnyHttpUrl
    SUPABASE_KEY: SecretStr
    SUPABASE_SERVICE_KEY: SecretStr
    
    # Email Configuration
    SMTP_HOST: str
    SMTP_PORT: int = Field(default=587, gt=0, lt=65536)
    SMTP_USER: str
    SMTP_PASS: SecretStr
    
    # Site Configuration
    SITE_URL: AnyHttpUrl = Field(default="http://localhost:3000")
    
    # Authentication
    OPERATOR_TOKEN: SecretStr
    
    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=100, gt=0)
    RATE_LIMIT_BURST: int = Field(default=20, gt=0)
    RATE_LIMIT_WINDOW: int = Field(default=60, gt=0)
    
    # WebSocket settings
    WS_MAX_CONNECTIONS: int = Field(default=1000, gt=0)
    WS_PING_INTERVAL: int = Field(default=30, gt=0)
    
    # Cache settings
    CACHE_TTL: int = Field(default=300, gt=0)
    CACHE_MAX_ITEMS: int = Field(default=1000, gt=0)
    
    # HTTP Client settings
    HTTP_POOL_MAX_SIZE: int = Field(default=100, gt=0)
    HTTP_KEEPALIVE_EXPIRY: int = Field(default=300, gt=0)
    
    # Control Center integration
    CONTROL_CENTER_API_URL: str = Field(default="http://localhost:3001")
    CONTROL_CENTER_API_KEY: SecretStr = Field(default="")
    CONTROL_CENTER_INTEGRATION: bool = Field(default=True)
    
    @field_validator('ADMIN_USERNAME')
    @classmethod
    def username_must_be_valid(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError('Admin username must be at least 3 characters')
        return v
    
    @field_validator('ADMIN_PASSWORD')
    @classmethod
    def password_must_be_strong(cls, v: SecretStr) -> SecretStr:
        password = v.get_secret_value()
        if len(password) < 12:
            raise ValueError('Admin password must be at least 12 characters')
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(not c.isalnum() for c in password)
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError('Password must contain uppercase, lowercase, digit and special characters')
        return v
    
    @field_validator('JWT_SECRET')
    @classmethod
    def jwt_secret_must_be_strong(cls, v: SecretStr) -> SecretStr:
        secret = v.get_secret_value()
        if len(secret) < 32:
            raise ValueError('JWT secret must be at least 32 characters')
        return v

    @field_validator('SUPABASE_KEY', 'SUPABASE_SERVICE_KEY')
    @classmethod
    def validate_supabase_keys(cls, v: SecretStr) -> SecretStr:
        key = v.get_secret_value()
        if not key or key == 'your-supabase-key' or key == 'your-supabase-service-key':
            raise ValueError('Invalid Supabase key. Please set actual Supabase keys.')
        return v
    
    @field_validator('ALLOWED_ORIGINS')
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                origins = json.loads(v)
                if not isinstance(origins, list):
                    raise ValueError
                return origins
            except:
                raise ValueError('ALLOWED_ORIGINS must be a valid JSON array of URLs')
        return v

    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"  # Allow extra fields in the settings model
    )

# Initialize settings with validation
load_dotenv()
try:
    settings = Settings()
except Exception as e:
    logger = logging.getLogger("startup")
    logger.critical("Failed to load settings: %s", str(e))
    raise SystemExit(1)

# Initialize FastAPI with settings and Lifespan
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup
    setup_logging()
    logger.info("Starting up MIS API")
    await supabase.startup()  # Initialize the Supabase client pool
    
    yield
    
    # Cleanup
    logger.info("Shutting down MIS API")
    await supabase.shutdown()  # Gracefully shutdown the Supabase client pool

app = FastAPI(
    title="SpaceWH Membership Initiation System API",
    debug=settings.DEBUG,
    lifespan=lifespan
)

# Add security middleware first (important for headers)
app.add_middleware(SecurityMiddleware)

# Configure CORS with validated origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request validation middleware
app.add_middleware(RequestValidationMiddleware)

# Add timing middleware
app.add_middleware(TimingMiddleware)

# Add rate limiting middleware (adjust limits as needed)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.RATE_LIMIT_REQUESTS_PER_MINUTE, burst_limit=settings.RATE_LIMIT_BURST)

# Add caching middleware
app.add_middleware(CacheMiddleware)

@app.middleware("http")
async def csp_headers(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; worker-src blob:;"
    )
    return response

# Security scheme
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Validate membership key in Authorization header"""
    if not credentials:
        return None
    
    key = credentials.credentials
    try:
        # First check locally
        user_data = await supabase.validate_key(key)
        
        # If enabled, also check with Control Center
        if settings.CONTROL_CENTER_INTEGRATION and not user_data.get("valid", False):
            try:
                control_center_result = await control_center.validate_membership_key(key)
                if control_center_result.get("valid"):
                    # Update local data with Control Center result
                    user_data = control_center_result
            except Exception as cc_error:
                logger.warning(f"Control Center validation failed: {str(cc_error)}")
                # Fall back to local validation result
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Validation failed")
    if not user_data:
        return None
        
    return user_data

# Basic Auth for Admin endpoints (replace with a more robust system in production)
security_admin = HTTPBasic()
ADMIN_USERNAME = settings.ADMIN_USERNAME
ADMIN_PASSWORD = settings.ADMIN_PASSWORD.get_secret_value()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security_admin)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        logger.warning("Unauthorized attempt to access admin endpoint.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    logger.info(f"Admin user '{credentials.username}' authenticated.")
    return credentials.username

@app.get("/")
async def root():
    """Root endpoint - API welcome message"""
    logger.info("Root endpoint accessed")
    return {"message": "SpaceWH Membership Initiation API is running."}

# CHECKPOINT: 2025-04-20 – Before healthcheck fixes
@app.get("/health")
async def health_check():
    """Health check endpoint for container and service health monitoring"""
    logger.info("Health check endpoint accessed")
    start_time = time.time()
    
    # Always return components that are checked
    health_response = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {
            "api": {"status": "healthy"},
            "database": {"status": "unknown"},
            "control_center": {"status": "unknown"}
        },
        "uptime": 0
    }
    
    try:
        # Test database connectivity with timeout
        db_start = time.time()
        try:
            # Use a shorter timeout for health checks
            await asyncio.wait_for(
                supabase.query("memberships", "GET", {"limit": "1"}),
                timeout=5.0  # 5 second timeout
            )
            db_time = time.time() - db_start
            health_response["checks"]["database"] = {"status": "connected", "latency_ms": round(db_time * 1000, 2)}
        except asyncio.TimeoutError:
            health_response["checks"]["database"] = {"status": "timeout", "error": "Database query timed out"}
            # Set overall status to degraded but don't fail completely
            health_response["status"] = "degraded"
        except Exception as db_error:
            health_response["checks"]["database"] = {"status": "error", "error": str(db_error)}
            # Set overall status to degraded but don't fail completely
            health_response["status"] = "degraded"
        
        # Test Control Center connectivity if integration is enabled
        if settings.CONTROL_CENTER_INTEGRATION:
            cc_start = time.time()
            try:
                # Use a shorter timeout for health checks
                await asyncio.wait_for(
                    control_center.validate_membership_key("test"),
                    timeout=3.0  # 3 second timeout
                )
                cc_time = time.time() - cc_start
                health_response["checks"]["control_center"] = {"status": "connected", "latency_ms": round(cc_time * 1000, 2)}
            except asyncio.TimeoutError:
                health_response["checks"]["control_center"] = {"status": "timeout", "error": "Control Center query timed out"}
                # Don't mark overall status as degraded since Control Center is a secondary system
            except Exception as cc_error:
                health_response["checks"]["control_center"] = {"status": "error", "error": str(cc_error)}
                # Don't mark overall status as degraded
            
        # Calculate total process time
        process_time = time.time() - start_time
        health_response["uptime"] = process_time
        
        # Return 200 OK even with degraded status to prevent container restarts
        # Docker health checks look for non-200 status codes
        return health_response

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Add safe_post_to_supabase and safe_get_from_supabase functions for error handling
async def safe_post_to_supabase(endpoint: str, data: dict):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.SUPABASE_URL}/{endpoint}",
                headers={
                    "apikey": settings.SUPABASE_KEY.get_secret_value(),
                    "Authorization": f"Bearer {settings.SUPABASE_KEY.get_secret_value()}",
                    "Content-Type": "application/json"
                },
                json=data
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        logger.error(f"Supabase POST error: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(exc)}")

async def safe_get_from_supabase(endpoint: str, params: dict):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/{endpoint}",
                headers={
                    "apikey": settings.SUPABASE_KEY.get_secret_value(),
                    "Authorization": f"Bearer {settings.SUPABASE_KEY.get_secret_value()}"
                },
                params=params
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        logger.error(f"Supabase GET error: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(exc)}")

@app.post("/admin/create-invitation", response_model=InvitationResponse)
async def create_invitation(request: InvitationRequest, admin_user: str = Depends(verify_admin)):
    logger.info(f"Admin '{admin_user}' creating invitation for {request.invited_name}")
    code = ''.join(random.choices(string.ascii_letters + string.digits, k=18))
    pin = ''.join(random.choices(string.digits, k=4))
    data = {
        "code": code,
        "pin": pin,
        "invited_name": request.invited_name,
        "status": "pending"
    }
    
    # Create invitation in local database
    await safe_post_to_supabase("rest/v1/invitations", data)
    
    # If Control Center integration is enabled, sync the invitation
    if settings.CONTROL_CENTER_INTEGRATION:
        try:
            # Notify Control Center about the invitation
            await control_center.notify_invitation_created(code, pin, request.invited_name)
            logger.info(f"Invitation {code} synced with Control Center")
        except Exception as e:
            logger.warning(f"Failed to sync invitation with Control Center: {str(e)}")
            # Continue anyway - Control Center sync is non-critical
    
    return {"code": code, "pin": pin, "invited_name": request.invited_name}

@app.post("/validate-invitation", response_model=ValidateInvitationResponse)
async def validate_invitation(request: ValidateInvitationRequest):
    logger.info(f"Validating invitation code: {request.code}")
    params = {
        "code": f"eq.{request.code}",
        "pin": f"eq.{request.pin}",
        "status": "eq.pending"
    }
    results = await safe_get_from_supabase("rest/v1/invitations", params)
    
    # First check local database
    is_valid = bool(results)
    
    # If Control Center integration is enabled and not found locally, check there too
    if not is_valid and settings.CONTROL_CENTER_INTEGRATION:
        try:
            cc_result = await control_center.validate_invitation(request.code, request.pin)
            is_valid = cc_result.get("valid", False)
        except Exception as e:
            logger.warning(f"Failed to validate invitation with Control Center: {str(e)}")
            # Fall back to local validation result
    
    if not is_valid:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
        
    return {"valid": True, "code": request.code}

@app.post("/submit-onboarding", response_model=OnboardingResponse)
async def submit_onboarding(request: OnboardingRequest):
    logger.info(f"Submitting onboarding for code: {request.code}")
    invitation = await safe_get_from_supabase("rest/v1/invitations", {"code": f"eq.{request.code}"})
    if not invitation:
        # If not found locally, check Control Center if integration is enabled
        if settings.CONTROL_CENTER_INTEGRATION:
            try:
                cc_invitation = await control_center.validate_invitation(request.code)
                if cc_invitation.get("valid", False):
                    invitation = [cc_invitation]
            except Exception as e:
                logger.warning(f"Failed to validate invitation with Control Center: {str(e)}")
        
        # If still not found, return error
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
    
    onboarding_data = {
        "invitation_code": request.code,
        "voice_consent": request.voice_consent,
        "responses": request.responses
    }
    
    # Save onboarding in local database
    await safe_post_to_supabase("rest/v1/onboarding", onboarding_data)
    
    # If Control Center integration is enabled, submit there too
    if settings.CONTROL_CENTER_INTEGRATION:
        try:
            await control_center.submit_onboarding(
                request.code, 
                request.voice_consent, 
                request.responses
            )
            logger.info(f"Onboarding for {request.code} synced with Control Center")
        except Exception as e:
            logger.warning(f"Failed to sync onboarding with Control Center: {str(e)}")
            # Continue anyway - Control Center sync is non-critical
    
    return {"status": "submitted", "code": request.code}

@app.post("/admin/approve-membership", response_model=ApproveMembershipResponse)
async def approve_membership(request: ApproveMembershipRequest, admin_user: str = Depends(verify_admin)):
    logger.info(f"[APPROVE] Admin '{admin_user}' attempting approval for invitation_code={request.invitation_code}, user_name={getattr(request, 'user_name', None)}")
    # 0. Replay prevention: check if membership already exists for this invitation_code
    existing_membership = await safe_get_from_supabase(
        "rest/v1/memberships",
        {"invitation_code": f"eq.{request.invitation_code}", "active": "eq.true"}
    )
    if existing_membership:
        logger.warning(f"[REPLAY BLOCK] Membership already exists for invitation_code={request.invitation_code}")
        raise HTTPException(status_code=409, detail="Membership already exists for this invitation code.")
    # 1. Fetch invitation and check onboarding status
    invitation = await safe_get_from_supabase(
        "rest/v1/invitations",
        {"code": f"eq.{request.invitation_code}", "select": "*"}
    )
    if not invitation:
        logger.error(f"[NOT FOUND] Invitation not found for invitation_code={request.invitation_code}")
        raise HTTPException(status_code=404, detail="Invitation not found.")
    inv = invitation[0]
    if inv.get("status") != "onboarded":
        logger.warning(f"[NOT ONBOARDED] Invitation_code={request.invitation_code} status={inv.get('status')}")
        raise HTTPException(status_code=400, detail="Invitation not onboarded yet.")
    user_name = getattr(request, "user_name", inv.get("invited_name", ""))
    # 2. Generate secure membership code and key
    import secrets
    from datetime import datetime
    membership_code = f"MEMBER-{secrets.token_hex(3).upper()}"
    timestamp = int(datetime.utcnow().timestamp())
    membership_key = f"{membership_code}-{timestamp}"
    logger.info(f"[KEY GEN] Issuing membership_key={membership_key} for invitation_code={request.invitation_code}, user_name={user_name}")
    # 3. Insert membership record
    payload = {
        "invitation_code": request.invitation_code,
        "membership_code": membership_code,
        "membership_key": membership_key,
        "issued_to": user_name,
        "active": True,
        "issued_at": datetime.utcnow().isoformat()
    }
    insert_result = await safe_post_to_supabase(
        "rest/v1/memberships",
        payload
    )
    if not insert_result:
        logger.error(f"[DB ERROR] Failed to save membership for invitation_code={request.invitation_code}, user_name={user_name}")
        raise HTTPException(status_code=500, detail="Error saving membership record.")
    
    # 4. Notify Control Center if integration is enabled
    if settings.CONTROL_CENTER_INTEGRATION:
        try:
            await control_center.notify_membership_approved(
                request.invitation_code,
                membership_key,
                membership_code
            )
            logger.info(f"[CONTROL CENTER] Notified about approved membership for {request.invitation_code}")
        except Exception as e:
            logger.warning(f"[CONTROL CENTER] Failed to notify about approved membership: {str(e)}")
            # Continue anyway - Control Center sync is non-critical
    
    logger.info(f"[APPROVED] Membership approved for invitation_code={request.invitation_code}, user_name={user_name}")
    return {
        "success": True,
        "message": "Membership approved.",
        "membership_key": membership_key,
        "membership_code": membership_code
    }

@app.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_key(request: ValidateKeyRequest):
    logger.info("Validating membership key")
    
    # First check local database
    params = {
        "membership_key": f"eq.{request.key}",
        "active": "eq.true"
    }
    results = await safe_get_from_supabase("rest/v1/memberships", params)
    
    is_valid = bool(results)
    user_name = results[0]["issued_to"] if results else None
    
    # If Control Center integration is enabled and not found locally, check there too
    if (not is_valid or not user_name) and settings.CONTROL_CENTER_INTEGRATION:
        try:
            cc_result = await control_center.validate_membership_key(request.key)
            if cc_result.get("valid", False):
                is_valid = True
                user_name = cc_result.get("user_name", user_name)
        except Exception as e:
            logger.warning(f"Failed to validate membership key with Control Center: {str(e)}")
            # Fall back to local validation result
    
    if not is_valid:
        raise HTTPException(status_code=404, detail="Invalid membership key")
        
    return {"valid": True, "key": request.key, "user_name": user_name}

@app.post("/gpt-chat", response_model=ChatResponse)
async def gpt_chat(
    request: ChatRequest,
    user_data: Optional[dict] = Depends(get_current_user)
):
    """Send a chat message to the AI assistant"""
    logger.info("Received chat request")
    try:
        import random
        
        if user_data:
            user_name = user_data["user_name"]
            logger.info(f"Authenticated chat request from {user_name}")
            responses = [
                f"Hello {user_name}, I'm SpaceWH AI. How can I assist you today?",
                f"Thanks for your question, {user_name}. Let me think about it...",
                f"Based on my knowledge, {user_name}, I would recommend the following approach...",
                f"I'd need more information to answer that fully, {user_name}. Can you provide more details?",
                f"That's an interesting query, {user_name}, but it's beyond my current capabilities."
            ]
        else:
            logger.info("Unauthenticated chat request")
            responses = [
                "I'm SpaceWH AI. How can I assist you today?",
                "That's an interesting question. Let me think about it...",
                "Based on my knowledge, I would recommend the following approach...",
                "I don't have enough information to answer that fully. Can you provide more details?",
                "That's beyond my current capabilities, but I'm constantly learning."
            ]
        
        response = random.choice(responses)
        logger.info("Chat response generated")
        return {"response": response}
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate chat response: {str(e)}")

@app.get("/admin/invitations", dependencies=[Depends(verify_admin)])
async def get_invitations(admin_user: str = Depends(verify_admin)):
    """Get all invitations (Admin only)"""
    logger.info(f"Admin '{admin_user}' getting all invitations")
    try:
        invitations = await supabase.query("invitations", "GET")
        return {"success": True, "data": invitations}
    except Exception as e:
        logger.error(f"Error getting invitations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get invitations: {str(e)}")

@app.get("/admin/memberships", dependencies=[Depends(verify_admin)])
async def get_memberships(admin_user: str = Depends(verify_admin)):
    """Get all memberships (Admin only)"""
    logger.info(f"Admin '{admin_user}' getting all memberships")
    try:
        memberships = await supabase.query("memberships", "GET")
        return {"success": True, "data": memberships}
    except Exception as e:
        logger.error(f"Error getting memberships: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get memberships: {str(e)}")

# --- Membership Key & QR Code Endpoints Integration ---
from utils.membership_key_system import generate_membership_key, validate_membership_key
from utils.qr_code_generator import generate_premium_qr_code

from fastapi import Body

@app.post("/api/generate-membership-key")
async def api_generate_membership_key(
    user_id: str = Body(...),
    tier_name: str = Body(...),
    registration_date: str = Body(...),
    user_attributes: dict = Body(default={})
):
    """Generate a premium membership key using advanced logic"""
    from datetime import datetime
    try:
        reg_date = datetime.fromisoformat(registration_date)
        key = generate_membership_key(user_id, tier_name, reg_date, user_attributes)
        return {"membership_key": key}
    except Exception as e:
        logger.error(f"Membership key generation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/validate-membership-key")
async def api_validate_membership_key(
    membership_key: str = Body(...)
):
    """Validate a premium membership key using advanced logic"""
    result = validate_membership_key(membership_key)
    return result

@app.post("/api/generate-premium-qr-code")
async def api_generate_premium_qr_code(
    membership_key: str = Body(...),
    user_data: dict = Body(default={})
):
    """Generate premium QR code data for a membership key"""
    result = generate_premium_qr_code(membership_key, user_data)
    return result

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Use weak references for automatic cleanup
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        async with self._lock:
            self.active_connections[client_id] = websocket
        logger.info(f"WebSocket client {client_id} connected. Active connections: {len(self.active_connections)}")
        
    async def disconnect(self, client_id: str):
        async with self._lock:
            if client_id in self.active_connections:
                del self.active_connections[client_id]
                logger.info(f"WebSocket client {client_id} disconnected. Active connections: {len(self.active_connections)}")
        
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to client {client_id}: {str(e)}")
                await self.disconnect(client_id)
                
    async def broadcast(self, message: str, exclude: Optional[str] = None):
        # Remove stale connections and send message
        async with self._lock:
            for client_id, connection in list(self.active_connections.items()):
                if client_id != exclude:
                    try:
                        await connection.send_text(message)
                    except Exception as e:
                        logger.error(f"Error broadcasting to client {client_id}: {str(e)}")
                        await self.disconnect(client_id)

manager = ConnectionManager()

# Add WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = str(uuid.uuid4())
    auth_token = None
    
    try:
        await manager.connect(websocket, client_id)
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle authentication
                if message.get("type") == "auth":
                    token = message.get("payload", {}).get("token")
                    if token:
                        user_data = await supabase.validate_key(token)
                        if user_data and user_data.get("valid"):
                            auth_token = token
                            await manager.send_personal_message(
                                json.dumps({
                                    "type": "auth_success",
                                    "payload": {
                                        "user_name": user_data["user_name"]
                                    }
                                }),
                                client_id
                            )
                            continue
                    
                    # Auth failed
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "auth_failed",
                            "payload": {
                                "error": "Invalid authentication token"
                            }
                        }),
                        client_id
                    )
                    continue
                
                # Handle chat messages (requires auth)
                if message.get("type") == "chat_message":
                    if not auth_token:
                        await manager.send_personal_message(
                            json.dumps({
                                "type": "error",
                                "payload": {
                                    "error": "Authentication required"
                                }
                            }),
                            client_id
                        )
                        continue
                    
                    content = message.get("payload", {}).get("content")
                    if content:
                        # Process chat message
                        response = await process_chat_message(content, auth_token)
                        await manager.send_personal_message(
                            json.dumps({
                                "type": "chat_response",
                                "payload": response
                            }),
                            client_id
                        )
                
                # Log any other message types
                else:
                    logger.debug(f"Received WebSocket message from {client_id}: {data}")
                
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "error",
                        "payload": {
                            "error": "Invalid message format"
                        }
                    }),
                    client_id
                )
                
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        await manager.disconnect(client_id)

async def process_chat_message(content: str, auth_token: str) -> dict:
    """Process a chat message and return the response"""
    try:
        user_data = await supabase.validate_key(auth_token)
        if not user_data or not user_data.get("valid"):
            return {
                "error": "Invalid authentication token"
            }
        
        # Use the existing chat endpoint logic
        chat_request = ChatRequest(prompt=content)
        response = await gpt_chat(chat_request, user_data)
        return {
            "content": response.response
        }
        
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        return {
            "error": "Failed to process message"
        }

# New endpoint for user registration with audio
@app.post("/api/register", response_model=RegistrationResponse)
async def register_user(
    fullName: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    inviteCode: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None)
):
    """Register a new user with optional audio introduction"""
    logger.info(f"Registration request for {email}")
    
    try:
        # Validate the input fields manually since we're using Form data
        if len(fullName) < 2 or len(fullName) > 100:
            raise HTTPException(status_code=400, detail="Full name must be between 2 and 100 characters")
            
        email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(email_pattern, email):
            raise HTTPException(status_code=400, detail="Invalid email format")
            
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
            
        # Process invite code if provided
        if inviteCode:
            # Verify invitation code is valid
            invite_results = await safe_get_from_supabase(
                "rest/v1/invitations", 
                {"code": f"eq.{inviteCode}", "status": "eq.pending"}
            )
            if not invite_results:
                raise HTTPException(status_code=400, detail="Invalid or used invitation code")

        # Hash the password before storage
        import bcrypt
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        # Prepare user data for storage
        user_data = {
            "full_name": fullName,
            "email": email,
            "password_hash": hashed_password,
            "invitation_code": inviteCode,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Insert the user into the database
        user_result = await safe_post_to_supabase(
            "rest/v1/users",
            user_data
        )
        
        # Get the newly created user ID
        user_id = None
        if user_result:
            users = await safe_get_from_supabase(
                "rest/v1/users",
                {"email": f"eq.{email}"}
            )
            if users:
                user_id = users[0].get("id")
        
        # Process audio file if provided
        if audio and user_id:
            audio_content = await audio.read()
            if len(audio_content) > 0:
                # Generate unique filename
                audio_filename = f"{user_id}_{uuid.uuid4()}.wav"
                
                # Save audio file to storage bucket
                storage_path = f"audio_introductions/{audio_filename}"
                
                # Use Supabase storage API to upload file
                import base64
                import httpx
                
                # Create unique audio storage URL
                audio_url = f"{settings.SUPABASE_URL}/storage/v1/object/audio_introductions/{audio_filename}"
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{settings.SUPABASE_URL}/storage/v1/object/audio_introductions/{audio_filename}",
                        headers={
                            "apikey": settings.SUPABASE_KEY.get_secret_value(),
                            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY.get_secret_value()}",
                            "Content-Type": "audio/wav"
                        },
                        content=audio_content
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"Failed to upload audio: {response.text}")
                    else:
                        # Update user record with audio file reference
                        await safe_post_to_supabase(
                            f"rest/v1/users?id=eq.{user_id}",
                            {"audio_introduction": audio_url}
                        )
        
        # Update invitation status if provided
        if inviteCode:
            await safe_post_to_supabase(
                f"rest/v1/invitations?code=eq.{inviteCode}",
                {"status": "used"}
            )
        
        return {
            "success": True,
            "message": "Registration successful",
            "userId": user_id
        }
        
    except HTTPException as http_ex:
        logger.error(f"Registration validation error: {http_ex.detail}")
        raise
    except Exception as ex:
        logger.error(f"Registration error: {str(ex)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(ex)}")

# New endpoint for user setup and tool configuration
@app.post("/api/setup", response_model=SetupResponse)
async def setup_user_preferences(
    request: SetupRequest,
    user_data: Optional[dict] = Depends(get_current_user)
):
    """Save user setup preferences and tool configurations"""
    logger.info("Processing user setup request")
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        user_id = user_data.get("id")
        
        # Verify membership key
        membership_key = request.membershipKey
        membership_results = await safe_get_from_supabase(
            "rest/v1/memberships",
            {"membership_key": f"eq.{membership_key}", "active": "eq.true"}
        )
        
        if not membership_results:
            raise HTTPException(status_code=400, detail="Invalid membership key")
        
        # Save tool preferences
        tool_data = {
            "user_id": user_id,
            "educator_enabled": request.tools.educator,
            "planner_enabled": request.tools.planner,
            "rag_enabled": request.tools.rag,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Check if user preferences already exist
        existing_prefs = await safe_get_from_supabase(
            "rest/v1/user_preferences",
            {"user_id": f"eq.{user_id}"}
        )
        
        if existing_prefs:
            # Update existing preferences
            await safe_post_to_supabase(
                f"rest/v1/user_preferences?user_id=eq.{user_id}",
                tool_data
            )
        else:
            # Create new preferences
            await safe_post_to_supabase(
                "rest/v1/user_preferences",
                tool_data
            )
        
        return {
            "success": True,
            "message": "Setup completed successfully"
        }
        
    except HTTPException as http_ex:
        logger.error(f"Setup validation error: {http_ex.detail}")
        raise
    except Exception as ex:
        logger.error(f"Setup error: {str(ex)}")
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(ex)}")

# New endpoint for Telegram bot connection
@app.post("/api/telegram/connect", response_model=TelegramConnectResponse)
async def connect_telegram_bot(
    request: TelegramConnectRequest,
    user_data: Optional[dict] = Depends(get_current_user)
):
    """Connect a Telegram bot to the user's account"""
    logger.info("Processing Telegram bot connection request")
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        user_id = user_data.get("id")
        
        # Validate the Telegram bot token by making a test API call
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.telegram.org/bot{request.botToken}/getMe"
            )
            
            if response.status_code != 200:
                logger.error(f"Invalid Telegram bot token: {response.text}")
                raise HTTPException(status_code=400, detail="Invalid Telegram bot token")
            
            bot_info = response.json()
            
        # Send a test message to the chat to verify chat ID
        async with httpx.AsyncClient() as client:
            msg_response = await client.post(
                f"https://api.telegram.org/bot{request.botToken}/sendMessage",
                json={
                    "chat_id": request.chatId,
                    "text": "🚀 Your SpaceWH membership system is now connected to this Telegram chat! You will receive notifications here."
                }
            )
            
            if msg_response.status_code != 200:
                logger.error(f"Failed to send message to chat: {msg_response.text}")
                raise HTTPException(status_code=400, detail="Invalid chat ID or bot doesn't have access to the chat")
        
        # Store the Telegram connection info
        telegram_data = {
            "user_id": user_id,
            "bot_token": request.botToken,
            "chat_id": request.chatId,
            "bot_username": bot_info.get("result", {}).get("username"),
            "created_at": datetime.utcnow().isoformat(),
            "is_active": True
        }
        
        # Check if a connection already exists for this user
        existing_connections = await safe_get_from_supabase(
            "rest/v1/telegram_connections",
            {"user_id": f"eq.{user_id}"}
        )
        
        if existing_connections:
            # Update existing connection
            await safe_post_to_supabase(
                f"rest/v1/telegram_connections?user_id=eq.{user_id}",
                telegram_data
            )
        else:
            # Create new connection
            await safe_post_to_supabase(
                "rest/v1/telegram_connections",
                telegram_data
            )
        
        return {
            "success": True,
            "message": "Telegram bot connected successfully"
        }
        
    except HTTPException as http_ex:
        logger.error(f"Telegram connection validation error: {http_ex.detail}")
        raise
    except Exception as ex:
        logger.error(f"Telegram connection error: {str(ex)}")
        raise HTTPException(status_code=500, detail=f"Telegram connection failed: {str(ex)}")
