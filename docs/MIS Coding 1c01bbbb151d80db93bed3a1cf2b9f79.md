# MIS Coding

```html
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
						<style>
							body {
								background-color: white; /* Ensure the iframe has a white background */
							}

						</style>
                    </head>
                    <body>
                        <!DOCTYPE html>

```

```html
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Space WH Membership Initiation System</title>
<style>
body {
font-family: 'Arial', sans-serif;
margin: 0;
padding: 20px;
background: #1a1a1a;
color: white;
}
.container {
max-width: 600px;
margin: 0 auto;
padding: 20px;
background: rgba(0, 0, 0, 0.8);
border-radius: 10px;
}
.blurred-content {
filter: blur(8px);
opacity: 0.5;
transition: all 0.5s ease;
}
.step {
margin: 20px 0;
}
.step h2 {
color: #4CAF50;
}
.step label {
display: block;
margin-bottom: 8px;
color: #ffffff;
}
.step input {
width: 100%;
padding: 12px;
margin: 8px 0;
border: 1px solid #4CAF50;
border-radius: 4px;
background: #212121;
color: white;
}
.step button {
padding: 12px 20px;
background: #4CAF50;
color: white;
border: none;
border-radius: 4px;
cursor: pointer;
}
.step button:hover {
background: #45a049;
}
.hidden {
display: none;
}
</style>
</head>
<body>
<div class="container">
<!-- PIN Verification Step -->
<div class="step">
<h2>Step 1: Enter Invitation PIN</h2>
<label for="pin">4-digit PIN (Sent via Email/QR):</label>
<input type="number" id="pin" placeholder="Enter PIN" required>
<button onclick="validatePin()">Verify PIN</button>
</div>
```

```html
    <!-- Blurred Content (Onboarding) -->
    <div class="step blurred-content">
        <div class="content">
            <!-- Onboarding Process -->
            <div class="step hidden" id="onboarding">
                <h2>Step 2: AI-Assisted Onboarding</h2>
                <p><strong>AI:</strong> Welcome to Space WH! Please confirm your full legal name to proceed.</p>
                <label for="name">Full Legal Name:</label>
                <input type="text" id="name" placeholder="Enter your full name" required>

                <p><strong>AI:</strong> We'll now explain Space WH policies. Please listen carefully.</p>

                <p><strong>AI:</strong> Do you accept the terms and conditions? (Say/Type "Yes" to confirm)</p>
                <button onclick="startVoice()">Start Voice Confirmation</button>
                <button onclick="submitOnboarding()">Confirm and Submit</button>
            </div>

            <!-- Final Submission -->
            <div class="step hidden" id="submission">
                <h2>Step 3: Final Submission</h2>
                <p>Thank you! Your request will be reviewed by an admin.</p>
                <p>A Membership Code will be sent to your email once approved.</p>
            </div>
        </div>
    </div>
</div>

<script>
    // PIN Validation (Example: Correct PIN is 1234)
    function validatePin() {
        const pin = document.getElementById('pin').value;
        if (pin === "1234") {
            document.querySelector('.blurred-content').style.filter = "none";
            document.querySelector('.blurred-content').style.opacity = "1";
            document.getElementById('onboarding').classList.remove('hidden');
        } else {
            alert("Incorrect PIN. Please try again.");
        }
    }

    // Simulate Voice Confirmation (Placeholder)
    function startVoice() {
        alert("Voice confirmation simulated. Please say 'Yes' to accept.");
    }

    // Submit Onboarding
    function submitOnboarding() {
        document.getElementById('onboarding').classList.add('hidden');
        document.getElementById('submission').classList.remove('hidden');
    }
</script>

```

```html
</body>
</html>
```

```
						<script>

						</script>
                    </body>
                    </html>

```