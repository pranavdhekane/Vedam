# Backend Updates - Implementation Guide

## Files to Replace/Update:

### 1. controllers/authController.js
Replace entire file with new version
- Now returns JSON instead of redirecting
- Uses username field (treats as email internally)

### 2. controllers/documentController.js
NEW FILE - Create this file
- Handles file uploads per subject
- Lists documents per subject

### 3. routes/documentRoutes.js
NEW FILE - Create this file
- Document upload and list endpoints

### 4. routes/pageRoutes.js
Replace entire file
- Now passes subjectId to chat view

### 5. server.js
Replace entire file
- Added document routes

### 6. public/js/chat.js
Replace entire file
- Uses subjectId from page data attribute
- Calls proper backend endpoints
- File upload works with MongoDB

### 7. views/chat.ejs
Replace entire file
- Added data-subject-id attribute to body

## Quick Implementation:

1. Copy all files from backend-updates folder to your project
2. Restart server: npm run dev
3. Test signup/login at localhost:3000/login
4. Go to dashboard, click subject to open chat
5. Click 📂 to view files, 📎 to upload

## API Endpoints Created:

POST /register - { username, password }
POST /login - { username, password }
POST /documents/upload/:subjectId - FormData with documents
GET /documents/list/:subjectId - Returns file list
