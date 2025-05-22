# MIS Dev Stage

---

# **Phase 1 Instructions**

### **Development Steps**

Here’s a structured plan to develop the **Membership Initiation System (MIS)** for **Space WH**, following the requirements and phases outlined in your documentation. This plan ensures clarity, security, and alignment with the project’s goals.

---

### **1. Project Objectives**

- Create a secure, AI-driven membership registration system for Space WH.
- Ensure **exclusive access** via invitation codes, PINs, and multi-factor authentication (MFA).
- Enable **voice/text-based onboarding** with AI verification.
- Provide an admin interface for code generation, user review, and approval.

---

### **2. Development Phases**

### **Phase 1: Core Functionality (2-3 Weeks)**

**Deliverables:**

- **User Interface (UI):**
    - **Invitation Code Entry:** A simple form for users to input their invitation code and PIN.
    - **AI-Assisted Onboarding:**
        - Voice/text input for name verification.
        - Policy explanation via AI (text-to-speech/speech-to-text).
        - Consent confirmation (voice/text).
    - **Blurred Content Lock:** Hide onboarding steps until PIN is validated.
- **Admin Interface (Basic):**
    - Generate invitation codes with names/PINs.
    - Review user submissions (basic dashboard).
    - Approve/reject applications and issue membership codes.

**Tech Stack:**

- **Frontend:** HTML/CSS/JavaScript (existing code) + Voice API (e.g., Web Speech API).
- **Backend:** Node.js/Express.js (or Python Flask) for API endpoints.
- **Database:** MySQL/MongoDB to store invitation codes, user data, and membership keys.

---

### **Phase 2: Enhanced Security & Features (1-2 Weeks)**

**Deliverables:**

- **Multi-Factor Authentication (MFA):**
    - Integrate 2FA (e.g., Google Authenticator or SMS).
    - Add biometric verification (optional).
- **Voice Authentication:**
    - Use a speech-to-text API (e.g., Google Cloud Speech-to-Text, AWS Transcribe).
    - Store voice samples securely for future verification.
- **Admin Dashboard Enhancements:**
    - Real-time analytics for user submissions.
    - Bulk code generation and export/import features.
    - Audit logs for all admin actions.

**Tech Stack:**

- **APIs:** Google Cloud Speech-to-Text, AWS Rekognition (for voice/biometrics).
- **Security:** HTTPS, encryption for sensitive data (e.g., AES-256), rate-limiting.

---

### **Phase 3: Final Testing & Deployment (1 Week)**

**Deliverables:**

- **Security Audits:**
    - Penetration testing for vulnerabilities.
    - Compliance checks (GDPR, CCPA, etc.).
- **User Acceptance Testing (UAT):**
    - Test end-to-end workflow with beta users.
    - Fix bugs and UX issues.
- **Deployment:**
    - Host on a secure cloud platform (AWS, Azure).
    - Set up SSL certificates and load balancing.

---

### **3. Key Features Breakdown**

### **User Experience (UI):**

1. **Invitation Code Entry:**
    - Form with fields for invitation code and PIN.
    - Validation via backend API.
    - Error messages for invalid inputs.
2. **AI Onboarding Flow:**
    - Voice/text input for name verification (AI checks against invitation code).
    - Policy playback (text-to-speech) and consent confirmation.
    - "Submit" button to send data to admins.
3. **Post-Onboarding:**
    - Confirmation screen with instructions to check email for membership codes.

### **Admin Experience (UI):**

1. **Code Generation:**
    - Generate unique invitation codes linked to user names/PINs.
    - Export codes as CSV/QR codes.
2. **User Review:**
    - Dashboard to view pending submissions.
    - Approve/reject buttons with notes.
    - Issue membership codes upon approval.

---

### **4. Security Requirements**

- **Data Encryption:**
    - All user data (voice samples, names, PINs) stored encrypted.
    - Use OAuth 2.0 for API authentication.
- **Access Control:**
    - Role-based access for admins (e.g., "Super Admin" vs. "Code Generator").
    - Two-factor authentication for admin login.
- **Compliance:**
    - GDPR/CCPA compliance for data handling.
    - Regular backups and disaster recovery plans.

---

### **5. Timeline (Total: 4-6 Weeks)**

| **Phase** | **Duration** | **Key Milestones** |
| --- | --- | --- |
| **Phase 1: Core Features** | 2 weeks | Functional UI/UX, basic admin tools, PIN verification, AI onboarding simulation. |
| **Phase 2: Security & Enhancements** | 2 weeks | MFA integration, voice API implementation, advanced admin dashboard. |
| **Phase 3: Testing & Deployment** | 1 week | Security audits, UAT, deployment to production. |

---

### **6. Risk Management**

- **Technical Risks:**
    - **Voice API Delays:** Use fallback text input if voice APIs fail.
    - **Security Breaches:** Regular penetration testing and encryption audits.
- **User Experience Risks:**
    - **Confusing Workflow:** Conduct usability testing with mockups.
    - **Language Barriers:** Support multilingual voice/text inputs.

---

### **7. Next Steps**

1. **Prototype:** Build a clickable mockup of the UI (e.g., Figma).
2. **Backend Setup:** Initialize the database and API endpoints.
3. **Voice API Integration:** Test speech-to-text functionality.
4. **Admin Dashboard:** Develop the core admin interface.

Let me know if you’d like to dive deeper into any specific component! 🚀

# **Phase 1: Coding [Two Versions]**

Here's a detailed breakdown of **Phase 1: Core Functionality** for the **Membership Initiation System (MIS)**. We'll focus on building the foundational components required for user registration and basic admin workflows. Let's start with the **user interface (UI)** and **backend logic**.

**Objective:**

Build the core components of the Membership Initiation System, including:

1. **User Interface (UI):**
    - PIN verification and onboarding flow.
    - Basic interaction with AI (text-based for now).
2. **Admin Interface (UI):**
    - Invitation code generation.
    - User submission review.
3. **Backend:**
    - API endpoints for PIN validation, data storage, and admin actions.
    - Database setup for invitation codes and user data.

---

### **Task 1: Setup the Project Structure**

**Goal:** Create a folder structure and install dependencies.

```bash
mkdir space-wh-mis
cd space-wh-mis
mkdir frontend backend db

```

**Dependencies:**

- **Frontend:** HTML/CSS/JavaScript (existing code) + Web Speech API (for voice).
- **Backend:** Node.js/Express.js (or Python Flask).
- **Database:** SQLite (for simplicity) or MongoDB (for scalability).

**Install Node.js and Express:**

```bash
npm init -y
npm install express body-parser sqlite3

```

---

### **Task 2: Build the User Interface (UI)**

### **Step 1: PIN Verification Page**

**HTML/CSS/JS** (based on your existing code):

```html
<!-- frontend/pin-verification.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Space WH | PIN Verification</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        input { width: 100%; padding: 10px; margin: 8px 0; }
        button { padding: 10px 20px; background: #4CAF50; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Enter Invitation PIN</h2>
        <input type="number" id="pin" placeholder="4-digit PIN" required>
        <button onclick="validatePin()">Verify PIN</button>
    </div>

    <script>
        async function validatePin() {
            const pin = document.getElementById('pin').value;
            const response = await fetch('/api/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/onboarding';
            } else {
                alert('Invalid PIN. Please try again.');
            }
        }
    </script>
</body>
</html>

```

### **Step 2: AI Onboarding Page**

**HTML/CSS/JS** (text-based for now):

```html
<!-- frontend/onboarding.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Space WH | Onboarding</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>AI-Assisted Onboarding</h2>
        <p><strong>AI:</strong> Confirm your full legal name:</p>
        <input type="text" id="name" placeholder="Full Name" required>

        <p><strong>AI:</strong> We'll now explain Space WH policies...</p>
        <p><strong>AI:</strong> Do you accept the terms? (Type "Yes" to confirm)</p>
        <input type="text" id="consent" placeholder="Type 'Yes' to confirm" required>

        <button onclick="submitOnboarding()">Submit</button>
    </div>

    <script>
        async function submitOnboarding() {
            const name = document.getElementById('name').value;
            const consent = document.getElementById('consent').value;
            const response = await fetch('/api/submit-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, consent })
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/submitted';
            } else {
                alert('Error submitting. Please try again.');
            }
        }
    </script>
</body>
</html>

```

### **Step 3: Final Submission Page**

```html
<!-- frontend/submitted.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Space WH | Submission Complete</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Thank You!</h2>
        <p>Your request has been submitted. A Membership Code will be sent to your email once approved.</p>
    </div>
</body>
</html>

```

---

### **Task 3: Build the Admin Interface**

### **Step 1: Admin Dashboard**

**HTML/CSS/JS** (simplified):

```html
<!-- frontend/admin.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Space WH Admin | Dashboard</title>
    <style>
        body { font-family: Arial; background: #1a1a1a; color: white; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Admin Dashboard</h2>

        <!-- Invitation Code Generator -->
        <div class="section">
            <h3>Generate Invitation Code</h3>
            <input type="text" id="memberName" placeholder="Member Name" required>
            <button onclick="generateCode()">Generate Code</button>
        </div>

        <!-- User Submissions -->
        <div class="section">
            <h3>Pending Submissions</h3>
            <table id="submissionsTable">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Consent</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>

    <script>
        async function generateCode() {
            const name = document.getElementById('memberName').value;
            const response = await fetch('/api/generate-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await response.json();
            alert(`Invitation Code: ${data.code}`);
        }

        async function loadSubmissions() {
            const response = await fetch('/api/submissions');
            const data = await response.json();
            const tableBody = document.querySelector('#submissionsTable tbody');
            tableBody.innerHTML = '';
            data.forEach(submission => {
                const row = `
                    <tr>
                        <td>${submission.name}</td>
                        <td>${submission.consent}</td>
                        <td>
                            <button onclick="approve('${submission.id}')">Approve</button>
                            <button onclick="reject('${submission.id}')">Reject</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }

        async function approve(id) {
            const response = await fetch(`/api/approve/${id}`, { method: 'POST' });
            loadSubmissions();
        }

        async function reject(id) {
            const response = await fetch(`/api/reject/${id}`, { method: 'POST' });
            loadSubmissions();
        }

        document.addEventListener('DOMContentLoaded', loadSubmissions);
    </script>
</body>
</html>

```

---

### **Task 4: Backend Development**

### **Step 1: Setup Express Server**

```jsx
// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(bodyParser.json());
app.use(express.static('frontend'));

// Database setup (SQLite)
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the in-memory SQlite database.');
});

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE invitations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE submissions (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        consent TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
    )`);
});

// API Endpoints
app.post('/api/verify-pin', (req, res) => {
    const { pin } = req.body;
    // Simulate PIN validation (replace with real logic later)
    if (pin === '1234') {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/submit-onboarding', (req, res) => {
    const { name, consent } = req.body;
    db.run(`INSERT INTO submissions (name, consent) VALUES (?, ?)`, [name, consent], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/generate-code', (req, res) => {
    const { name } = req.body;
    const code = generateRandomCode(15);
    const pin = generateRandomPin(4);

    db.run(`INSERT INTO invitations (name, code, pin) VALUES (?, ?, ?)`,
           [name, code, pin], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, code, pin });
    });
});

app.get('/api/submissions', (req, res) => {
    db.all(`SELECT * FROM submissions WHERE status = 'pending'`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/approve/:id', (req, res) => {
    const { id } = req.params;
    db.run(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// Helper functions
function generateRandomCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

function generateRandomPin(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

// Start server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});

```

---

### **Task 5: Testing**

1. **Manual Testing:**
    - Test the PIN verification flow.
    - Submit an onboarding form and check if it appears in the admin dashboard.
    - Approve/reject a submission and ensure the status updates.
2. **Edge Cases:**
    - Invalid PIN entry.
    - Missing fields in onboarding.
    - Duplicate invitation codes.

---

### **Deliverables for Phase 1**

1. **User Flow:**
    - User enters PIN → completes onboarding → sees submission confirmation.
2. **Admin Flow:**
    - Generate invitation codes → view pending submissions → approve/reject.
3. **Database:**
    - Stored invitation codes, user submissions, and statuses.

---

## Version 2

---

### **Next Steps**

After completing Phase 1, we can move to **Phase 2** for security enhancements (voice authentication, MFA) and advanced features. Let me know if you need help with any specific part!