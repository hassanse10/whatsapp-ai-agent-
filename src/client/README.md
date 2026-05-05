# WhatsApp AI Agent - Admin Dashboard

A modern React + Vite frontend for managing WhatsApp AI Agent configurations, products, orders, and business analytics.

## Features

- 🔐 User authentication (signup/signin)
- 📊 Dashboard with order statistics and analytics
- ⚙️ AI Agent customization (language, tone, style)
- 📦 Product catalog management (CRUD operations)
- 📋 Order history and detailed order tracking
- 👤 User profile management
- 📱 Responsive mobile-friendly design

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Styling (no dependencies needed)

## Setup

### Prerequisites

- Node.js 18+ and npm 9+

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL:

```
VITE_API_URL=http://localhost:3000/api
```

## Development

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

The dev server automatically proxies API requests to `http://localhost:3000/api`

### Build for Production

```bash
npm run build
```

Output goes to the `dist/` directory

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── pages/              # Page components
│   ├── Home.jsx
│   ├── Signup.jsx
│   ├── Signin.jsx
│   ├── Dashboard.jsx
│   ├── AgentConfig.jsx
│   ├── Products.jsx
│   ├── Orders.jsx
│   ├── Profile.jsx
│   └── PrivateRoute.jsx
├── components/         # Reusable components
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   └── FormInput.jsx
├── services/          # API client
│   └── api.js
├── hooks/             # Custom React hooks
│   └── useAuth.js
├── App.jsx            # Main App component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## Authentication Flow

1. User signs up or signs in
2. JWT token is stored in `localStorage`
3. Token is automatically added to all API requests via Axios interceptor
4. If token expires (401), user is redirected to signin
5. `useAuth` context provides authentication state throughout the app

## API Integration

All API calls go through `/services/api.js` using Axios:

- `authAPI` - Authentication endpoints
- `agentAPI` - Agent configuration
- `productsAPI` - Product CRUD operations
- `ordersAPI` - Order retrieval
- `dashboardAPI` - Dashboard statistics

### Example Usage

```javascript
import { authAPI } from '../services/api';

const { data } = await authAPI.signin(email, password);
localStorage.setItem('token', data.token);
```

## Environment Variables

- `VITE_API_URL` - Backend API base URL (default: http://localhost:3000/api)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Styling

The project uses vanilla CSS with CSS variables for theming:

- Primary color: `--primary-color: #25D366` (WhatsApp green)
- Secondary color: `--secondary-color: #34B7F1`
- Text colors, backgrounds, and utilities defined in `index.css`

## Building for Production

The application is optimized for production:

1. Run `npm run build` to create an optimized bundle
2. The `dist/` folder is ready to be served by Express
3. Express automatically serves the built files when `NODE_ENV=production`

## Troubleshooting

### CORS Issues

If you encounter CORS errors:
- Ensure the backend server is running on port 3000
- Check that `VITE_API_URL` matches your backend URL
- The dev server proxy should handle this automatically

### Authentication Issues

- Clear localStorage and try logging in again
- Check browser console for error messages
- Verify the API endpoint is returning valid JWT tokens

### Styles Not Loading

- Clear browser cache
- Rebuild with `npm run build`
- Ensure `index.css` is imported in `main.jsx`

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Real-time order notifications
- [ ] Advanced analytics charts
- [ ] WhatsApp QR code integration
- [ ] Product image upload to cloud storage
- [ ] Export orders to CSV/PDF

## License

MIT
