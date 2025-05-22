"""
Nexus Membership Key System (Python port)
Implements tiered membership key generation and validation logic.
"""
import hashlib
import string
import random
from datetime import datetime

USER_TIERS = {
    "ARCHIVIST": {
        "id": 1,
        "name": "Archivist",
        "separator": "-",
        "prefix": "ARK",
    },
    "ORCHESTRATOR": {
        "id": 2,
        "name": "Orchestrator",
        "separator": ":",
        "prefix": "ORC",
    },
    "GODFATHER": {
        "id": 3,
        "name": "Godfather",
        "separator": "∞",
        "prefix": "GOD",
    },
    "ENTITY": {
        "id": 4,
        "name": "Entity",
        "separator": "⟡",
        "prefix": "NXS",
    },
}

SPECIAL_CHARS = "!@#$%^&*~=-_+[]{}|;:,./<>?"


def create_user_hash(user_id):
    h = hashlib.sha256(user_id.encode()).hexdigest()
    return h[:6].upper()

def encode_tier(tier_id):
    return string.ascii_uppercase[tier_id - 1]

def encode_timestamp(date):
    year = date.year % 100
    month = date.month
    day = date.day
    return f"{year:02X}{month:X}{day:02X}"

def generate_unique_pattern(seed):
    random.seed(seed)
    chars = string.ascii_uppercase + string.digits
    pattern = ''
    for i in range(12):
        if i % 4 == 3:
            pattern += random.choice(SPECIAL_CHARS)
        else:
            pattern += random.choice(chars)
    return pattern

def generate_personal_element(user_attributes, user_id):
    if user_attributes and 'name' in user_attributes:
        parts = user_attributes['name'].split()
        return ''.join([p[0].upper() for p in parts[:2]])
    return create_user_hash(user_id)[:2]

def calculate_checksum(input_str):
    s = sum((ord(c) * (i + 1)) for i, c in enumerate(input_str))
    return f"{s % 36:X}{(s * 13) % 36:X}"

def format_key(segmentA, segmentB, segmentC, segmentD, personalElement, checksum, tier):
    return f"{segmentA}{tier['separator']}{segmentB}{tier['separator']}{segmentC}{tier['separator']}{segmentD}{personalElement}{tier['separator']}{checksum}"

def generate_membership_key(user_id, tier_name, registration_date, user_attributes=None):
    tier = USER_TIERS[tier_name.upper()]
    user_hash = create_user_hash(user_id)
    tier_identifier = encode_tier(tier['id'])
    time_signature = encode_timestamp(registration_date)
    unique_pattern = generate_unique_pattern(user_id + str(registration_date.timestamp()))
    segmentA = f"{tier['prefix']}{user_hash[:3]}"
    segmentB = f"{tier_identifier}{unique_pattern[:4]}"
    segmentC = f"{time_signature}"
    segmentD = f"{unique_pattern[4:8]}"
    personal_element = generate_personal_element(user_attributes, user_id)
    base_key = segmentA + segmentB + segmentC + segmentD + personal_element
    checksum = calculate_checksum(base_key)
    return format_key(segmentA, segmentB, segmentC, segmentD, personal_element, checksum, tier)

def validate_membership_key(membership_key):
    for name, tier in USER_TIERS.items():
        if membership_key.startswith(tier['prefix']) and tier['separator'] in membership_key:
            separator = tier['separator']
            break
    else:
        return {"valid": False, "error": "Unknown key format"}
    segments = membership_key.split(separator)
    if len(segments) != 5:
        return {"valid": False, "error": "Invalid key structure"}
    segmentA, segmentB, segmentC, segmentD_personal, checksum = segments
    segmentD = segmentD_personal[:-2]
    personal_element = segmentD_personal[-2:]
    reconstructed = segmentA + segmentB + segmentC + segmentD + personal_element
    calculated_checksum = calculate_checksum(reconstructed)
    if checksum != calculated_checksum:
        return {"valid": False, "error": "Invalid checksum"}
    tier_identifier = segmentB[0]
    extracted_tier_id = string.ascii_uppercase.index(tier_identifier) + 1
    if extracted_tier_id != tier['id']:
        return {"valid": False, "error": "Tier identifier mismatch"}
    user_hash_part = segmentA[3:]
    time_signature = segmentC
    try:
        year = int(time_signature[:2], 16) + 2000
        month = int(time_signature[2], 16)
        day = int(time_signature[3:], 16)
        registration_date = datetime(year, month, day)
    except Exception:
        registration_date = None
    user_id = f"user_{user_hash_part}"
    return {
        "valid": True,
        "user_id": user_id,
        "tier_name": name,
        "tier_level": tier['id'],
        "registration_date": registration_date,
        "personal_element": personal_element
    }