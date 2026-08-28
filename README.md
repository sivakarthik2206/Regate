# Regate

Regate is a healthcare analytics product scaffold for building predictive, operational, and hospital performance workflows.

## Project Structure

- `backend/`: Python API scaffold for analytics, prediction, and hospital data endpoints
- `data/`: raw and processed healthcare datasets
- `notebooks/`: exploratory analysis and model development notebooks
- `models/`: serialized models and training artifacts
- `frontend/`: Next.js 14 application for the product UI

## Backend

The backend scaffold is organized as a small API package:

- `api/main.py`: application entry point
- `api/routes/`: route handlers for predictions, analytics, and hospitals
- `api/schemas/`: request and response schemas

## Frontend

The frontend scaffold uses:

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- React Query
- Axios
- Recharts
- Framer Motion
- Lucide React

## Getting Started

1. Copy environment examples:
   - `backend/.env.example`
   - `frontend/.env.local.example`
2. Install backend dependencies with your preferred Python environment manager.
3. Install frontend dependencies with `npm install` when you are ready.

## Notes

- Raw data files in `data/raw/` are preserved.
- Empty scaffold folders include `.gitkeep` files so they remain in source control.
- Dependency installation is intentionally not run as part of this scaffold.
