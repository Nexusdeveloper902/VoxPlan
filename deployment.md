# VoxPlan Deployment Guide

This guide describes how to deploy the VoxPlan application (Backend and Frontend) to production.

## Prerequisites
- A [Supabase](https://supabase.com/) account.
- An [Auth0](https://auth0.com/) account.
- A [Render](https://render.com/) or [Railway](https://railway.app/) account for the Backend.
- [Expo Application Services (EAS)](https://expo.dev/eas) account for the Mobile App.

---

## 1. Backend Deployment (Render/Railway)

### Steps:
1. **Push to GitHub**: Ensure your code is in a GitHub repository.
2. **Create Web Service**: Connect your GitHub repo to Render/Railway.
3. **Environment Variables**: Add all variables from `backend/.env.example` to the service's dashboard.
   - Set `ALLOWED_ORIGINS` to `https://your-app-name.expo.app` (or `*` initially).
   - Set `NODE_ENV` to `production`.
4. **Build & Start Commands**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

---

## 2. Supabase Setup

1. **Database Schema**: Execute the content of `backend/schema.sql` in the Supabase SQL Editor.
2. **API Keys**: Get the Project URL and Anon Key from Project Settings -> API and add them to your Backend environment variables.

---

## 3. Auth0 Configuration

1. **Tenant Setup**: Use the domain and client ID from your Auth0 dashboard.
2. **Update URLs**:
   - **Allowed Callback URLs**: `https://auth.expo.io/@your-expo-username/voxplan`
   - **Allowed Logout URLs**: `https://auth.expo.io/@your-expo-username/voxplan`
   - **Allowed Web Origins**: `https://your-backend-url.com`

---

## 4. Frontend Deployment (Expo/EAS)

### Steps:
1. **Install EAS CLI**: `npm install -g eas-cli`
2. **Login**: `eas login`
3. **Initialize Project**: `eas build:configure`
4. **Environment Variables**: Create an `.env` file in the `frontend` folder with the production URLs.
   - `EXPO_PUBLIC_API_URL=https://your-backend-url.onrender.com/api`
5. **Build**:
   - For Play Store (AAB): `eas build --platform android`
   - **For Direct Install (APK)**: `eas build --platform android --profile preview`
   - For iOS: `eas build --platform ios`

> [!TIP]
> **Installing on your phone**: To install the app directly on your Android phone without the Play Store, use the `--profile preview` flag. This will generate an `.apk` file that you can download and install directly.

## 5. EAS Configuration for APKs

To use the `preview` profile, ensure your `eas.json` (in the `frontend` folder) has a preview profile configured for APKs:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

## 6. Post-Deployment Verification
- Test the `/health` endpoint of your backend.
- Log in to the app and verify that task recording and planification still work with the production backend.
