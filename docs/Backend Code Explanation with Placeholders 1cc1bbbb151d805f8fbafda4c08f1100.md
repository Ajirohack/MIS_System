# Backend Code Explanation with Placeholders

---

### **1. `main.py`**

- **Imports**
    - `fastapi`, `HTTPException`: Build API and handle errors.
    - `httpx`: Make HTTP requests to Supabase REST API.
    - `os`: Access environment variables for Supabase config.
    - `random`, `string`: Generate invitation codes and keys.

---

### **2. Environment Variables**

```python
SUPABASE_URL = os.getenv("SUPABASE_URL")  # Placeholder for Supabase REST URL
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Placeholder for Supabase API key

```

---

### **3. FastAPI App**

```python
app = FastAPI(title="Membership Initiation System")

```

---

### **4. Root Endpoint**

```python
@app.get("/")
async def root():
    return {"message": "SpaceWH Membership Initiation API is running."}

```

---

### **5. Create Invitation**

```python
@app.post("/admin/create-invitation")
async def create_invitation(invited_name: str):
    # Generate invitation code and pin
    code = ''.join(random.choices(string.ascii_letters + string.digits, k=18))
    pin = ''.join(random.choices(string.digits, k=4))

    # Insert into Supabase
    # Placeholder: POST request to /rest/v1/invitations with code, pin, invited_name
    ...

```

---

### **6. Validate Invitation**

```python
@app.post("/validate-invitation")
async def validate_invitation(code: str, pin: str):
    # Query Supabase for invitation with matching code and pin, status 'pending'
    # Placeholder: GET request with filters
    ...
    # If found, mark as used
    ...

```

---

### **7. Submit Onboarding**

```python
@app.post("/submit-onboarding")
async def submit_onboarding(code: str, voice_consent: bool, responses: str):
    # Query invitation by code
    ...
    # Insert onboarding data linked to invitation_id
    ...
    # Mark invitation as used
    ...

```

---

### **8. Approve Membership**

```python
@app.post("/admin/approve-membership")
async def approve_membership(invitation_code: str, user_name: str):
    # Query invitation by code
    ...
    # Generate membership_code and membership_key
    ...
    # Insert into memberships
    ...

```

---

### **9. Validate Key**

```python
@app.post("/validate-key")
async def validate_key(key: str):
    # Query membership by key and active status
    ...

```

---

### Next: Frontend Design & Beautification

- We will **analyze your React frontend structure**.
- Add **UI components** with placeholders matching API endpoints.
- Improve **layout, styles, and user flow**.

---

This completes the backend explanation. Ready to proceed with frontend UI planning and enhancement.