# Context Files Maintenance Guide

**Purpose:** Keep Claude Code's memory fresh across sessions by maintaining project context files.

---

## Overview

Claude Code has three "memory files" that help him remember:
1. **`.cursorrules`** - Quick reference card (critical rules)
2. **`CLAUDE_CODE_CONTEXT.md`** - Full manual (architecture, bugs, fixes)
3. **`.claude/SKILL.md`** - Backup copy

Without these, Claude Code forgets everything between sessions and repeats mistakes.

---

## File Purposes

### `.cursorrules` (Reference Card)
**What it is:** Short, critical rules that prevent disasters
**Updates:** Rarely - only when discovering new critical patterns
**Think of it as:** "DO NOT TOUCH" signs and safety warnings

**Update when:**
- Discovering a new critical rule
- Finding a pattern that causes major bugs
- Adding a new "never do this" item

**Example content:**
- Never touch `/src/hooks/usePullToRefresh.ts`
- Bonus calculations must group by fixture first
- Always test on mobile before deploying

---

### `CLAUDE_CODE_CONTEXT.md` (Full Manual)
**What it is:** Complete project documentation with history
**Updates:** Frequently - after major bugs/features
**Think of it as:** Employee handbook with lessons learned

**Update when:**
- Fixing a bug
- Adding a feature
- Discovering architecture insights
- Deploying a new version

**Example content:**
- How the app works (architecture)
- Past bugs and their fixes
- Current known issues
- Deployment procedures
- Testing checklists

---

## When to Update

### ✅ Always Update After:
1. **Fixing a major bug** → Document the fix
2. **Adding a feature** → Update architecture section
3. **Discovering a mistake pattern** → Add to "Common Mistakes"
4. **Changing deployment process** → Update deployment section
5. **Version bump** → Add to version history

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
We fixed [bug name]! Update CLAUDE_CODE_CONTEXT.md:

Move "[Bug Name]" from "IN PROGRESS" to "FIXED":

### ✅ FIXED: [Bug Name] (v[version])
- **Problem**: [What was broken]
- **Root Cause**: [Why it happened]
- **Solution**: [How we fixed it]
- **Never Do**: [What to avoid in future]

Then commit the update.
```

**Example:**
```
We fixed the bonus bug! Update CLAUDE_CODE_CONTEXT.md:

Move "Provisional Bonus" from "IN PROGRESS" to "FIXED":

### ✅ FIXED: Provisional Bonus Bug (v1.7.2)
- **Problem**: Bonus given to wrong players (all players getting bonus)
- **Root Cause**: Not grouping by fixture - calculating globally
- **Solution**: Fixed calculateProvisionalBonus() to group by fixtureId first
- **Never Do**: Calculate bonus across all players without fixture grouping

Then commit the update.
```

---

### Procedure 2: After Adding a Feature

**Tell Claude Code:**
```
Update CLAUDE_CODE_CONTEXT.md with new feature:

Add to "Key Files":
- `/src/[path]/[file].ts` - [Description of what it does]

Add to "Version History":
- v[version] - Added [feature name]

Commit the changes.
```

**Example:**
```
Update CLAUDE_CODE_CONTEXT.md with new feature:

Add to "Key Files":
- `/src/lib/awards.ts` - Weekly awards calculations (Top Gun, Bench Disaster)

Add to "Version History":
- v1.8.0 - Added weekly awards system

Commit the changes.
```

---

### Procedure 3: Discovering a New Critical Rule

**Tell Claude Code:**
```
Update .cursorrules with new rule:

Add under "Common Mistakes to Avoid":
- [Description of mistake and correct approach]

Commit the update.
```

**Example:**
```
Update .cursorrules with new rule:

Add under "Common Mistakes to Avoid":
- Don't calculate differential totals separately from main scores - use unified logic from fpl-calculations.ts

Commit the update.
```

---

### Procedure 4: End of Session Maintenance

**Tell Claude Code:**
```
Before we finish, update context files with today's work:

1. What bugs did we fix? (move from IN PROGRESS to FIXED)
2. What features did we add? (update Key Files + Version History)
3. What new mistakes should we avoid? (add to Common Mistakes)
4. Any version bumps? (update Version History)

Update CLAUDE_CODE_CONTEXT.md and .cursorrules accordingly, then commit.
```

---

## Quick Reference: What Goes Where

| Type of Update | File to Update | Section |
|----------------|---------------|---------|
| Bug fixed | `CLAUDE_CODE_CONTEXT.md` | Known Issues & Solutions (move to FIXED) |
| New feature | `CLAUDE_CODE_CONTEXT.md` | Key Files + Version History |
| Critical rule | `.cursorrules` | Common Mistakes to Avoid |
| Architecture change | `CLAUDE_CODE_CONTEXT.md` | Architecture section |
| Deployment change | `CLAUDE_CODE_CONTEXT.md` | Deployment Process |
| Version bump | `CLAUDE_CODE_CONTEXT.md` | Version History |
| Testing insight | `CLAUDE_CODE_CONTEXT.md` | Testing Checklist |

---

## Sample Workflow

### Example: Fixed the bonus calculation bug

**Step 1: Verify the fix works**
- Test on production
- Confirm bug is resolved

**Step 2: Tell Claude Code to update**
```
Perfect! The bonus bug is fixed. Now update the context:

In CLAUDE_CODE_CONTEXT.md:

1. Move "Provisional Bonus (v1.7.0+)" from "IN PROGRESS" to "FIXED"
2. Change it to:

### ✅ FIXED: Provisional Bonus Bug (v1.7.2)
- **Problem**: Bonus awarded to wrong players across entire team
- **Root Cause**: calculateProvisionalBonus() not grouping by fixtureId
- **Solution**: Added fixture grouping - only top 3 BPS per match get bonus
- **Testing**: Verified Sánchez and Muñoz no longer get incorrect bonus

3. Update Version History:
- v1.7.2 - Fixed provisional bonus fixture grouping bug

4. Commit with message: "Update context: document provisional bonus fix"
```

**Step 3: Verify update**
```
Show me the git diff to verify the changes look correct.
```

**Step 4: Done!**
Next session, Claude Code will read this and remember the fix.

---

## Common Update Patterns

### Pattern: Bug Discovery → Fix → Document

```
1. Bug discovered: "Bonus giving points to wrong players"
2. Bug fixed: Update calculateProvisionalBonus()
3. Document:
   - Move from IN PROGRESS to FIXED
   - Explain root cause
   - Document solution
   - Add "Never Do" warning
```

---

### Pattern: Feature Planning → Implementation → Document

```
1. Feature planned: "Add weekly awards"
2. Feature implemented: Create awards.ts
3. Document:
   - Add to Key Files
   - Update Version History
   - Add testing notes if needed
```

---

### Pattern: Mistake Made → Fixed → Prevent Future

```
1. Mistake: Broke modal scrolling by modifying pull-to-refresh
2. Fixed: Reverted changes
3. Document:
   - Add to .cursorrules: "Never touch usePullToRefresh.ts"
   - Add to FIXED issues with explanation
   - Add to Common Mistakes
```

---

## Will Claude Code Update Automatically?

**No.** You must explicitly tell him to update the context files.

❌ **What doesn't work:**
- Expecting him to remember on his own
- Assuming he'll update after fixing bugs
- Hoping he reads his own past work

✅ **What works:**
- Explicitly saying "Update CLAUDE_CODE_CONTEXT.md with..."
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

## Verification Checklist

After updating context files, verify:

- [ ] Bug moved from "IN PROGRESS" to "FIXED"?
- [ ] Root cause explained?
- [ ] Solution documented?
- [ ] Version history updated?
- [ ] New files added to "Key Files"?
- [ ] Critical rules added to `.cursorrules`?
- [ ] Changes committed with clear message?
- [ ] Git diff reviewed and correct?

---

## Emergency: Lost Context

If context files get out of sync or corrupted:

**Step 1: Check git history**
```
git log --oneline -- CLAUDE_CODE_CONTEXT.md .cursorrules
```

**Step 2: Restore from last good version**
```
git checkout <commit-hash> -- CLAUDE_CODE_CONTEXT.md .cursorrules
```

**Step 3: Rebuild from recent work**
```
Tell Claude Code:

Read the last 20 commits:
git log --oneline -20

Then update CLAUDE_CODE_CONTEXT.md to reflect:
- Recent bug fixes
- Features added
- Current version
```

---

## Sample Update Command Templates

### Template 1: Quick Bug Fix Update
```
Update CLAUDE_CODE_CONTEXT.md:

Move [Bug Name] to FIXED section with:
- Problem: [one sentence]
- Solution: [one sentence]
- Version: v[X.Y.Z]

Commit: "Document [bug] fix"
```

---

### Template 2: Feature Addition Update
```
Update CLAUDE_CODE_CONTEXT.md:

Add to Key Files:
- [filepath] - [description]

Add to Version History:
- v[X.Y.Z] - Added [feature]

Commit: "Document [feature] addition"
```

---

### Template 3: Critical Rule Update
```
Update .cursorrules:

Add to "Never Touch These" OR "Common Mistakes to Avoid":
- [Rule description]

Commit: "Add rule: [short description]"
```

---

### Template 4: End of Session Update
```
End of session update:

Review today's work and update CLAUDE_CODE_CONTEXT.md:
1. Fixed bugs: [list]
2. Added features: [list]
3. Version bumped to: v[X.Y.Z]

Move relevant items from IN PROGRESS to FIXED.
Update Version History.

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

a1b2c3d Update context: document bonus fix (v1.7.2)
e4f5g6h Fix provisional bonus fixture grouping bug
h7i8j9k Update context: add weekly awards feature
k0l1m2n Implement weekly awards system (v1.8.0)
n3o4p5q Add rule: never calculate bonus globally
```

Notice: Code commits and context commits are **separate** for clarity.

---

## Troubleshooting

### Problem: Claude Code forgot about a fix
**Solution:** Check if it's documented in CLAUDE_CODE_CONTEXT.md. If not, add it now.

### Problem: .cursorrules getting too long
**Solution:** Keep only critical rules here. Move detailed explanations to CLAUDE_CODE_CONTEXT.md.

### Problem: Context file conflicts after merge
**Solution:** Review both versions, keep most recent fixes, commit merged version.

### Problem: Not sure what to document
**Solution:** Ask yourself: "Would I want to remember this in 3 months?" If yes, document it.

---

## Summary

**The Golden Rule:**
**After every major fix or feature, explicitly tell Claude Code to update the context files.**

**Make it a habit:**
Before ending each work session, run the "End of Session Update" procedure.

**Remember:**
These files are Claude Code's memory. Keep them updated, and he'll remember. Neglect them, and he'll repeat mistakes.

---

## Quick Start Checklist

Setting up for the first time:

- [ ] `.cursorrules` created in project root
- [ ] `CLAUDE_CODE_CONTEXT.md` created in project root
- [ ] `.claude/SKILL.md` backup created
- [ ] All files committed to git
- [ ] This guide saved in project memory
- [ ] First update test completed successfully

---

**File Location:** Save this as `CONTEXT_MAINTENANCE_GUIDE.md` in project root.

**Next Steps:**
1. Give this to Claude Code to read
2. Practice with one update
3. Make it a habit

**Questions?** Reference this guide whenever you're unsure about updating context files.
