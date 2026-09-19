# Product Photos & Media Assets

Product photography is organized by product slug under `frontend/public/images/products/<slug>/`.

```
frontend/public/images/products/
├── <product-slug>/
│   ├── 1.webp
│   ├── 2.webp
│   └── 3.webp
```

## Cloudinary CDN Integration

All 34 product photo sets (102 images total) are uploaded to Cloudinary CDN under:
- **Cloudinary Folder:** `Nexa Mart/products/<product-slug>/`
- **Asset Map:** `backend/src/seed/cloudinaryMap.js`

### Syncing Photos to Cloudinary
To re-upload or synchronize newly added product photography to Cloudinary:
```bash
npm run cloudinary:upload
```

### Seeding the Database
To reset and seed MongoDB Atlas with full Cloudinary CDN media links:
```bash
npm run seed
```
