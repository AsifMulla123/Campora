# Admin Account Setup Guide

## Overview
Admin functionality has been implemented in Campora. Admins can:
- Edit and delete any campground (not just their own)
- Delete any review
- Manage user content

## How to Create an Admin Account

### Method 1: Using MongoDB Compass or mongosh (Recommended)

1. **Register a new account** through the application as a normal user
2. **Connect to your MongoDB database** using Compass or mongosh
3. **Find your user** in the `users` collection
4. **Update the user document** to set `isAdmin: true`

Example in mongosh:
```javascript
db.users.updateOne(
  { username: "your_username" },
  { $set: { isAdmin: true } }
)
```

### Method 2: Using Mongo Shell Commands

```bash
mongo
use campora
db.users.updateOne(
  { username: "admin_username" },
  { $set: { isAdmin: true } }
)
```

## Admin Features

### Can Edit/Delete Any Campground
- Admins can edit campgrounds created by any user
- Admins can delete any campground regardless of who created it

### Can Delete Any Review
- Admins can delete reviews written by any user
- Reviews on any campground can be deleted

### Authorization Flow
- When editing/deleting, the system checks: `if user.isAdmin OR user is the original author`
- If neither condition is true, access is denied

## Verifying Admin Status

After setting `isAdmin: true`, log out and log back in to see the changes take effect.

## Making Someone Not Admin

To revoke admin privileges:
```javascript
db.users.updateOne(
  { username: "username" },
  { $set: { isAdmin: false } }
)
```

## Database Structure

The User model now includes:
```javascript
{
  username: String,
  email: String,
  isAdmin: Boolean (default: false),
  // ... other passport-local-mongoose fields
}
```
