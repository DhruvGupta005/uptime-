# Fixing NextAuth CLIENT_FETCH_ERROR

## The Error
```
[next-auth][error][CLIENT_FETCH_ERROR] "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"
```

This error means NextAuth is trying to fetch JSON from `/api/auth/session` but getting HTML instead (usually a 404 or error page).

## Solution

### 1. Check Your .env File

Make sure your `.env` file has these variables:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=your-database-url
```

**Important:**
- `NEXTAUTH_URL` must match your actual URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` should be a random string (generate one with: `openssl rand -base64 32`)

### 2. Restart Dev Server

After updating `.env`:
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 3. Verify Route is Accessible

Test if the route works:
- Open: `http://localhost:3000/api/auth/session`
- Should return JSON: `{"user":null}` or `{"user":{...}}`
- If you get HTML/404, the route isn't being found

### 4. Check Browser Console

Look for the exact URL NextAuth is trying to fetch. It should be:
- `/api/auth/session` (relative)
- Or `http://localhost:3000/api/auth/session` (absolute)

### 5. Common Issues

**Issue: Route returns 404**
- Check that `app/api/auth/[...nextauth]/route.ts` exists
- Restart dev server
- Clear `.next` folder: `rm -rf .next` (or delete it manually)

**Issue: NEXTAUTH_URL mismatch**
- If running on different port, update NEXTAUTH_URL
- If deployed, set NEXTAUTH_URL to your production URL

**Issue: Database connection**
- Verify DATABASE_URL is correct
- Run `npm run prisma:generate` if schema changed

### 6. Quick Test

1. Open browser console
2. Go to any page
3. Check Network tab for `/api/auth/session` request
4. If it returns HTML instead of JSON, the route isn't working

### 7. Alternative: Generate NEXTAUTH_SECRET

If you don't have a secret, generate one:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Or use online generator:**
- Visit: https://generate-secret.vercel.app/32
- Copy the generated secret to `.env`

## After Fixing

1. Restart dev server
2. Clear browser cache
3. Try logging in again
4. Error should be gone!







