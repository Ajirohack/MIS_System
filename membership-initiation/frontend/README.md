# Membership Initiation System (MIS) Frontend

This is the frontend component of the Space Project's Membership Initiation System, responsible for user registration, onboarding, and membership management.

## Branding Guidelines

### Official Logos

- **Company Logo**: Always use `WhyteHoux.png` as the official company logo
- **Project Logo**: Always use `PNG image 5.png` as the official Space Project logo

Both logos are located in the `/src/assets/` directory and should be imported consistently across all components:

```tsx
import companyLogo from "../assets/WhyteHoux.png";
import projectLogo from "../assets/PNG image 5.png";
```

### Color Scheme

The application uses a tier-based color system:

- **ARCHIVIST**: Gray (#6b7280)
- **ORCHESTRATOR**: Blue (#3b82f6)
- **GODFATHER**: Purple (#8b5cf6)
- **ENTITY**: Gold/Amber (#f59e0b)

Primary accent color across the application is Emerald (#10b981).

## Architecture

### API Configuration

All API endpoints are centralized in `/src/config/api.ts`. Never hardcode API URLs in components.

```tsx
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

// Example usage
const response = await axios.post(
  API_ENDPOINTS.VALIDATE_KEY,
  { data },
  { headers: getAuthHeaders(membershipKey) }
);
```

### Environment Configuration

- `.env.development` - Development environment configuration
- `.env.production` - Production environment configuration
- `.env.example` - Example environment file with required variables

## Key Components

- **Container**: Main layout wrapper that includes standard header with logos
- **KeyDisplay**: Displays membership keys with tier-specific styling
- **ErrorBoundary**: Gracefully handles errors with branded error pages
- **MembershipCard**: Displays user membership details with proper branding

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## E2E Testing (Cypress)

This project uses [Cypress](https://www.cypress.io/) for end-to-end (E2E) testing.

- E2E tests are located in `cypress/e2e/`.
- To run Cypress in interactive mode:

  ```bash
  npx cypress open
  ```

- To run all E2E tests headlessly:

  ```bash
  npx cypress run
  ```

- Example test: `cypress/e2e/sample-registration.cy.ts`

For configuration, see `cypress.config.js`.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## CI/CD Pipeline

This project uses GitHub Actions for automated testing, build, and deployment. The pipeline includes:

- Linting
- Unit tests with coverage
- Cypress E2E tests
- Build step
- Deployment (placeholder)

See `.github/workflows/ci.yml` for details.

## E2E Test Coverage

Critical user flows covered:

- Registration
- Login/Authentication
- Profile management
- Onboarding
- Settings
- Cross-platform connection
- Error handling

See `cypress/e2e/` for test specs.
