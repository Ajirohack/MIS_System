"""
Nexus Premium QR Code Generator (Python port)
Implements tier-specific QR code data logic for membership keys.
"""
from .membership_key_system import validate_membership_key

def generate_premium_qr_code(membership_key, user_data=None):
    validation = validate_membership_key(membership_key)
    if not validation["valid"]:
        return {"success": False, "error": "Invalid membership key", "details": validation.get("error")}
    tier_name = validation["tier_name"]
    tier_level = validation["tier_level"]
    user_id = validation["user_id"]
    # Base QR code data
    qr_data = {
        "membershipKey": membership_key,
        "validationURL": f"https://nexus.io/validate/{membership_key}",
        "tier": tier_name
    }
    # Visual parameters (simplified for backend)
    visual_style = {
        "style": tier_name.lower(),
        "mainColor": _get_tier_color(tier_name),
        "patternComplexity": min(tier_level * 2, 10),
        "tierLevel": tier_level
    }
    return {
        "success": True,
        "qrCodeData": qr_data,
        "visualParameters": visual_style,
        "tierName": tier_name,
        "tierLevel": tier_level
    }

def _get_tier_color(tier_name):
    color_map = {
        "ARCHIVIST": "#3A86FF",
        "ORCHESTRATOR": "#8338EC",
        "GODFATHER": "#FF006E",
        "ENTITY": "#FFBE0B"
    }
    return color_map.get(tier_name, "#10b981")