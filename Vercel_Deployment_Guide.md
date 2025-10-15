# 🚀 Vercel Deployment Guide for Manchitra

## ✅ Complete Vercel Configuration

এখানে আপনার Vercel deployment এর জন্য সম্পূর্ণ configuration দেওয়া হল:

### **📁 Files Created/Updated**

1. **`vercel.json`** - Vercel deployment configuration
2. **`next.config.mjs`** - Updated with production optimizations
3. **`package.json`** - Added Vercel build script

## 🔧 Step-by-Step Deployment

### **Step 1: Environment Variables Setup**

Vercel Dashboard এ যান এবং আপনার project এর **Settings → Environment Variables** এ যান:

```env
# Required Environment Variables
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-super-secret-jwt-key-here

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/manchitra
MONGODB_DB=manchitra

# Email (Optional - for OTP login)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=Manchitra <no-reply@yourdomain.com>

# Admin Email (for reports)
EMAIL_ADMIN=admin@yourdomain.com
```

### **Step 2: Google OAuth Setup for Production**

1. **Google Cloud Console** এ যান
2. **Authorized redirect URIs** এ যোগ করুন:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
3. **Client ID এবং Secret** কপি করে Vercel এর environment variables এ যোগ করুন

### **Step 3: Deploy to Vercel**

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from your project directory)
vercel --prod

# Or link existing project
vercel link
vercel --prod
```

## 🛠️ Production Optimizations Applied

### **✅ Performance Improvements**
- **Image Optimization**: WebP/AVIF support enabled
- **Code Splitting**: Automatic route-based splitting
- **Caching**: Proper cache headers for API routes
- **Compression**: Automatic gzip/brotli compression

### **✅ Security Enhancements**
- **Headers**: Security headers (X-Frame-Options, CSP, etc.)
- **CORS**: Proper CORS configuration for API routes
- **Environment Variables**: Secure handling of secrets

### **✅ Database Optimizations**
- **Connection Pooling**: MongoDB connection optimization
- **Error Handling**: Proper error boundaries and fallbacks
- **Retry Logic**: Automatic retry for failed operations

## 🚨 Common Deployment Issues & Solutions

### **Issue 1: MongoDB Connection Failed**
```bash
# Solution: Check environment variables in Vercel dashboard
# Make sure MONGODB_URI is correctly set
```

### **Issue 2: Google Login Not Working**
```bash
# Solution: Verify Google OAuth credentials and redirect URIs
# Check Vercel domain settings
```

### **Issue 3: Build Failed**
```bash
# Solution: Check Vercel build logs
# Ensure all dependencies are compatible
```

### **Issue 4: API Routes Not Working**
```bash
# Solution: Check vercel.json configuration
# Ensure proper routing is set up
```

## 📊 Monitoring & Debugging

### **Vercel Dashboard Features**
- **Function Logs**: Check `/api/*` route logs
- **Build Logs**: Monitor deployment status
- **Analytics**: Track performance metrics
- **Environment Variables**: Verify all variables are set

### **Debug Commands**
```bash
# Check if app is running locally
npm run dev

# Test production build locally
npm run build && npm run start

# Check TypeScript errors
npm run typecheck
```

## 🎯 Post-Deployment Checklist

- [ ] **Domain**: Configure custom domain in Vercel
- [ ] **Environment Variables**: Double-check all variables
- [ ] **Google OAuth**: Test login functionality
- [ ] **Database**: Verify MongoDB connection
- [ ] **Email**: Test email notifications (if configured)
- [ ] **APIs**: Test all API endpoints
- [ ] **Images**: Verify external image loading
- [ ] **Mobile**: Test PWA functionality

## 🔄 Continuous Deployment

যখন আপনি GitHub এ push করবেন, Vercel automatically deploy করবে।

### **GitHub Integration**
1. **Vercel Dashboard** → **Settings** → **Git**
2. **Connect** আপনার GitHub repository
3. **Auto-deployment** enable করুন

## 📞 Support

যদি কোনো সমস্যা হয়:
1. **Vercel Logs** চেক করুন
2. **Environment Variables** verify করুন
3. **Build Settings** চেক করুন
4. **Console Errors** দেখুন

## 🎉 Success Indicators

✅ **Green Build Status** in Vercel
✅ **All Environment Variables** properly set
✅ **Google Login** working
✅ **Database Connection** successful
✅ **API Routes** responding correctly
✅ **Images** loading properly

এখন আপনার app Vercel এ perfectly deploy হবে! 🚀
