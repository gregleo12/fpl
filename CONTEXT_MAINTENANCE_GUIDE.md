# Context Files Maintenance Guide

**Purpose:** Keep Claude Code's memory fresh across sessions by maintaining project context files.

---

## Overview

Claude Code has these key "memory files" that help maintain project context:
1. **`CLAUDE.md`** - Main context file (auto-read at session start)
2. **`VERSION_HISTORY.md`** - Changelog index with links to detailed version files
3. **`DATABASE.md`** - Database tables, K-27 caching, sync scripts
4. **`ENDPOINTS.md`** - All API routes and data sources
5. **`ARCHITECTURE.md`** - File structure and data flow
6. **`DEPLOYMENT.md`** - How to deploy to staging/production
7. **`README.md`** - Project overview (update version number when bumping)

Without these, Claude Code forgets everything between sessions and repeats mistakes.

---

## File Purposes

### `CLAUDE.md` (Main Context - Auto-Read)
**What it is:** Complete project documentation including critical rules, architecture, bugs, and fixes
**Auto-loaded:** Claude Code automatically reads this file at the start of each session
**Updates:** Frequently - after major bugs/features/discoveries
**Think of it as:** The single source of truth for project knowledge

**Update when:**
- Fixing a bug
- Adding a feature
- Discovering architecture insights
- Finding critical rules or patterns
- Deployment process changes

**Key sections:**
- Required Reading (links to other docs)
- Critical Rules (database, deployment, K-27 caching)
- Quick Reference (URLs, database, test data)
- Recent Bugs (don't repeat these)
- After Every Task Checklist
- Common Commands

---

### `VERSION_HISTORY.md` (Changelog)
**What it is:** Complete version history with detailed changes
**Updates:** After every version bump
**Think of it as:** Git commit messages expanded with context

**Update when:**
- Bumping version number
- Deploying a new release
- Documenting what changed in each version

---

## When to Update

### ✅ Always Update After:
1. **Fixing a major bug** → Document in CLAUDE.md + version entry
2. **Adding a feature** → Update architecture section + version entry
3. **Discovering a mistake pattern** → Add to Critical Rules in CLAUDE.md
4. **Changing deployment process** → Update deployment section
5. **Version bump** → Add entry to VERSION_HISTORY.md

### ⏭️ Don't Update For:
- Minor typo fixes
- UI tweaks that don't affect logic
- Simple text changes
- Temporary debugging code

---

## Update Procedures

### Procedure 1: After Fixing a Bug

**Tell Claude Code:**
```
We fixed [bug name]! Update CLAUDE.md:

Move "[Bug Name]" from "IN PROGRESS" to "FIXED":

### ✅ FIXED: [Bug Name] (v[version])
- **Problem**: [What was broken]
- **Root Cause**: [Why it happened]
- **Solution**: [How we fixed it]
- **Never Do**: [What to avoid in future]

Then commit the update.
```

---

### Procedure 2: After Adding a Feature

**Tell Claude Code:**
```
Update CLAUDE.md with new feature:

Add to "Key Files":
- `/src/[path]/[file].ts` - [Description of what it does]

Then add to VERSION_HISTORY.md:
### v[version] - [Feature Name] ([Date])
**FEATURE:** [Brief description]
- Added: [what was added]
- Changed: [what changed]
- Files: [affected files]

Commit the changes.
```

---

### Procedure 3: Discovering a New Critical Rule

**Tell Claude Code:**
```
Update CLAUDE.md Critical Rules section:

Add new rule to relevant subsection:
- [Description of rule and why it matters]

Commit the update.
```

**Example:**
```
Update CLAUDE.md Critical Rules section:

Under "Database API Routes" add note:
- This prevents build-time rendering failures when postgres.railway.internal is unavailable

Commit the update.
```

---

### Procedure 4: End of Session Maintenance

**Tell Claude Code:**
```
Before we finish, update context files with today's work:

1. What bugs did we fix? (move from IN PROGRESS to FIXED in CLAUDE.md)
2. What features did we add? (update Key Files + VERSION_HISTORY.md)
3. What new rules should we document? (add to Critical Rules in CLAUDE.md)
4. Any version bumps? (update VERSION_HISTORY.md)

Update both files accordingly, then commit.
```

---

## Quick Reference: What Goes Where

| Type of Update | File to Update | Section |
|----------------|---------------|---------|
| Bug fixed | `CLAUDE.md` | Recent Bugs section |
| New feature | `ARCHITECTURE.md` | Key Files or Component section |
| Critical rule | `CLAUDE.md` | Critical Rules section |
| Architecture change | `ARCHITECTURE.md` | Relevant section |
| Deployment change | `DEPLOYMENT.md` | Relevant section |
| Version details | `VERSION_HISTORY.md` | Add new version entry |
| Version bump | `README.md` | Update Current Version |
| New API endpoint | `ENDPOINTS.md` | Add to endpoint table |
| Database change | `DATABASE.md` | Add table/script documentation |

---

## Sample Workflow

### Example: Fixed the admin panel showing zeros

**Step 1: Verify the fix works**
- Test on production
- Confirm bug is resolved

**Step 2: Tell Claude Code to update**
```
Perfect! The admin panel is fixed. Now update the context:

In CLAUDE.md:
1. Move "Admin Panel Showing Zeros" from "IN PROGRESS" to "FIXED"
2. Change it to:

### ✅ FIXED: Admin Panel Showing Zeros (v2.0.16)
- **Problem**: Admin panel returned all zeros despite database having 23,958 records
- **Root Cause**: Next.js prerendering at build time when postgres.railway.internal unavailable
- **Solution**: Added `export const dynamic = 'force-dynamic'` to admin API routes
- **Testing**: Verified admin panel shows real data

3. In VERSION_HISTORY.md add:

### v2.0.16 - Fix Admin Panel - Add force-dynamic (Dec 8, 2025)
**CRITICAL FIX:** Admin panel now displays real analytics data instead of zeros
- Problem: Admin panel showing all zeros despite database having 23,958 records
- Root Cause: Next.js tried to prerender admin routes during build
- Fixed: Added 'export const dynamic = force-dynamic' to admin API routes
- Files: `api/admin/stats/route.ts`, `api/admin/leagues/route.ts`

4. Commit with message: "v2.0.16: Document admin panel fix"
```

**Step 3: Done!**
Next session, Claude Code will automatically read CLAUDE.md and remember the fix.

---

## Will Claude Code Update Automatically?

**No.** You must explicitly tell him to update the context files.

❌ **What doesn't work:**
- Expecting him to remember on his own
- Assuming he'll update after fixing bugs
- Hoping he reads his own past work

✅ **What works:**
- Explicitly saying "Update CLAUDE.md with..."
- Making it a habit at end of sessions
- Being specific about what to document

---

## Best Practices

### ✅ DO:
- Update immediately after fixing bugs (while fresh in memory)
- Be specific in update instructions
- Commit context updates separately with clear messages
- Review the git diff before committing
- Make end-of-session updates a habit

### ❌ DON'T:
- Forget to update after major fixes
- Be vague ("update the context")
- Mix context updates with code commits
- Assume Claude Code will remember to update
- Skip documenting "small" bugs (they add up!)

---

## Emergency: Lost Context

If context files get out of sync or corrupted:

**Step 1: Check git history**
```
git log --oneline -- CLAUDE.md VERSION_HISTORY.md
```

**Step 2: Restore from last good version**
```
git checkout <commit-hash> -- CLAUDE.md VERSION_HISTORY.md
```

**Step 3: Rebuild from recent work**
```
Tell Claude Code:

Read the last 20 commits:
git log --oneline -20

Then update CLAUDE.md to reflect:
- Recent bug fixes
- Features added
- Current version
```

---

## Sample Update Command Templates

### Template 1: Quick Bug Fix Update
```
Update CLAUDE.md:

Move [Bug Name] to FIXED section with:
- Problem: [one sentence]
- Solution: [one sentence]
- Version: v[X.Y.Z]

Add to VERSION_HISTORY.md:
- v[X.Y.Z] entry with bug details

Commit: "Document [bug] fix"
```

---

### Template 2: Feature Addition Update
```
Update CLAUDE.md:

Add to Key Files:
- [filepath] - [description]

Update VERSION_HISTORY.md:
- v[X.Y.Z] - Added [feature]

Commit: "Document [feature] addition"
```

---

### Template 3: Critical Rule Update
```
Update CLAUDE.md:

Add to "Critical Rules" section:
- [Rule description and why it matters]

Commit: "Add rule: [short description]"
```

---

### Template 4: End of Session Update
```
End of session update:

Review today's work and update CLAUDE.md:
1. Fixed bugs: [list]
2. Added features: [list]
3. Version bumped to: v[X.Y.Z]

Move relevant items from IN PROGRESS to FIXED.
Update VERSION_HISTORY.md with version entries.

Commit: "Context update: [date] session"
```

---

## Integration with Development Workflow

### Standard Development Flow:

```
1. Identify bug/feature
2. Fix/implement
3. Test locally (npm run build)
4. UPDATE CONTEXT FILES ← Don't forget this!
5. Commit code changes
6. Commit context updates (separate commit)
7. Push to deploy
8. Verify on production
```

### Good Commit History Example:

```
git log --oneline

a1b2c3d Update context: document admin panel fix (v2.0.16)
e4f5g6h Fix admin panel with force-dynamic
h7i8j9k Update context: add multi-league feature
k0l1m2n Implement multi-league support (v2.0.0)
```

Notice: Code commits and context commits are **separate** for clarity.

---

## Summary

**The Golden Rule:**
**After every major fix or feature, explicitly tell Claude Code to update CLAUDE.md and VERSION_HISTORY.md.**

**Make it a habit:**
Before ending each work session, run the "End of Session Update" procedure.

**Remember:**
CLAUDE.md is Claude Code's memory (automatically loaded each session). Keep it updated, and he'll remember. Neglect it, and he'll repeat mistakes.

---

## Quick Start Checklist

Setting up for the first time:

- [ ] `CLAUDE.md` created in project root (auto-read by Claude Code)
- [ ] `VERSION_HISTORY.md` created in project root
- [ ] Both files committed to git
- [ ] This guide saved in project root
- [ ] First update test completed successfully

---

**File Location:** Save this as `CONTEXT_MAINTENANCE_GUIDE.md` in project root.

**Next Steps:**
1. Give this to Claude Code to read
2. Practice with one update
3. Make it a habit

**Questions?** Reference this guide whenever you're unsure about updating context files.
