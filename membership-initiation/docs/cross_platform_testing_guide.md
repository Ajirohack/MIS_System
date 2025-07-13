# SpaceNew Cross-Platform Connectivity Testing Guide

This document outlines the steps to test connectivity between all SpaceNew client platforms.

## Overview

SpaceNew supports the following client platforms:

1. Web Application
2. Browser Extension
3. Mobile App
4. Telegram Bot

The following test scenarios ensure proper connectivity between all platforms.

## Prerequisites

- Complete Membership Initiation System setup
- Browser extension installed
- Mobile app installed on device
- Access to Telegram bot

## Test Scenarios

### 1. Web to Browser Extension Connection

**Objective**: Verify web application can connect to browser extension.

**Steps**:

1. Open SpaceNew web application at <https://spacenew.app>
2. Log in with your membership key
3. Navigate to Setup page
4. Click "Connect Browser Extension" button
5. Verify the extension popup opens
6. Click "Connect" in the extension popup
7. Verify connection status in the web app changes to "Connected"

**Expected Result**: Web interface shows the browser extension as connected.

### 2. Web to Mobile App Connection

**Objective**: Verify web application can connect to mobile app.

**Steps**:

1. Open SpaceNew web application at <https://spacenew.app>
2. Navigate to Setup page
3. Click "Connect Mobile App" button
4. Note the displayed QR code
5. Open SpaceNew mobile app
6. Tap "Scan QR Code" button
7. Scan the QR code displayed on web app
8. Verify connection confirmation in mobile app
9. Verify connection status in web app changes to "Connected"

**Expected Result**: Web interface shows the mobile app as connected.

### 3. Web to Telegram Bot Connection

**Objective**: Verify web application can connect to Telegram bot.

**Steps**:

1. Open SpaceNew web application at <https://spacenew.app>
2. Navigate to Setup page
3. Click "Connect Telegram Bot" button
4. Note the 6-digit connection code
5. Open Telegram and search for @SpaceNewBot
6. Start conversation with the bot and send the command: `/connect`
7. Enter the 6-digit code when prompted
8. Verify connection confirmation from Telegram bot
9. Verify connection status in web app changes to "Connected"

**Expected Result**: Web interface shows the Telegram bot as connected.

### 4. Cross-Platform Notification Test

**Objective**: Verify notifications are synchronized across all connected platforms.

**Steps**:

1. Ensure all platforms are connected
2. Create a new notification from web app:
   - Navigate to Dashboard
   - Click "Send Test Notification"
   - Enter title "Cross-platform test"
   - Click Send
3. Verify notification appears on:
   - Browser extension badge/popup
   - Mobile app notification
   - Telegram bot message

**Expected Result**: The notification appears on all connected platforms within a few seconds.

### 5. Data Synchronization Test

**Objective**: Verify user data synchronizes across all connected platforms.

**Steps**:

1. From web app:
   - Navigate to Settings
   - Toggle Dark Mode setting
   - Click Save
2. Verify the updated setting appears on:
   - Browser extension (reopen the popup if needed)
   - Mobile app (navigate to Settings)
   - Telegram bot (send the command `/status`)

**Expected Result**: The updated setting should be reflected on all platforms.

### 6. Platform Disconnection Test

**Objective**: Verify platforms can be disconnected properly.

**Steps**:

1. Open SpaceNew web application
2. Navigate to Dashboard
3. Find the Connected Platforms section
4. Click Disconnect on one of the platforms (e.g., Telegram Bot)
5. Confirm disconnection
6. Verify platform is removed from the connected platforms list
7. Verify the platform no longer receives notifications or data updates

**Expected Result**: The disconnected platform should stop receiving updates.

### 7. Reconnection After Timeout Test

**Objective**: Verify platforms can reconnect after session timeout.

**Steps**:

1. Wait for session to timeout (or manually clear local storage/cookies)
2. Attempt to use any platform
3. Verify re-authentication is requested
4. Log in with membership key
5. Verify platforms remain connected

**Expected Result**: After re-authentication, all platforms should still be connected.

## Troubleshooting

If issues are encountered during testing:

1. Ensure all platforms are using the latest version
2. Check network connectivity on all devices
3. Verify membership key is valid
4. Check browser console for error messages on web app
5. Review device logs for mobile app
6. Check API server logs for backend issues

## Cross-Platform Integration Issues to Watch For

- **Token Expiration**: Authentication tokens not refreshing properly
- **Platform Detection**: Incorrect platform detection on multi-platform devices
- **Notification Delays**: Significant delays in notification delivery
- **Data Sync Conflicts**: Conflicts when the same setting is changed from multiple platforms
- **Connection Status Mismatch**: Connected status not matching between platforms

## Reporting Results

Please document any issues encountered during testing with:

- Detailed steps to reproduce
- Platform and device details
- Screenshots or error messages
- Timestamp of occurrence

Submit reports to the development team through the project management system.
