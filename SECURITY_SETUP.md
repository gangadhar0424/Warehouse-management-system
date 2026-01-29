# 🔐 Security Setup Guide - Warehouse Management System

## ⚠️ CRITICAL: MongoDB Credentials Security

Your MongoDB credentials are currently **EXPOSED** and need immediate action!

### Current Issues:
1. ❌ Username and password visible in plain text in `.env` files
2. ❌ If `.env` files are committed to Git, credentials are publicly accessible
3. ❌ Current password `Ganga@0424` is predictable and weak

---

## 🛡️ IMMEDIATE ACTIONS REQUIRED

### 1. **Rotate MongoDB Credentials** (DO THIS FIRST!)

Your current credentials are compromised. Follow these steps:

1. **Login to MongoDB Atlas:**
   - Go to https://cloud.mongodb.com/
   - Navigate to your cluster: `Cluster0`

2. **Change Database Password:**
   - Go to **Database Access** → Find user `gangadharreddy0424`
   - Click **Edit** → **Edit Password**
   - Generate a **strong random password** (20+ characters)
   - Use a password manager to store it securely
   - Click **Update User**

3. **Whitelist IP Addresses:**
   - Go to **Network Access**
   - Remove `0.0.0.0/0` (allows all IPs - INSECURE!)
   - Add only your specific IPs:
     - Your development machine IP
     - Your production server IP
     - Your team members' IPs (if applicable)

4. **Enable Additional Security:**
   - Go to **Database** → **Browse Collections** → **Security**
   - Enable **Encryption at Rest** (if not already enabled)
   - Enable **Audit Logs** for tracking access

---

### 2. **Secure Environment Variables**

#### A. **Update .env files** (NEVER commit these!)

Create/Update these files with NEW credentials:

**File: `.env`**
```env
# Server Configuration
PORT=5000
NODE_ENV=production
CLIENT_URL=http://localhost:3000

# MongoDB Configuration (KEEP THIS SECRET!)
MONGODB_URI=mongodb+srv://gangadharreddy0424:<NEW_STRONG_PASSWORD>@cluster0.elx5jve.mongodb.net/warehouse_management?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret (Generate new one using command below)
JWT_SECRET=<GENERATE_NEW_SECRET_HERE>

# File Upload Limits
MAX_FILE_SIZE=10485760

# Email Configuration (if applicable)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# SMS Configuration (if applicable)
SMS_API_KEY=your-sms-api-key

# Razorpay Configuration (if applicable)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

#### B. **Generate New JWT Secret**

Run this command in PowerShell to generate a cryptographically secure JWT secret:

```powershell
# Generate a 64-character random hex string
-join ((1..64) | ForEach-Object {'{0:x}' -f (Get-Random -Maximum 16)})
```

Copy the output and replace `JWT_SECRET` in your `.env` file.

---

### 3. **Git Security** (.gitignore is already configured ✅)

Your `.gitignore` already includes `.env`, which is GOOD! But verify:

```bash
# Check if .env is tracked by Git
git ls-files .env
git ls-files server/.env
```

**If either command shows output**, the files ARE tracked. Remove them:

```powershell
# Remove .env from Git tracking (keeps local file)
git rm --cached .env
git rm --cached server/.env
git commit -m "Remove sensitive .env files from version control"
```

---

### 4. **Production Deployment Security**

#### For Cloud Hosting (Recommended):

**Option A: Environment Variables in Hosting Platform**
- **Vercel:** Dashboard → Project → Settings → Environment Variables
- **Heroku:** Dashboard → App → Settings → Config Vars
- **Railway:** Dashboard → Project → Variables
- **AWS/Azure:** Use AWS Secrets Manager / Azure Key Vault

**Option B: Use dotenv-vault** (Encrypted .env)
```bash
npm install dotenv-vault-core
npx dotenv-vault new
npx dotenv-vault push
```

---

## 🔒 Best Practices for Credential Management

### DO's ✅
1. ✅ Use environment variables for ALL sensitive data
2. ✅ Use strong, random passwords (20+ characters)
3. ✅ Rotate credentials every 90 days
4. ✅ Use different credentials for dev/staging/production
5. ✅ Enable MongoDB Atlas IP whitelisting
6. ✅ Enable 2FA on your MongoDB Atlas account
7. ✅ Use password managers (1Password, Bitwarden, LastPass)
8. ✅ Monitor MongoDB Atlas logs regularly
9. ✅ Keep `.env` in `.gitignore`
10. ✅ Use connection pooling and timeouts

### DON'Ts ❌
1. ❌ Never hardcode credentials in source code
2. ❌ Never commit `.env` files to Git/GitHub
3. ❌ Never share `.env` files via email/chat
4. ❌ Never use predictable passwords
5. ❌ Never allow all IPs (0.0.0.0/0) in production
6. ❌ Never expose `.env` files publicly
7. ❌ Never reuse passwords across services
8. ❌ Never store credentials in plain text files

---

## 🚀 Quick Setup for New Team Members

1. **Get Environment Variables:**
   - Request `.env` file from team lead (via secure channel)
   - OR get credentials from password manager
   - OR get from hosting platform's secret manager

2. **Create Local .env:**
   ```bash
   cp .env.example .env
   # Edit .env with actual credentials (never commit!)
   ```

3. **Verify .env is Ignored:**
   ```bash
   git status
   # .env should NOT appear in untracked files
   ```

---

## 📊 MongoDB Connection String Format

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?OPTIONS
```

**Parts Explained:**
- `USERNAME`: MongoDB Atlas database user (not your Atlas account email)
- `PASSWORD`: User's database password (URL-encoded!)
- `CLUSTER`: Your cluster address (e.g., cluster0.elx5jve.mongodb.net)
- `DATABASE`: Database name (e.g., warehouse_management)
- `OPTIONS`: Connection options (retryWrites, w, appName, etc.)

**Password Encoding:**
If password contains special characters, URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `!` → `%21`
- `$` → `%24`

---

## 🛠️ Troubleshooting

### "Authentication failed" Error:
1. Check username/password in `.env`
2. Verify user exists in MongoDB Atlas → Database Access
3. Check if password needs URL encoding
4. Ensure user has correct permissions

### "IP not whitelisted" Error:
1. Go to MongoDB Atlas → Network Access
2. Add your current IP address
3. OR temporarily use `0.0.0.0/0` for testing (INSECURE!)

### "JWT invalid" Error:
1. Generate new JWT secret
2. Ensure same secret used for signing and verification
3. Check token expiration (24h default)

---

## 📞 Emergency Contact

If credentials are compromised:
1. **IMMEDIATELY** rotate MongoDB password
2. Generate new JWT secret
3. Invalidate all active user sessions
4. Review MongoDB Atlas audit logs
5. Check for unauthorized database access
6. Consider migrating to new cluster if breach is severe

---

## 🔄 Regular Maintenance Checklist

- [ ] **Weekly:** Review MongoDB Atlas logs
- [ ] **Monthly:** Rotate JWT secret
- [ ] **Quarterly:** Rotate MongoDB password
- [ ] **Quarterly:** Review IP whitelist
- [ ] **Quarterly:** Audit user permissions
- [ ] **Yearly:** Full security audit

---

**Last Updated:** January 29, 2026  
**Maintained By:** Development Team  
**Review Frequency:** Quarterly or after security incidents
