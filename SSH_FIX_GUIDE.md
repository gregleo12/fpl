# SSH Authentication Fix Guide

## Current Situation

Your SSH key is being **offered** to the NAS but **rejected**. This means:
- ✅ SSH key exists locally
- ✅ SSH agent is working
- ✅ NAS SSH service is running
- ❌ NAS is rejecting the key (likely not in authorized_keys or wrong location)

## Diagnostic Output

From `./scripts/diagnose-ssh.sh`:
```
debug1: Offering public key: /Users/matos/.ssh/id_ed25519 ED25519
debug1: Authentications that can continue: publickey,password
```

This means the key was offered but rejected by the NAS.

## Solutions (Try in Order)

### Option 1: Use ssh-copy-id (Simplest)

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub gregleo@192.168.1.49
```

Enter your NAS password when prompted. This automatically:
- Creates ~/.ssh directory with correct permissions
- Adds your key to authorized_keys
- Sets correct file permissions

Then test:
```bash
ssh -o BatchMode=yes gregleo@192.168.1.49 "echo Success"
```

### Option 2: Manual Setup (If ssh-copy-id fails)

#### Step 1: Log into NAS

```bash
ssh gregleo@192.168.1.49
```

#### Step 2: Set up SSH directory

```bash
# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### Step 3: Add your public key

From your Mac, copy the public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the output (starts with `ssh-ed25519 AAAAC3...`)

On the NAS, add it to authorized_keys:
```bash
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICB3D0DOzGtjhfejWkuoald1Ub6JlV74fiqDCN1WDCWh matos@Gregs-MacBook-Pro.local" >> ~/.ssh/authorized_keys
```

#### Step 4: Check Synology-specific locations

Synology might use `/var/services/homes/gregleo` instead of the shell home:

```bash
# On NAS, check which home directory SSH uses
echo $HOME
pwd

# If it shows /var/services/homes/gregleo, also setup there:
mkdir -p /var/services/homes/gregleo/.ssh
chmod 700 /var/services/homes/gregleo/.ssh
cp ~/.ssh/authorized_keys /var/services/homes/gregleo/.ssh/
chmod 600 /var/services/homes/gregleo/.ssh/authorized_keys
chown -R gregleo:users /var/services/homes/gregleo/.ssh
```

#### Step 5: Verify permissions

```bash
# On NAS
ls -la ~/.ssh/
# Should show:
# drwx------ .ssh/
# -rw------- authorized_keys
```

#### Step 6: Check SSH daemon config

```bash
# On NAS
cat /etc/ssh/sshd_config | grep -i "AuthorizedKeysFile"
cat /etc/ssh/sshd_config | grep -i "PubkeyAuthentication"
```

Should show:
```
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

#### Step 7: Exit and test

```bash
exit  # Exit NAS

# On Mac, test
ssh -o BatchMode=yes gregleo@192.168.1.49 "echo Success"
```

### Option 3: Restart SSH Service on Synology

Sometimes the SSH daemon needs to be restarted:

1. Open Synology DSM web interface
2. Go to **Control Panel** → **Terminal & SNMP**
3. **Uncheck** "Enable SSH service"
4. Click **Apply**
5. Wait 10 seconds
6. **Check** "Enable SSH service" again
7. Click **Apply**
8. Test SSH again

### Option 4: Check SSH Logs

On the NAS, check what's happening:

```bash
ssh gregleo@192.168.1.49
tail -f /var/log/messages | grep sshd
```

Then from another terminal, try to connect:
```bash
ssh -v gregleo@192.168.1.49
```

Look for errors in the log like:
- "Authentication refused: bad ownership or modes"
- "User gregleo not allowed"
- "Could not open authorized keys"

## Scripts Available

### Diagnostic Script
```bash
./scripts/diagnose-ssh.sh
```
Shows current SSH configuration and what's wrong.

### Simple Fix (uses ssh-copy-id)
```bash
./scripts/fix-ssh-simple.sh
```
Uses standard ssh-copy-id to set up keys.

### Advanced Fix
```bash
./scripts/fix-ssh-auth.sh
```
Handles Synology-specific directory structures.

## Common Synology Issues

### Issue 1: Multiple Home Directories

Synology uses different home directories:
- Shell home: `/var/services/homes/gregleo`
- User home: `/volume1/homes/gregleo`
- Root shows: `/root`

SSH might check a different location than where you put the key.

**Solution**: Put authorized_keys in ALL locations.

### Issue 2: User Permissions

The `gregleo` user might not have proper group membership.

**Check**:
```bash
ssh gregleo@192.168.1.49 "id"
```

Should show user in `users` or `administrators` group.

### Issue 3: SELinux or AppArmor

Some Synology models have additional security.

**Check**:
```bash
ssh gregleo@192.168.1.49 "getenforce 2>/dev/null || echo 'Not applicable'"
```

If enabled, might need to update security contexts.

## After SSH Works

Once passwordless SSH is working, deploy the app:

```bash
# 1. Install dependencies
npm install

# 2. Setup NAS
./scripts/setup-nas.sh

# 3. Deploy
./scripts/deploy.sh "Initial deployment"

# 4. Access app
open http://192.168.1.49:3000
```

## Still Not Working?

If none of the above works:

### Last Resort Option: Use Password-Based Git

Modify `deploy.sh` to use HTTP/password instead of SSH:

```bash
# Instead of: ssh://gregleo@192.168.1.49/volume1/git/fpl.git
# Use: http://192.168.1.49:8080/git/fpl.git (if Synology Git Server is installed)
```

Or use a different deployment method:
- rsync with password
- SCP scripts
- Synology's built-in Git server

### Contact Support

If this is a corporate/managed NAS, your IT team might have:
- Disabled SSH key authentication
- Restricted which users can use SSH keys
- Custom SSH configurations

Check with your Synology administrator.

## Verification Checklist

- [ ] SSH key exists locally (`~/.ssh/id_ed25519`)
- [ ] SSH key is added to agent (`ssh-add -l`)
- [ ] Can connect with password (`ssh gregleo@192.168.1.49`)
- [ ] .ssh directory exists on NAS with 700 permissions
- [ ] authorized_keys exists with 600 permissions
- [ ] authorized_keys contains your public key
- [ ] PubkeyAuthentication is enabled in sshd_config
- [ ] SSH service has been restarted
- [ ] Can connect without password (`ssh -o BatchMode=yes gregleo@192.168.1.49 "echo test"`)

Once all items are checked, you're ready to deploy!
