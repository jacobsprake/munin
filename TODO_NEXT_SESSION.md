# TODO: Next Session

**Quick Reference** – Copy/paste when you resume.  
**Saved state**: Feb 4, 2026 – see `SAVED_STATE.md` for full resume instructions.

---

## 🚀 Quick Start (5 minutes)

```bash
# 1. Navigate to project
cd "/Users/jacoblsprake/Library/Mobile Documents/com~apple~CloudDocs/Sprake/Business and Entrepreneurship/SPRLABS/Munin"

# 2. Install dependencies
npm install @noble/ed25519
cd engine && pip install requests && cd ..

# 3. Test single sign-off
cd engine
python3 test_single_signoff.py

# 4. Test polling (once)
python3 poll_ea_api.py --once

# 5. Start Next.js
cd ..
npm run dev
# Then open: http://localhost:3000/carlisle-dashboard
```

---

## ✅ Expected Results

### Single Sign-Off Test
Should show: `✅ PASS: Threshold is 1 (single sign-off)`

### Polling Script
Should show: Station checks and threshold status

### Dashboard
Should show: Real-time metrics with baseline comparison

---

## 📝 If Something Doesn't Work

1. **Check dependencies installed**: `npm list @noble/ed25519`
2. **Check Python requests**: `python3 -c "import requests; print('OK')"`
3. **Check Next.js running**: Look for "Ready" message
4. **Check API accessible**: `curl http://localhost:3000/api/health`

---

## 📚 Full Details

See `SESSION_STATUS.md` for complete status and documentation.
