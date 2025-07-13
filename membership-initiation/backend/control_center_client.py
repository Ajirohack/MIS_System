"""
Control Center API Client
Handles communication with the Control Center API
"""
import httpx
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel
from config import settings

logger = logging.getLogger(__name__)

class ControlCenterClient:
    """Client for interacting with the Control Center API"""
    
    def __init__(self):
        self.base_url = settings.CONTROL_CENTER_API_URL
        self.api_key = settings.CONTROL_CENTER_API_KEY
        self.timeout = settings.HTTP_TIMEOUT or 10.0
        
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make an HTTP request to the Control Center API"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method == "GET":
                    response = await client.get(url, headers=headers, params=data)
                elif method == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers, json=data)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred: {e.response.status_code} - {e.response.text}")
            try:
                error_detail = e.response.json().get("error", str(e))
            except ValueError:
                error_detail = e.response.text or str(e)
            
            raise Exception(f"Control Center API error: {error_detail}")
        except httpx.RequestError as e:
            logger.error(f"Request error occurred: {str(e)}")
            raise Exception(f"Control Center connection error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise
    
    async def validate_membership_key(self, key: str) -> Dict[str, Any]:
        """Validate a membership key against the Control Center"""
        return await self._make_request(
            "POST",
            "/api/mis/memberships/validate",
            {"key": key}
        )
    
    async def validate_invitation(self, invitation_code: str, pin: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
        """Validate an invitation code against the Control Center"""
        data = {"invitationCode": invitation_code}
        if pin:
            data["pin"] = pin
        if email:
            data["email"] = email
            
        return await self._make_request(
            "POST",
            "/api/mis/invitations/validate",
            data
        )
    
    async def submit_onboarding(self, invitation_code: str, voice_consent: bool, responses: str, email: Optional[str] = None) -> Dict[str, Any]:
        """Submit onboarding information to Control Center"""
        data = {
            "invitationCode": invitation_code,
            "voiceConsent": voice_consent,
            "responses": responses
        }
        if email:
            data["email"] = email
            
        return await self._make_request(
            "POST",
            "/api/mis/onboarding",
            data
        )
    
    async def notify_membership_approved(self, invitation_code: str, membership_key: str, membership_code: str) -> Dict[str, Any]:
        """Notify Control Center of approved membership"""
        return await self._make_request(
            "POST",
            "/api/mis/memberships/approve/notify",
            {
                "invitationCode": invitation_code,
                "membershipKey": membership_key,
                "membershipCode": membership_code,
                "approved": True
            }
        )
    
    async def get_membership_status(self, email: str) -> Dict[str, Any]:
        """Get membership status from Control Center"""
        return await self._make_request(
            "GET",
            f"/api/mis/memberships/status/{email}",
            None
        )
        
    async def notify_invitation_created(self, code: str, pin: str, invited_name: str) -> Dict[str, Any]:
        """Notify Control Center of new invitation"""
        return await self._make_request(
            "POST",
            "/api/mis/invitations/sync",
            {
                "code": code,
                "pin": pin,
                "invitedName": invited_name,
                "status": "pending"
            }
        )

# Create singleton instance
control_center = ControlCenterClient()