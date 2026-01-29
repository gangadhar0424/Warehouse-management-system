# 📌 Quick Reference Guide

## 🔐 Where Your Data is Stored

### 1. **Login Credentials** (Users)

**Storage:** MongoDB Cloud Database  
**Database:** `warehouse_management`  
**Collection:** `users`

**Connection:** 
```
mongodb+srv://gangadharreddy0424:Ganga@0424@cluster0.elx5jve.mongodb.net/warehouse_management
```

**Security:**
- Passwords: Hashed with bcrypt (NOT plain text)
- Authentication: JWT tokens (24-hour expiry)
- Configuration: Stored in `.env` file

**User Fields:**
```javascript
{
  _id: ObjectId,
  username: "unique_username",
  email: "user@example.com",
  password: "$2a$10$...",  // Hashed
  role: "owner/customer/worker/admin",
  profile: { firstName, lastName, phone, address },
  isActive: true/false,
  lastLogin: Date
}
```

**Access:**
- Login: `POST /api/auth/login`
- Register: `POST /api/auth/register`
- Get profile: `GET /api/users/profile`

---

### 2. **Warehouse Layouts**

**Storage:** MongoDB Cloud Database  
**Database:** `warehouse_management`  
**Collection:** `dynamicwarehouselayouts`

**Structure:**
```javascript
{
  _id: ObjectId,
  owner: ObjectId,  // References 'users' collection
  name: "Warehouse A",
  description: "Main storage facility",
  configuration: {
    numberOfBuildings: 2,
    blocksPerBuilding: 4,
    rowsPerBlock: 10,
    colsPerBlock: 10,
    capacityPerSlot: 1500
  },
  buildings: [
    {
      building: "B1",
      blocks: [
        {
          block: "A",
          rows: 10,
          cols: 10,
          slots: [
            {
              slotLabel: "A-1-1",
              row: 1,
              col: 1,
              capacity: 1500,
              filledBags: 500,
              status: "partially-filled",
              allocations: [
                {
                  customer: ObjectId,
                  customerName: "John Doe",
                  bags: 500,
                  grainType: "rice",
                  weight: 25000,
                  entryDate: Date,
                  notes: "Premium grade"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  pricing: { baseRate, ratePerDay, ratePerKg },
  createdAt: Date
}
```

**Access:**
- Create layout: `POST /api/dynamic-warehouse/layout`
- Get layouts: `GET /api/dynamic-warehouse/layouts`
- Update layout: `PUT /api/dynamic-warehouse/layout/:id`
- Delete layout: `DELETE /api/dynamic-warehouse/layout/:id`
- Allocate slot: `POST /api/dynamic-warehouse/allocate`

---

### 3. **Uploaded Files**

**Storage:** MongoDB GridFS (Cloud)  
**Database:** `warehouse_management`  
**Collections:** 
- `uploads.files` - File metadata
- `uploads.chunks` - File data (256KB chunks)

**File Metadata:**
```javascript
// In uploads.files collection
{
  _id: ObjectId,  // This is the fileId
  filename: "1738151234567-123456789-invoice.pdf",
  length: 125678,  // File size in bytes
  chunkSize: 261120,  // 255KB
  uploadDate: Date,
  metadata: {
    category: "bills/documents/vehicle-images/exports",
    originalname: "invoice.pdf",
    mimetype: "application/pdf",
    size: 125678,
    uploadedAt: Date,
    uploadedBy: ObjectId  // User who uploaded
  }
}
```

**File Categories:**
- `bills` - Customer bills and invoices
- `documents` - General documents, receipts
- `vehicle-images` - Vehicle photos
- `exports` - Excel export files

**Access:**
- Upload: `POST /api/files/upload`
- Download: `GET /api/files/download/:fileId`
- List files: `GET /api/files/list/:category`
- Delete: `DELETE /api/files/delete/:fileId`
- Get info: `GET /api/files/info/:fileId`

---

### 4. **Configuration & Secrets**

**Storage:** `.env` file (LOCAL ONLY - Never commit to Git!)  
**Location:** `c:\Users\ganga\OneDrive\Desktop\wms\Warehouse-management-system\.env`

**Contents:**
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.elx5jve.mongodb.net/warehouse_management

# Security
JWT_SECRET=64-character-hex-string

# Server
PORT=5000
NODE_ENV=production
CLIENT_URL=http://localhost:3000

# Limits
MAX_FILE_SIZE=10485760  # 10MB
```

**⚠️ SECURITY:**
- ✅ Already in `.gitignore`
- ❌ Never commit to Git
- ❌ Never share via email/chat
- ✅ Use different secrets for dev/prod
- ✅ Rotate credentials every 90 days

---

## 🗄️ Complete MongoDB Collections

| Collection | Purpose | Documents |
|------------|---------|-----------|
| `users` | User accounts (owners, customers, workers) | Login credentials, profiles |
| `dynamicwarehouselayouts` | Warehouse structures | Building/block/slot configurations |
| `storageallocations` | Storage assignments | Customer-slot mappings |
| `transactions` | Business transactions | Payments, activities |
| `vehicles` | Vehicle records | Vehicle details, drivers |
| `loans` | Loan records | Customer loans against grain |
| `uploads.files` | File metadata (GridFS) | File information |
| `uploads.chunks` | File data (GridFS) | Actual file content |

---

## 🔍 How to View Your Data

### Option 1: MongoDB Compass (Recommended)
1. Download: https://www.mongodb.com/try/download/compass
2. Install and open
3. Connect with URI:
   ```
   mongodb+srv://gangadharreddy0424:Ganga@0424@cluster0.elx5jve.mongodb.net/warehouse_management
   ```
4. Browse collections visually

### Option 2: MongoDB Atlas Web UI
1. Go to: https://cloud.mongodb.com/
2. Login with your Atlas account
3. Click on cluster → Browse Collections
4. View/edit data directly

### Option 3: VS Code Extension
1. Install "MongoDB for VS Code" extension
2. Connect using connection string
3. Browse collections in VS Code

### Option 4: API Endpoints
```bash
# Get your profile
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/users/profile

# List warehouse layouts
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/dynamic-warehouse/layouts

# List files
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/files/list/bills
```

---

## 📦 Data Backup & Recovery

### Automatic Backups (MongoDB Atlas)
- **Frequency:** Continuous (every 6 hours)
- **Retention:** 7 days (free tier) / 35 days (paid tier)
- **Location:** MongoDB Atlas Dashboard → Backup tab

### Manual Backup
```bash
# Export entire database
mongodump --uri="mongodb+srv://user:pass@cluster0.elx5jve.mongodb.net/warehouse_management" --out=./backup

# Restore database
mongorestore --uri="mongodb+srv://user:pass@cluster0.elx5jve.mongodb.net/warehouse_management" ./backup/warehouse_management
```

### Export Specific Collections
```bash
# Export users collection
mongoexport --uri="mongodb+srv://user:pass@cluster0.elx5jve.mongodb.net/warehouse_management" \
  --collection=users --out=users.json

# Import users collection
mongoimport --uri="mongodb+srv://user:pass@cluster0.elx5jve.mongodb.net/warehouse_management" \
  --collection=users --file=users.json
```

---

## 🔐 Security Best Practices

### For MongoDB Credentials:
1. ✅ Use strong passwords (20+ characters)
2. ✅ Enable IP whitelisting (remove 0.0.0.0/0)
3. ✅ Rotate password every 90 days
4. ✅ Enable 2FA on MongoDB Atlas account
5. ✅ Use different credentials for dev/prod
6. ✅ Monitor access logs regularly

### For JWT Tokens:
1. ✅ Generate random 64-character hex string
2. ✅ Never expose in client-side code
3. ✅ Rotate every 6-12 months
4. ✅ Use different secret for dev/prod
5. ✅ Set appropriate expiry (24h default)

### For File Uploads:
1. ✅ Validate file types
2. ✅ Limit file sizes (10MB default)
3. ✅ Scan for viruses (recommended)
4. ✅ Authenticate all uploads
5. ✅ Track who uploaded what

---

## 📞 Quick Troubleshooting

### "Authentication failed"
→ Check `.env` has correct MONGODB_URI  
→ Ensure password is URL-encoded (@ becomes %40)  
→ Verify user exists in MongoDB Atlas

### "IP not whitelisted"
→ Go to MongoDB Atlas → Network Access  
→ Add your current IP address  
→ Or temporarily use 0.0.0.0/0 (INSECURE!)

### "GridFS bucket not initialized"
→ Wait for MongoDB connection (automatic)  
→ Check MongoDB connection in server logs  
→ Restart server

### "File not found"
→ Verify fileId is correct ObjectId  
→ Check uploads.files collection  
→ Ensure file wasn't deleted

### "Token is not valid"
→ Token expired (24h limit)  
→ Login again to get new token  
→ Check JWT_SECRET is same for sign/verify

---

## 📚 Additional Resources

- **MongoDB Atlas:** https://cloud.mongodb.com/
- **GridFS Documentation:** https://docs.mongodb.com/manual/core/gridfs/
- **JWT Documentation:** https://jwt.io/
- **Bcrypt Documentation:** https://www.npmjs.com/package/bcryptjs
- **Security Guide:** See `SECURITY_SETUP.md`
- **Migration Summary:** See `MIGRATION_SUMMARY.md`

---

**Last Updated:** January 29, 2026  
**System Version:** 2.0.0  
**Contact:** Check server logs or MongoDB Atlas for issues
