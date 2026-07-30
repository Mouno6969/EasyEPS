# KYC Verification System

A fully self-contained Know Your Customer (KYC) verification system designed to run on VPS or Termux.

## Features
- **Face Matching**: Compares National ID photo with a live selfie using DeepFace.
- **Liveness Detection**: Analyzes video for motion and blinks to prevent spoofing.
- **Local Storage**: No AWS S3 required; all files are stored locally in `./kyc_storage`.
- **Local Database**: Uses SQLite for data persistence.
- **Admin Dashboard**: Review and approve/reject submissions manually.

## Prerequisites
- Python 3.8+
- Node.js 18+
- (Optional) Termux on Android

## Quick Start

1. **Clone the repository** (if applicable) or copy the files.
2. **Run the setup script**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
3. **Run the system**:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

## Accessing the System
- **User Verification**: `http://<your-ip>:3000/kyc`
- **Admin Dashboard**: `http://<your-ip>:3000/admin`
- **Default Admin Login**: You need to register an admin account via the API or directly in the database for the first time.

## Project Structure
- `backend/`: FastAPI application with ML models.
- `frontend/`: Next.js application with Tailwind CSS.
- `kyc_storage/`: Local directory for uploaded ID photos and videos.
- `kyc.db`: SQLite database file.
