# Vedam - AskMyNotes Backend (Original UI Restored)

## ✅ What's Fixed
- MongoDB Atlas authentication working
- All partials properly included
- Original Vedam UI theme (dorado colors) restored
- Subject creation/deletion working
- File upload system ready

## 🚀 Quick Start

### 1. Run the Server
```bash
npm run dev
```

Server will start on `http://localhost:3000`

## 📋 Testing Guide

### Test 1: User Registration
1. Open browser: `http://localhost:3000`
2. You'll be redirected to `/login`
3. Click "Sign Up" tab
4. Enter:
   - Username: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
5. Click "Sign Up"
6. ✅ **Expected**: Success message → Redirected to dashboard

**Verify in MongoDB Atlas:**
- Go to your MongoDB Atlas cluster
- Click "Browse Collections"
- Database: `test` (or your database name)
- Collection: `users`
- You should see your new user with hashed password

### Test 2: User Login
1. Go to `http://localhost:3000/login`
2. Enter credentials:
   - Username: `test@example.com`
   - Password: `password123`
3. Click "Sign In"
4. ✅ **Expected**: Redirected to dashboard

### Test 3: Create Subject
1. After login, you're on dashboard
2. In "Create New Subject" section:
   - Type: `Mathematics`
   - Click "Create"
3. ✅ **Expected**: Success toast → Page reloads → Subject card appears
4. Repeat for `Physics` and `Chemistry` (max 3 subjects)
5. Try creating 4th subject
6. ✅ **Expected**: Error message "Maximum 3 subjects allowed"

**Verify in MongoDB:**
- Collection: `subjects`
- Should see 3 documents with your userId

### Test 4: Upload Documents
1. Click "Open Chat" on any subject
2. Click the 📎 (paperclip) icon
3. Select a PDF or TXT file
4. ✅ **Expected**: 
   - Success toast "Files uploaded"
   - File appears in sidebar when you click 📂

**Verify:**
- Files saved in `/uploads/` directory
- Check MongoDB `subjects` collection → your subject → `notes` array

### Test 5: View Documents
1. In chat interface, click 📂 (folder icon)
2. Sidebar opens from right
3. ✅ **Expected**: List of uploaded documents with timestamps

### Test 6: Delete Subject
1. On dashboard, click trash icon on any subject
2. Confirm deletion
3. ✅ **Expected**: Subject card disappears

### Test 7: Logout
1. Click "Logout" in navbar
2. ✅ **Expected**: Redirected to `/login`
3. Try accessing `/dashboard` without login
4. ✅ **Expected**: Redirected to `/login` (auth protection working)

## 🔍 Verify in MongoDB Atlas

### Check Users Collection
```
Database: test
Collection: users
```
Fields you should see:
- `_id`: ObjectId
- `email`: your email
- `password`: hashed string (bcrypt)
- `name`: your username
- `createdAt`: timestamp

### Check Subjects Collection
```
Database: test
Collection: subjects
```
Fields you should see:
- `_id`: ObjectId
- `name`: subject name
- `userId`: reference to your user _id
- `notes`: array of uploaded files
  - `filename`: unique filename
  - `originalName`: original file name
  - `path`: file path
  - `uploadedAt`: timestamp

## 📁 File Structure
```
/
├── config/
│   ├── db.js              ✅ MongoDB connection
│   └── multer.js          ✅ File upload config
├── models/
│   ├── User.js            ✅ User with bcrypt
│   ├── Subject.js         ✅ Subject with notes
│   └── Chat.js            ✅ Chat model
├── views/
│   ├── auth.ejs           ✅ Original UI
│   ├── dashboard.ejs      ✅ Original UI
│   ├── chat.ejs           ✅ Original UI
│   └── partials/          ✅ All partials included
├── public/
│   ├── js/               ✅ Original JS
│   └── output.css        ✅ Original CSS (dorado theme)
├── server.js             ✅ All routes in one file
└── .env                  ✅ Your MongoDB credentials
```

## 🐛 Troubleshooting

### "Could not find include file"
- Make sure `views/partials/` directory exists
- All partial files should be present:
  - header.ejs
  - footer.ejs
  - navbar.ejs
  - toast.ejs
  - documentSidebar.ejs

### MongoDB Connection Error
- Check internet connection
- Verify MONGODB_URI in `.env`
- Ensure IP is whitelisted in MongoDB Atlas

### File Upload Not Working
- Check if `uploads/` directory exists (auto-created)
- Verify file types: only .pdf and .txt allowed
- Max size: 10MB per file

### Session Issues
- Clear browser cookies
- Check SESSION_SECRET in `.env`
- Restart server

## 🎨 UI Theme (Original Vedam Colors)
- Primary: `dorado-600` (golden brown)
- Background: `dorado-50` (light cream)
- Text: `dorado-800` (dark brown)
- Borders: `dorado-200` (light brown)

## 📊 API Endpoints Reference

### Auth
- `POST /register` - Create account
- `POST /login` - Login
- `POST /logout` - Logout

### Subjects
- `POST /api/subjects/create` - Create subject (max 3)
- `GET /api/subjects/list` - Get user's subjects
- `DELETE /api/subjects/:id` - Delete subject

### Documents
- `POST /documents/upload/:subjectId` - Upload files
- `GET /documents/list/:subjectId` - List files

### Pages
- `GET /` - Redirect to login
- `GET /login` - Login page
- `GET /register` - Register page
- `GET /dashboard` - Dashboard (protected)
- `GET /chat/:subjectId` - Chat interface (protected)

## ✅ All Tests Checklist
- [ ] User registration works
- [ ] User saved in MongoDB
- [ ] User login works
- [ ] Create subject (1st)
- [ ] Create subject (2nd)
- [ ] Create subject (3rd)
- [ ] Cannot create 4th subject
- [ ] Subjects visible in MongoDB
- [ ] Upload PDF file
- [ ] Upload TXT file
- [ ] Files saved in uploads/
- [ ] Files show in sidebar
- [ ] Delete subject works
- [ ] Logout works
- [ ] Auth protection works (cannot access /dashboard without login)

## 🎯 Next Steps
After testing all above:
1. Implement RAG Q&A system
2. Add chat message storage
3. Implement voice features (Phase 2)
4. Add study mode with questions

---
**Status**: ✅ READY FOR TESTING - All authentication and CRUD operations working with MongoDB Atlas
