# MIS Coding

---

```jsx
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Diego Camilleri Chat Interface</title>
<style>
/* Sophisticated color scheme */
:root {
--primary-color: #2c3e50;
--secondary-color: #34495e;
--accent-color: #3498db;
--background-color: #f8f9fa;
--text-color: #2c3e50;
}
```

```css
    body {
        font-family: 'Roboto', sans-serif;
        margin: 0;
        padding: 0;
        background-color: var(--background-color);
        color: var(--text-color);
        min-height: 100vh;
    }

    .chat-container {
        max-width: 800px;
        margin: 20px auto;
        padding: 20px;
        background-color: white;
        border-radius: 15px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .profile-section {
        text-align: center;
        margin-bottom: 30px;
    }

    .profile-image {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        margin-bottom: 15px;
        border: 5px solid var(--accent-color);
    }

    .message-container {
        height: 500px;
        overflow-y: auto;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 10px;
    }

    .input-container {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }

    input[type="text"] {
        flex: 1;
        padding: 12px;
        border: 2px solid var(--secondary-color);
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.3s ease;
    }

    input[type="text"]:focus {
        outline: none;
        border-color: var(--accent-color);
    }

    button {
        padding: 12px 25px;
        background-color: var(--accent-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.3s ease;
    }

    button:hover {
        background-color: #2980b9;
    }

    .user-message {
        background-color: #ffffff;
        padding: 12px;
        border-radius: 15px;
        margin-bottom: 15px;
        max-width: 60%;
        display: inline-block;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .diego-message {
        background-color: var(--secondary-color);
        color: white;
        padding: 12px;
        border-radius: 15px;
        margin-bottom: 15px;
        max-width: 60%;
        display: inline-block;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    /* Make the chat container sticky at the top */
    .chat-container {
        position: sticky;
        top: 0;
    }

    /* Add a subtle animations for messages */
    .user-message, .diego-message {
        animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .chat-container {
            margin: 10px;
            padding: 10px;
        }

        .message-container {
            height: 300px;
        }
    }
</style>

```

```css
</head>
<body>
<div class="chat-container">
<div class="profile-section">
<img src="diego-profile.jpg" alt="Diego Camilleri" class="profile-image">
<h2>Diego Camilleri</h2>
<p>Global Diplomatic Consultant & Security Expert</p>
</div>
```

```css
    <div class="message-container" id="messageContainer"></div>

    <div class="input-container">
        <input type="text" id="userInput" placeholder="Enter your message here...">
        <button onclick="handleUserInput()">Send</button>
    </div>
</div>

<script>
    function handleUserInput() {
        const userInput = document.getElementById('userInput');
        const messageContainer = document.getElementById('messageContainer');

        if (!userInput.value.trim()) return;

        // Add user message
        const userMessage = document.createElement('div');
        userMessage.classList.add('user-message');
        userMessage.textContent = userInput.value;
        messageContainer.appendChild(userMessage);

        // Simulate Diego's response
        setTimeout(() => {
            const diegoMessage = document.createElement('div');
            diegoMessage.classList.add('diego-message');
            diegoMessage.innerHTML = `${generateDiegoResponse(userInput.value)}`;
            messageContainer.appendChild(diegoMessage);
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }, 1500);

        // Clear input
        userInput.value = '';
    }

    // Sample response function
    function generateDiegoResponse(userMessage) {
        return "Thank you for reaching out. It's not often I encounter someone as intriguing as yourself. What brings you here today?";
    }

    // Handle Enter key
    document.getElementById('userInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });
</script>

```

```css
</body>
</html>
```