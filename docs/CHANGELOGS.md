# Project Changelog - Soul Imaging System

This document tracks all modifications, bug fixes, and feature additions made during the local environment setup and system update session.

## 📊 Summary of Changes

| File Path | Lines Changed | Type | Description |
| :--- | :---: | :---: | :--- |
| [agent/api.py](file:///c:/Users/USER/Downloads/soul-imaging-new-main/agent/api.py) | 56 | MOD | Added delete call endpoint, storage cleanup helper, and simplified role logic. |
| [CallHistory.tsx](file:///c:/Users/USER/Downloads/soul-imaging-new-main/frontend/Soulbot_Updated/Admin/pages-content/CallHistory.tsx) | 30 | MOD | Integrated delete button, confirmation prompts, and state management for log removal. |
| [TeamManagement.tsx](file:///c:/Users/USER/Downloads/soul-imaging-new-main/frontend/Soulbot_Updated/Admin/pages-content/TeamManagement.tsx) | 15 | MOD | Simplified UI to Admin-only mode by removing role selection and unifying display. |
| [.env](file:///c:/Users/USER/Downloads/soul-imaging-new-main/.env) | 35 | NEW | Initialized environment configuration with API keys and fallback admin credentials. |
| [Admin/.env.local](file:///c:/Users/USER/Downloads/soul-imaging-new-main/frontend/Soulbot_Updated/Admin/.env.local) | 2 | NEW | Added build-time environment variables to satisfy Next.js requirements. |
| [Admin/lib/utils.ts](file:///c:/Users/USER/Downloads/soul-imaging-new-main/frontend/Soulbot_Updated/Admin/lib/utils.ts) | 5 | NEW | Restored missing shadcn/ui utility file to resolve compilation errors. |
| [Admin/package.json](file:///c:/Users/USER/Downloads/soul-imaging-new-main/frontend/Soulbot_Updated/Admin/package.json) | 1 | MOD | Installed `react-router-dom` to fix missing dependency in Admin dashboard. |

## 🛠️ Detailed Modifications

### 1. Backend Enhancements (`agent/api.py`)
- **[NEW]** `DELETE /api/calls/{call_id}`: Handles database record removal.
- **[NEW]** `supabase_storage_delete`: Automates the deletion of recording files (`.mp3`) from Supabase Storage when a call is removed.
- **[REFACTORED]** Role Logic: Forced all new team members and fallback admins to the `"Admin"` role, removing legacy `"Viewer"` and `"Manager"` complexity.

### 2. Frontend Features (`Admin Dashboard`)
- **Call History**: Added `Trash2` icons and logic to trigger the backend deletion. Implemented `toast` notifications for user feedback.
- **Team Management**: Replaced the role selection dropdown with a static "Admin" indicator and simplified the table rows to match the new role model.

### 3. Build & Stability Fixes
- **Conflict Resolution**: Renamed the redundant `src` folder (legacy Vite code) to `src_vite_backup_2` to allow Next.js to build without naming conflicts.
- **Dependency Restoration**: Fixed broken imports by restoring `lib/utils.ts` and installing missing routing libraries.

### 4. Maintenance
- **System Reset**: Developed and executed a cleanup script to purge legacy call logs and reset the dashboard to a zero-state.
- **Credential Management**: Implemented bcrypt-hashed fallback admin support for emergency dashboard access.

---
**Current Status**: `STABLE`
**Environment**: `DEVELOPMENT / LOCAL`
