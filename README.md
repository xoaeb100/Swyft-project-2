# Swyft Finance — Bank Statement Tool

A desktop bank statement analysis application built for the Swyft Finance Full Stack Engineer take-home assessment.

## Overview

The application is an Electron desktop client with a React + TypeScript UI and a NestJS backend deployed on Google Cloud.

Users can sign in with Google, upload Illion bank statement files in HTML or JSON format, review multiple accounts, identify likely transfers, add transaction tags and annotations, classify a deal as Consumer or Commercial, update deal status, and export transaction data as CSV.

## Architecture

```text
Electron + React + TypeScript
          |
          | HTTPS / authenticated API requests
          v
NestJS API — Google Cloud Run
          |
          +--------------------+
          |                    |
          v                    v
Cloud SQL PostgreSQL      Cloud Storage
          |
          v
PostgreSQL persistence + row-level access controls
```

Authentication uses Google Identity Platform / Firebase Authentication. Google sign-in is initiated from the user's normal browser rather than an Electron renderer window.

The Electron application communicates with the backend API rather than connecting directly to PostgreSQL or Cloud Storage.

## Main Features

### Authentication
- Google sign-in
- Secure Electron authentication flow
- Session persistence across application restarts
- Sign-out support
- Backend authentication on API requests

### Statement processing
- Illion HTML statement parsing
- Illion JSON statement parsing
- Format validation
- Multiple statement files can be selected and parsed together
- Multiple accounts displayed for a deal
- Original statement data/categories are retained
- Statements are persisted through the backend

### Transaction analysis
- Income and expense totals
- Net cash-flow calculation
- Transaction search
- Likely interbank/internal transfer detection
- Consumer / Commercial analysis mode
- Deal status workflow:
  - Uploaded
  - Parsed
  - Checked
  - Completed

### Review and annotation
- Transaction tagging
- Transaction annotations
- Persistent transaction updates
- Transfer highlighting

### Export
- CSV export of the deal's transaction data

## Technology

### Desktop
- Electron
- React
- TypeScript
- Vite
- electron-builder

### Backend
- Node.js
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- REST API

### Google Cloud
- Cloud Run
- Cloud SQL for PostgreSQL
- Cloud Storage
- Secret Manager
- Google Identity Platform / Firebase Authentication

## Running locally

### Prerequisites

- Node.js
- npm
- Google Cloud configuration for backend development
- Firebase / Google authentication configuration

### Backend

```bash
cd backend
npm install
npm run start:dev
```

The backend provides a health endpoint:

```text
GET /health
```

### Desktop

```bash
cd desktop
npm install
npm run dev
```

The desktop application runs the Vite renderer together with Electron.

## Testing

### Desktop parser tests

```bash
cd desktop
npm test
```

The parser tests cover both JSON and HTML statement parsing and validation.

### Backend tests

```bash
cd backend
npm test
```

## Production deployment

The backend is deployed to Google Cloud Run.

The production desktop application communicates with the deployed API over HTTPS.

Production infrastructure includes:

- Google Cloud Run for the API
- Cloud SQL PostgreSQL for application data
- Cloud Storage for uploaded statement files
- Secret Manager for backend secrets

No database or Cloud Storage credentials are embedded in the desktop application.

## Building the desktop application

From the `desktop` directory:

```bash
npm run electron:build
```

This runs the TypeScript/Vite build and electron-builder packaging step.

The generated installer is produced by electron-builder in the desktop build output directory.

## Security

The Electron application is designed around Electron security best practices:

- `contextIsolation` enabled
- `nodeIntegration` disabled
- sandbox enabled
- small preload bridge between Electron and the renderer
- authentication/session information is not exposed as renderer environment secrets
- Google OAuth client secret is kept on the backend
- backend API requests require authentication
- database access is performed by the backend
- uploaded files are stored through the backend rather than directly from the renderer

## Known limitations

This submission focuses on the core statement-analysis workflow.

Known limitations / areas for future improvement include:

- deal archive/delete workflow
- richer deal management UI
- more advanced collaboration features
- more advanced reporting and PDF export
- additional desktop polish and packaging automation

## Submission

This repository contains the source code for the Swyft Finance Bank Statement Tool take-home project.

The GitHub Release contains the packaged Windows installer.

