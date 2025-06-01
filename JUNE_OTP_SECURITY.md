# June-OTP Security: Preventing Overlapping Sign-ins

## Overview

This implementation prevents multiple Google accounts from using the same june-otp passcode, ensuring each passcode can only be claimed by one user account.

## Problem Solved

Previously, multiple users could potentially use the same 8-digit passcode to register, causing conflicts and security issues. Now each passcode has a one-to-one relationship with a Google account.

## Implementation Details

### Database Changes

The `june-otp` table now includes additional columns to track registration:

```sql
-- New columns added
registered_user_id    UUID         -- References auth.users(id)
registered_email      TEXT         -- Email of claiming user  
registered_at         TIMESTAMP    -- When passcode was claimed
```

### Security Checks

The passcode verification now performs multiple validation checks:

1. **Invalid Passcode Check**: Verifies the 8-digit code exists in the database
2. **Already Registered Check**: Prevents reuse of passcodes marked as `is_register = true`
3. **Different User Check**: Prevents use of passcodes already claimed by another user
4. **Duplicate Registration Check**: Prevents users who already have `general_member` status from registering again

### Validation Flow

```
User enters passcode
    ↓
1. Find passcode in june-otp table
    ↓
2. Check if is_register = true
    ↓ (if false)
3. Check if registered_user_id exists and ≠ current user
    ↓ (if passes)
4. Check if current user already has general_member role
    ↓ (if passes)
5. Update user profile to general_member
    ↓
6. Mark passcode as registered with user info
    ↓
7. Success!
```

## Error Messages

- **Invalid passcode**: "Invalid passcode. Please check and try again."
- **Already used**: "이 인증번호는 이미 사용되었습니다. 다른 인증번호를 사용하거나 문의해주세요."
- **Claimed by another user**: "이 인증번호는 다른 계정에서 이미 사용중입니다. 문의해주세요."
- **User already registered**: "이 계정은 이미 다른 인증번호로 등록되어 있습니다."

## Database Setup

1. **Execute the SQL migration**:
   ```bash
   # Run the SQL commands in database_updates.sql in your Supabase SQL Editor
   ```

2. **Verify the changes**:
   ```sql
   -- Check if columns were added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'june-otp';
   ```

## Features

### One Passcode Per User
- Each passcode can only be claimed by one Google account
- Prevents confusion about which user owns which membership data

### One Account Per Passcode  
- Each Google account can only claim one passcode
- Prevents users from claiming multiple memberships

### Audit Trail
- `registered_user_id`: Tracks which user claimed the passcode
- `registered_email`: Email for easier identification
- `registered_at`: Timestamp of when the claim occurred

### Graceful Error Handling
- Clear Korean error messages for users
- Detailed logging for debugging
- Non-blocking errors for audit trail updates

## Testing Scenarios

1. **Normal Registration**: User with valid unused passcode → Success
2. **Reused Passcode**: User tries already-used passcode → Blocked
3. **Cross-Account Use**: User B tries passcode claimed by User A → Blocked  
4. **Double Registration**: User tries to register twice → Blocked
5. **Invalid Passcode**: User enters non-existent code → Blocked

## Monitoring

Monitor the `june-otp` table for:
- Passcodes with `is_register = true` but no `registered_user_id` (legacy data)
- Multiple attempts on the same passcode (potential misuse)
- Users attempting multiple registrations

## Future Enhancements

- Add rate limiting for passcode attempts
- Add admin panel to view registration history
- Add email notifications for successful registrations
- Add ability to transfer/reassign passcodes (admin only)

## Security Benefits

✅ **Prevents Passcode Sharing**: Each code works only once  
✅ **Prevents Account Conflicts**: Clear ownership of membership data  
✅ **Audit Trail**: Full history of who claimed what when  
✅ **Data Integrity**: Maintains clean user-membership relationships  
✅ **User Experience**: Clear error messages in Korean 