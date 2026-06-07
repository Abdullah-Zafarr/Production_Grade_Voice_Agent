# Implementation Rationale - Saif_updated

This document explains the technical reasoning and implementation strategies for the changes made to the Soul Imaging system.

## 1. Call Deletion System

### Why:
Patient privacy and data management are critical. Clinic administrators needed a way to remove sensitive call logs and associated audio recordings once they were no longer needed or if requested by a patient.

### How:
- **Backend**: Implemented a `DELETE /api/calls/{call_id}` endpoint. Crucially, it doesn't just delete the database record; it also triggers a storage cleanup function (`supabase_storage_delete`) to ensure the `.mp3` file is purged from Supabase Storage, preventing "orphaned" files and saving storage space.
- **Frontend**: Added a trash icon to the `CallHistory` table with a double-layered confirmation (`window.confirm`) to prevent accidental data loss.

## 2. Admin-Only Role Migration

### Why:
The original system had complex "Viewer," "Manager," and "Admin" roles. For a standard medical clinic, this adds unnecessary overhead and confusion. Simplifying to a single administrative level ensures that all authorized staff have the tools they need without permission-based friction.

### How:
- **Backend Enforcement**: Modified `add_team_member` to hardcode the role to `"Admin"` regardless of what the UI sends. This ensures the database remains consistent even if frontend bypasses are attempted.
- **UI Simplification**: Removed the role selection dropdown from `TeamManagement.tsx`. If there's only one role, there's no need for a selection menu, making the interface cleaner and faster to use.

## 3. System Stability & Build Optimization

### Why:
The project had several "ghost" dependencies and folder naming conflicts (e.g., a legacy Vite `src` folder inside a Next.js project) that were causing production build failures.

### How:
- **Dependency Restoration**: Re-installed `react-router-dom` and restored the shadcn/ui `utils.ts` file. These are core utilities that were missing from the environment.
- **Folder Conflict Resolution**: Renamed the legacy `src` folder to `src_vite_backup_2`. Next.js 15+ sometimes gets confused when it sees a standard `src` folder alongside its own app structure; renaming it cleared the build path.

## 4. Security & Failsafe Access

### Why:
Hardcoding credentials is a major security risk. However, clinics need a "master key" in case the database is disconnected or the team table is empty.

### How:
- **Bcrypt Hashing**: Instead of plain-text passwords, the system now uses bcrypt hashing for the fallback admin account in `.env`.
- **Environment Driven**: Moved fallback credentials to environment variables (`ADMIN_FALLBACK_EMAIL`, `ADMIN_PASSWORD_HASH`), allowing the clinic owner to change their master password without touching the code.

## 5. Global Data Reset

### Why:
During development, test calls accumulate. A "Reset" was needed to move the system from a "testing" state to a "clean" state for actual clinic operations.

### How:
- Developed a specialized utility script that performed a bulk deletion across both the database and the S3 storage bucket, ensuring a 100% clean state for the final hand-off.
