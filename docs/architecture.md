# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

### Presentation tier decision
The presentation tier is implemented using React 19, TypeScript, Vite, React Router, and Bootstrap 5.

**Frontend technologies and setup**:
- React 19 with hooks (useState, useEffect) for component state management
- TypeScript for type safety and compile-time error detection
- Vite as the build tool and development server on port 5173
- React Router for client-side navigation between capability pages (Activities, Teams, Leaderboard, Workouts)
- Bootstrap 5 for responsive styling and accessible UI components
- BrowserRouter wrapper enables React Router to manage the SPA navigation

**Frontend responsibilities**:
The frontend in `octofit-tracker/frontend/src` is responsible for:
- Displaying activities, teams, leaderboard rankings, and workout suggestions fetched from the backend
- Managing page navigation via React Router with routes to `/activities`, `/teams`, `/leaderboard`, and `/workouts`
- Rendering data in accessible UI components (tables, cards, alerts with ARIA roles)
- Coordinating asynchronous data fetching and managing component lifecycle with useEffect hooks

**API communication with the backend**:
The frontend communicates with the backend through the shared API client in `src/api/client.ts`, which exports a generic `getJson<T>(path)` function using the Fetch API.
- The `apiBaseUrl` defaults to an empty string, allowing relative paths like `/api/activities` to be proxied by Vite
- Vite's dev proxy configuration automatically forwards `/api/*` requests to `http://localhost:8000`, keeping the backend port private
- The `VITE_API_BASE_URL` environment variable allows overriding the base URL for production deployments
- HTTP errors (non-2xx status codes) are caught and converted to error states shown to the user

**Loading, empty, and error state management**:
Each page component (Activities, Teams, Leaderboard, Workouts) implements identical state management patterns using `useState` hooks for `[data, loading, error]`.
- **Loading state**: Displayed with `role="status"` for screen reader accessibility showing "Loading..." while the API request is pending
- **Empty state**: Shown when the API returns successfully but the response array is empty (e.g., "No activities yet"), clearly distinguishing from error states
- **Error state**: Displayed with `role="alert"` for screen reader accessibility when the fetch fails, showing a user-friendly error message
- **Success state**: Renders the fetched data in a styled table or list with all fields properly formatted
- States are mutually exclusive: loading, error, empty, or success—never combining multiple states to avoid confusion

**Separation between presentation and business logic**:
- All data fetching is isolated to the API client in `src/api/client.ts`, which is imported and used uniformly across all page components
- No page components contain business logic like validation, calculations, or filtering—they only fetch and render data
- No components access environment variables directly; the API client centralizes all configuration
- Response parsing is type-safe with TypeScript interfaces matching the API contract (e.g., `interface ActivitiesResponse`, `interface LeaderboardEntry`)
- Components focus solely on presentation concerns: conditional rendering of states, formatting data for display, and managing the user's view lifecycle
- Backend concerns like validation, user/team existence checking, and leaderboard aggregation remain entirely in the Express service layer

### Logic tier decision
Express.js with TypeScript for type-safe route and service implementations. Routes in `src/routes/api.ts` are thin wrappers that delegate to service functions in `src/services/octofitService.ts`. All validation happens in services, which return deliberate 4xx errors (400 for bad requests, 404 for not found) rather than allowing 500 errors from validation. ObjectIds are serialized to strings in JSON responses for client consumption. Error middleware in `app.ts` catches all errors and returns consistent JSON error responses with appropriate status codes.

### Data tier decision
Mongoose ODM manages all MongoDB operations and schema validation. Four models (User, Team, Activity, Workout) define required fields with schema constraints (required: true) that enforce validation at the database layer. Relationships are established with ObjectId references (e.g., Activity references User and Team). The seed script uses idempotent upsert operations to populate demo data without destroying existing records, with special logic to reconcile user team membership changes. MongoDB aggregation pipeline is used for complex queries like leaderboard ranking.

### Activity tracking approach
Activities are created with POST /api/activities accepting userId, teamId, type, and minutes. The service validates that all fields are present and properly formatted (ObjectId strings), checks that referenced user and team exist (404 if not), and calculates points as equal to minutes. The occurredAt timestamp is set to the current date automatically. Activities can be listed with GET /api/activities. All activities are stored in MongoDB with full traceability (user, team, type, minutes, points, occurredAt).

### Team management approach
Teams are created with POST /api/teams accepting name (required), mascot (optional), and members array (optional). The service validates that name is provided (400 if missing) and creates the team with a default empty members array. Members are stored as ObjectId references to User documents. Teams can be listed with GET /api/teams, exposing the members array. The seed script ensures Octocats and Robocats teams exist with demo users (Mona and Hubot) as members.

### Leaderboard approach
The leaderboard is computed dynamically with GET /api/leaderboard using MongoDB aggregation. The aggregation pipeline groups activities by team and sums their points. Teams are sorted by totalPoints in descending order (highest first). Each entry is ranked with a 1-based rank field starting at 1 for the top team. The response includes teamName, totalPoints, and rank for each team, allowing the frontend to display a competitive ranking view.

### Workout suggestions approach
Suggestions are retrieved with GET /api/workouts/suggestions/:userEmail by finding the user by email and determining their fitness goal and recent activity pattern. If no user is found, a 404 is returned. The suggestion matching logic uses the user's fitnessGoal as default, but overrides it based on recent activity type (run/walk/cycle → endurance, strength → strength). Workouts are queried by matching focus and each suggestion includes a reason field explaining why it was recommended. The first suggestion is the most relevant match.

## Test plan

### Data-tier command: `npm run test:data --prefix octofit-tracker/backend`

**Command executed**:
```bash
npm run test:data --prefix octofit-tracker/backend
```

**Result**: ✅ All 5 data validation tests passing

Test details:
1. ✅ User schema validation: Validates that name, email, and fitnessGoal are required fields
2. ✅ Team schema validation: Validates that name and mascot are required, members array defaults to empty
3. ✅ Activity schema validation: Validates that type, user, team, minutes, points, and occurredAt are required
4. ✅ Workout schema validation: Validates that focus, minutes, and difficulty are required
5. ✅ Idempotent seed script: Ensures seed operation doesn't duplicate data and reconciles team membership changes

Each test creates model instances with missing fields and verifies that validateSync() returns validation errors. The seed test creates sentinel data, runs the seed function, and verifies that sentinel data is retained while new demo data is created idempotently.

### API command: `npm run test:api --prefix octofit-tracker/backend`

**Command executed**:
```bash
npm run test:api --prefix octofit-tracker/backend
```

**Result**: ✅ All 4 API contract tests passing

Test details:
1. ✅ Activity CRUD with validation:
   - POST with empty body returns 400
   - POST with non-existent user/team IDs returns 4xx (not 500)
   - POST with malformed IDs returns 4xx (not 500)
   - POST with valid data returns 201 with activity object containing user, team, type, minutes, points, and occurredAt
   - GET /api/activities returns 200 with activities array

2. ✅ Team creation and member exposure:
   - POST without name returns 400
   - POST with valid data returns 201 with team object containing name, mascot
   - GET /api/teams returns 200 with teams array including members
   - Members are exposed as serialized ObjectIds

3. ✅ Leaderboard ranking by total points:
   - GET /api/leaderboard returns 200 with leaderboard array
   - Teams are ordered by totalPoints descending (highest first)
   - Each entry has teamName, totalPoints, and 1-based rank
   - Example: Robocats (35 pts, rank 1), Octocats (25 pts, rank 2)

4. ✅ Workout suggestions matched to user:
   - GET /api/workouts/suggestions/:userEmail returns 200 with suggestions array
   - First suggestion's focus matches user's fitness goal or recent activity type
   - Each suggestion includes a reason field explaining why it was recommended
   - GET with unknown email returns 4xx (not 500)

### Frontend command: `npm test --prefix octofit-tracker/frontend`

**Command executed**:
```bash
npm test --prefix octofit-tracker/frontend
```

**Result**: ✅ All 15 frontend tests passing

Test details organized by capability:

**Core functionality tests (3 passing)**:
1. ✅ Activities component renders API data: Component displays heading "Activities" and shows activity type "run" from mocked API
2. ✅ Teams, Leaderboard, and Workouts render with accessible content: Each route displays relevant data (team names, point totals, suggestion titles)
3. ✅ Workouts component requests correct user email: Component calls /api/workouts/suggestions/mona@example.com with proper URL encoding

**Per-capability state tests (12 passing)**:

For each of the 4 pages (Activities, Teams, Leaderboard, Workouts):

- ✅ Loading state: Shows role="status" with "Loading..." text while fetch is pending
- ✅ Empty state: Shows meaningful message when API returns empty array ("no activities", "no teams", "no leaderboard", "no suggestions")
- ✅ Error state: Shows role="alert" with error message when fetch fails (503 Unavailable)

All components properly handle the full loading → empty/success/error state lifecycle with accessible ARIA markup.

### Backend build command: `npm run build --prefix octofit-tracker/backend`

**Command executed**:
```bash
npm run build --prefix octofit-tracker/backend
```

**Result**: ✅ Build successful

Output:
```
> build
> tsc --noEmit
```

All TypeScript files compile without errors or warnings. No type mismatches, unused variables, or other TypeScript issues detected. The backend is ready for production deployment.

### Frontend build command: `npm run build --prefix octofit-tracker/frontend`

**Command executed**:
```bash
npm run build --prefix octofit-tracker/frontend
```

**Result**: ✅ Build successful with optimized output

Output:
```
> build
> tsc --noEmit && vite build

vite v6.4.4 building for production...
transforming...
✓ 46 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.36 kB │ gzip:  0.27 kB
dist/assets/index-BL5QWnkG.css  231.14 kB │ gzip: 30.69 kB
dist/assets/index-CcGqL6if.js   268.51 kB │ gzip: 84.49 kB
✓ built in 2.77s
```

TypeScript compilation passes, Vite builds production bundle with optimized CSS and JavaScript. Gzip compression reduces payload sizes significantly (30.69 KB for CSS, 84.49 KB for JS). Total build time: 2.77s.

## Summary

| Test Suite | Status | Results |
|-----------|--------|---------|
| Data validation | ✅ PASSING | 5/5 tests |
| API contracts | ✅ PASSING | 4/4 tests |
| Frontend tests | ✅ PASSING | 15/15 tests |
| Backend build | ✅ PASSING | TypeScript OK |
| Frontend build | ✅ PASSING | Vite optimization complete |
| **Overall** | **✅ PASSING** | **24/24 tests + 2 builds** |
