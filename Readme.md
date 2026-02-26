# AskMyNotes Backend

## Setup
```bash
npm install
cp .env.example .env
mkdir uploads
npm run dev
```

## Update .env
Add your MongoDB Atlas URI and session secret

## Structure
- server.js - Main entry
- config/ - DB and multer
- models/ - User, Subject, Chat
- controllers/ - Auth, Subject, Chat logic
- routes/ - API and page routes
- middleware/ - Auth guards
