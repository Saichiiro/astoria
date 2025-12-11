# Supabase Setup Guide - Astoria Authentication

## Quick Setup (Under 30 minutes!)

### Step 1: Create Supabase Project (5 mins)

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in with GitHub (or create account)
3. Click "New Project"
4. Fill in:
   - **Project Name**: `astoria` (or whatever you want)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your players
   - **Pricing Plan**: **Free** (more than enough for 40 players × 5 characters)
5. Click "Create new project" and wait ~2 minutes

### Step 2: Get Your API Keys (2 mins)

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. You'll see two important values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
3. **KEEP THESE HANDY** - you'll need them in Step 4

### Step 3: Create Database Tables (5 mins)

1. In Supabase, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase-schema.sql` from this repo
4. **Copy ALL the SQL** from that file
5. **Paste it** into the Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

**What this does:**
- Creates `users` table (for login accounts)
- Creates `characters` table (up to 5 per user)
- Creates `items` table (your inventory data)
- Sets up security policies
- Creates test accounts:
  - Admin: username `admin`, password `admin123`
  - Player: username `player1`, password `player123`

### Step 4: Configure Your App (3 mins)

1. Open `auth.js` in your code editor
2. Find these lines at the top:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```
3. Replace with YOUR values from Step 2:
```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';  // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGc...your-actual-key-here';  // Your anon public key
```
4. Save the file

### Step 5: Test Login (2 mins)

1. Open `login.html` in your browser (or deploy to GitHub Pages)
2. Try logging in with:
   - Username: `admin`
   - Password: `admin123`
3. You should be redirected to the character selection screen!

**IMPORTANT: Change the default passwords immediately!**

---

## Database Structure

### Users Table
- `id` - Unique user ID
- `username` - Login username (unique)
- `password_hash` - Hashed password
- `role` - Either 'admin' or 'player'

### Characters Table
- `id` - Unique character ID
- `user_id` - Links to users table
- `name` - Character name
- `race` - Character race
- `class` - Character class
- `profile_data` - JSON with all profile details (house, rank, alice, etc.)

### Items Table
- `id` - Unique item ID
- `name` - Item name
- `description` - Item description
- `effect` - Item effect
- `category` - Item category
- `rarity` - Item rarity
- `price_po` - Price in PO
- `price_pa` - Price in PA
- `images` - JSON with image paths
- `badges` - JSON array of badges
- `enabled` - Boolean (true = visible to players, false = admin only)

---

## Migrating Existing Items from data.js

You'll need to move your existing items from `data.js` into Supabase.

### Option 1: Manual Insert (Quick for few items)

In Supabase SQL Editor, run:

```sql
INSERT INTO items (name, description, effect, category, rarity, price_po, price_pa, images, badges, enabled)
VALUES (
    'Poudre de Traçage',
    'Une poudre enchantée qui révèle les traces invisibles',
    'Révèle les empreintes et traces magiques dans un rayon de 10m',
    'Consommable',
    'Commun',
    50,
    0,
    '{"primary": "assets/images/Poudre_de_Tracage.png"}'::jsonb,
    '["Détection", "Utilitaire"]'::jsonb,
    true
);
```

Repeat for each item.

### Option 2: Bulk Insert Script (Faster for many items)

I can create a migration script that reads your `data.js` and generates INSERT statements.
Let me know if you want this!

---

## User Management

### Creating New Player Accounts

**Option A: Via Supabase Dashboard**
1. Go to **Table Editor** → **users**
2. Click **Insert row**
3. Fill in:
   - `username`: player's username
   - `password_hash`: Use the hash generator below
   - `role`: `player`

**Option B: Via Browser Console**
1. Open your site with `auth.js` loaded
2. Open browser console (F12)
3. Run:
```javascript
import('./auth.js').then(auth => {
    auth.createAdminUser('newplayer', 'theirpassword');
});
```

### Password Hash Generator

To create a password hash for manual user creation:

1. Open browser console
2. Run this code with the password you want:
```javascript
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Hash:', hash);
    return hash;
}

hashPassword('player123');  // Replace with actual password
```
3. Copy the hash and use it in the `password_hash` field

---

## Security Notes

### Current Security (Prototype)
- Password hashing: SHA-256 (client-side)
- Session storage: localStorage (7-day expiry)
- RLS policies: Enabled on all tables

### Production Improvements (Later)
- Move password hashing to server-side with bcrypt
- Use HTTP-only cookies instead of localStorage
- Add rate limiting for login attempts
- Add email verification
- Add password reset flow
- Add 2FA (optional)

**For now, this is fine for 20-40 players among friends!**

---

## Free Tier Limits (Supabase)

- ✅ **Database**: 500 MB (you'll use <10 MB)
- ✅ **API Requests**: 50,000/month (you'll use <5,000)
- ✅ **Auth Users**: 50,000 MAU (you have ~40)
- ✅ **Bandwidth**: 5 GB/month (plenty)
- ✅ **Storage**: 1 GB (for images if needed)

**You're well within the free tier!**

---

## Troubleshooting

### "Failed to fetch" error
- Check your Supabase URL and anon key in `auth.js`
- Make sure your Supabase project is active (not paused)

### "Invalid credentials" error
- Double-check username and password
- Verify the user exists in the `users` table
- Check the password hash matches

### Characters not loading
- Check browser console for errors
- Verify the `characters` table exists
- Check that user_id matches between sessions

### Items not showing
- Check that `enabled = true` for the items
- Verify items exist in the `items` table
- Check browser console for RLS policy errors

---

## Next Steps

After authentication is working:

1. ✅ Test login with admin/player accounts
2. ⬜ Migrate items from data.js to Supabase
3. ⬜ Create real player accounts
4. ⬜ Test character creation flow
5. ⬜ Implement profile features from issue #9
6. ⬜ Add admin item toggle controls
7. ⬜ Deploy to GitHub Pages

---

## Questions?

Ask for help with:
- Migrating items from data.js
- Creating user accounts
- Profile customization
- Any errors you encounter

Let's get your friend playing Baldur's Gate 3! 🎮
