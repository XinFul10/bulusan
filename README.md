# OMTO Budget Tracker

## Municipality of Bulusan - Tourism Office Budget Management System

### Setup Instructions

1. Install frontend dependencies:
```bash
npm install
```

2. Start the Laravel backend (in a separate terminal):

```bash
cd ../backend
php artisan migrate:fresh --seed
php artisan serve --host=127.0.0.1 --port=8000
```

3. Start frontend development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Environment Variables

Create a `.env` file:
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_APP_NAME="OMTO Budget Tracker"
```

### Features

- Dashboard with budget overview and charts
- Transaction management
- Budget tracking and reporting
- User management (admin only)
- Export to CSV and PDF
