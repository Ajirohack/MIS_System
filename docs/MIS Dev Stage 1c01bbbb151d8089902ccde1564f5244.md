# MIS Dev Stage

---

**Project Y - Space WH Development Plan**

---

### **1. Membership Initiation System (MIS) Architecture**

### **Core Components**

- **Backend**:
    - **Database**: PostgreSQL with encrypted fields for sensitive data (invitation codes, PINs, membership keys).
    - **APIs**: RESTful endpoints for code generation, PIN validation, AI onboarding, and admin workflows.
    - **Authentication**: JWT tokens for secure API access; OAuth2 for admin portal.
- **Frontend**:
    - **User Portal**: React-based UI for code/PIN entry and AI onboarding.
    - **Admin Dashboard**: Secure interface (Next.js) for generating codes, reviewing applicants, and approvals.
- **AI Layer**:
    - **Voice Processing**: AWS Transcribe (speech-to-text) and Polly (text-to-speech).
    - **Conversation Flow**: Dialogflow/Custom NLP model for policy explanation and consent capture.
    - **Verification**: Voice biometrics (e.g., AWS Voice ID) for identity matching.

### **Security Measures**

- **Data Encryption**: AES-256 for data at rest; TLS 1.3 for data in transit.
- **MFA Flow**:
    1. Invitation Code + Name Validation.
    2. 4-Digit PIN (rate-limited to 3 attempts).
    3. AI Voice Verification (anti-spoofing checks).
    4. Membership Code (time-limited, one-time use).
- **Audit Logs**: Track admin actions, code generation, and user onboarding attempts.

---

### **2. Development Roadmap**

### **Phase 1: Backend & Security (Weeks 1-4)**

- **Database Setup**: Tables for `invitations`, `users`, `membership_keys`, and `audit_logs`.
- **API Development**:
    - `/generate-code` (admin-only): Generates invitation codes linked to names.
    - `/validate-pin`: Validates PIN and unlocks onboarding.
    - `/start-onboarding`: Initiates AI interview session.
- **Security Integration**: JWT-based auth, rate limiting, and encryption.

### **Phase 2: Frontend & AI Integration (Weeks 5-8)**

- **User Portal**:
    - Code/PIN entry form with QR scanner (react-qr-reader).
    - Voice-enabled onboarding interface (Web Speech API).
- **Admin Dashboard**:
    - Code generation tool with email/SMS integration.
    - Approval panel with voice recording playback.
- **AI Workflow**:
    - Predefined onboarding script (rules, consent questions).
    - Consent recording stored in encrypted storage.

### **Phase 3: Testing & Deployment (Weeks 9-12)**

- **Unit Tests**: API endpoints, PIN validation, code generation.
- **User Testing**: Simulate onboarding flow with diverse accents/edge cases.
- **Security Audit**: Penetration testing for vulnerabilities (e.g., OWASP Top 10).
- **Deployment**: AWS EC2 (backend), S3 (frontend), and Lambda (AI services).

---

### **3. Technical Stack**

| **Component** | **Tools/Technologies** |
| --- | --- |
| **Frontend** | React, Next.js, Web Speech API |
| **Backend** | Node.js/Express.js, PostgreSQL |
| **AI Services** | AWS Transcribe/Polly, Dialogflow |
| **Security** | Let’s Encrypt (SSL), bcrypt (hashing) |
| **DevOps** | Docker, AWS EC2/S3, GitHub Actions (CI/CD) |

---

### **4. Challenges & Mitigation**

- **Voice Recognition Accuracy**: Use multi-region AI models and fallback to text input.
- **QR/PIN Security**: Short expiration time (24h) for codes; rate-limited PIN attempts.
- **Admin Overhead**: Automate approval workflows (e.g., auto-approve if voice matches).

---

### **5. Next Steps**

1. Finalize database schema and API specifications.
2. Set up AWS infrastructure and DevOps pipeline.
3. Develop MVP for code generation and onboarding flow.
4. Conduct alpha testing with internal WH members.

---

This plan ensures a secure, scalable foundation for Space WH’s Membership Initiation System while aligning with Project Y’s goals. Iterative development and rigorous testing will prioritize exclusivity and user experience.