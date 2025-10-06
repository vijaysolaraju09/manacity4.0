# API Endpoints

The API is served from the Express application in [`server/server.js`](../server/server.js). Every JSON response follows the structure:

```json
{
  "ok": true,
  "data": { /* resource payload */ },
  "traceId": "uuid"
}
```

When an error is raised the server responds with:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "stack": "Stack trace"
  },
  "traceId": "uuid"
}
```

Use the `traceId` value to correlate with logs emitted by the request logger.

## Health

| Method | Path         | Description             | Request | Response |
| ------ | ------------ | ----------------------- | ------- | -------- |
| GET    | `/api/health` | Liveness probe returning `{ ok: true }`. | _None_ | `{ ok: true }` with `traceId` omitted for brevity. |

## Authentication (`/api/auth`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/signup` | Register a new user. | JSON body with `name`, `phone`, `password`, and optional `email`, `location`, `role`. | 201 with `{ user, token }`.
| POST | `/login` | Authenticate by phone/password. | JSON body `{ "phone": string, "password": string }`. | 200 with `{ user, token }`.
| POST | `/admin-login` | Email/password login for the admin account. | `{ "email": string, "password": string }`. | 200 with `{ user, token }` after provisioning admin if needed.
| GET | `/me` | Fetch the authenticated profile. | Bearer token. | `{ user }`.
| POST | `/logout` | Invalidate the current session on the client side. | Bearer token. | `{ message: "Logged out" }` (empty payload in controller). |

## Users (`/api/users`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| PATCH | `/me` | Update the authenticated user's profile. | Bearer token. JSON body may include `name`, `location`, `address`, `profession`, `bio`, `avatarUrl`, `email`, `preferences.theme`. | `{ user }`.

## Home feed (`/api/home`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/banner` | Fetch hero banner content. | Query optional. | `{ banner }` array from `homeController`. |
| GET | `/offers` | Retrieve featured offers. | _None_. | `{ offers }`.
| GET | `/verified-users` | List highlighted verified users. | _None_. | `{ items }` of verified user cards.
| GET | `/events` | List featured events for the landing page. | _None_. | `{ items }`.
| GET | `/special-products` | List curated special products. | _None_. | `{ items }`.

## Shops (`/api/shops`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | List shops with filters. | Query params `q`, `category`, `location`, `status`, `sort`, `page`, `pageSize`. | `{ items, total, page, pageSize }`.
| GET | `/my` | List shops owned by the authenticated user. | Bearer token. | `{ items, shops }` summarising shop cards.
| GET | `/:id` | Fetch a single shop by id. | Path param `id`. | `{ shop }` card view.
| GET | `/:id/products` | List products for a shop. | Path param `id`. | `{ items }` array of products.
| POST | `/` | Submit a business for approval. | Bearer token. JSON body `name`, `category`, `location`, `address`, optional `image`, `banner`, `description`. | 201 `{ shop }` pending status.
| PATCH | `/:id` | Update a shop (owner or admin). | Bearer token, JSON body with editable fields as above. | `{ shop }`.
| DELETE | `/:id` | Delete a shop (owner or admin). | Bearer token. | `{ message: "Shop deleted" }`.

### Admin shop management (`/api/admin/shops`)

Available through the admin router:

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/shops/requests` | List pending approval requests. | Admin bearer token. | `{ items, total }` summary.
| GET | `/api/admin/shops` | List all shops with filters from query params. | Admin bearer token. | `{ items, total, page, pageSize }`.
| PUT | `/api/admin/shops/:id` | Update shop details. | Admin bearer token. JSON body similar to shop update. | `{ shop }`.
| DELETE | `/api/admin/shops/:id` | Remove a shop and its products. | Admin bearer token. | `{ message }`.
| POST | `/api/admin/shops/:id/approve` | Approve a shop. | Admin bearer token. | `{ shop }`.
| POST | `/api/admin/shops/:id/reject` | Reject a shop application. | Admin bearer token. | `{ shop }` with rejection reason in controller.

## Products (`/api/products`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | Public catalog listing with filters (`q`, `category`, `minPrice`, etc.). | Query parameters. | `{ items, total, page, pageSize }`.
| POST | `/` | Create a product for one of the user's shops. | Bearer token. Body includes `shopId`, `name`, `price`, `description`, media fields. | 201 `{ product }`.
| PATCH | `/:id` | Update a product you own. | Bearer token. JSON body with mutable fields. | `{ product }`.
| DELETE | `/:id` | Soft-delete a product. | Bearer token. | `{ message }`.
| GET | `/my` | List products for the authenticated shop owner. | Bearer token. | `{ items }`.
| GET | `/:id` | Public product detail. | Path param `id`. | `{ product }`.

### Admin product management (`/api/admin/products`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/products` | List all products with filters. | Admin bearer token. | `{ items, total, page, pageSize }`.
| PUT | `/api/admin/products/:id` | Update any product. | Admin bearer token, JSON body matching product fields. | `{ product }`.
| DELETE | `/api/admin/products/:id` | Remove a product. | Admin bearer token. | `{ message }`.

## Cart (`/api/cart`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/` | Add an item to the authenticated user's cart. | Bearer token. Body `{ productId, qty, options }`. | `{ cart }` snapshot.
| GET | `/` | Retrieve current cart contents. | Bearer token. | `{ items, totals }`.
| DELETE | `/:id` | Remove a cart line item by id. | Bearer token. | `{ cart }` after removal.

## Orders (`/api/orders`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/` | Place an order with products from a shop. | Bearer token. Body `{ shopId, items[], fulfillment, shippingAddress?, notes?, payment? }`. | 201 `{ order }`.
| GET | `/mine` | Orders placed by the authenticated user. | Bearer token. Query `status`, `page`, `pageSize`. | `{ items }`.
| GET | `/received` | Orders received by the user's shops. | Bearer token. Query `status`, `page`, `pageSize`. | `{ items }`.
| GET | `/:id` | Fetch an order (buyer, seller, or admin only). | Bearer token. Path `id`. | `{ order }`.
| PATCH | `/:id/status` | Shop owner/admin updates order status (e.g., `confirmed`, `ready`). | Bearer token. Body `{ status, note? }`. | `{ order }` with timeline update.
| PATCH | `/:id/cancel` | Buyer cancels an order with note. | Bearer token. Body `{ reason }`. | `{ order }`.
| POST | `/:id/rate` | Buyer rates a completed order. | Bearer token. Body `{ rating, review? }`. | `{ order }` with rating info.

### Admin order reporting (`/api/admin/orders`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/orders` | Paginated order listing for admins. | Admin bearer token. Query filters mirror shop order filters. | `{ items, total, page, pageSize }`.

## Notifications (`/api/notifications`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | List notifications for the authenticated user. | Bearer token. | `{ items }` with unread counts.
| PATCH | `/:id/read` | Mark a notification as read. | Bearer token. | `{ notification }` updated.

## Events (`/api/events`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | Public list with filters (`status`, `type`, etc.). | Query parameters. | `{ items, page, pageSize }`.
| GET | `/:id` | Public event detail. | Path `id`. | `{ event }`.
| GET | `/:id/updates` | Public timeline updates. | Path `id`. | `{ items }` chronological updates.
| GET | `/:id/leaderboard` | Public leaderboard standings. | Path `id`. | `{ leaderboard }`.
| GET | `/:id/registrations` | List registrations (organizer/admin visibility enforced in controller). | Path `id`. | `{ items }`.
| GET | `/:id/bracket` | Tournament bracket snapshot. | Path `id`. | `{ bracket }` structure.
| POST | `/` | Create an event (organizer/admin). | Bearer token. Body matches `createEventSchema`: `title`, `type`, `schedule`, `venue`, `capacity`, etc. | 201 `{ event }`.
| PATCH | `/:id` | Update event metadata. | Bearer token. Body matches `updateEventSchema`. | `{ event }`.
| POST | `/:id/publish` | Publish a draft event. | Bearer token. | `{ event }` with status.
| POST | `/:id/start` | Mark event as in progress. | Bearer token. | `{ event }`.
| POST | `/:id/complete` | Mark event as completed. | Bearer token. | `{ event }`.
| POST | `/:id/cancel` | Cancel an event with reason. | Bearer token. | `{ event }`.
| POST | `/:id/register` | Register the authenticated user. | Bearer token. Body optional `team`/`notes`. | `{ registration }`.
| DELETE | `/:id/register` | Withdraw registration. | Bearer token. | `{ registration }` cancellation info.
| GET | `/:id/registered/me` | Check registration status for current user. | Bearer token. | `{ registration }` or `{}`.
| POST | `/:id/updates` | Post an organizer update. | Bearer token. Body `{ title, message }`. | `{ update }`.
| POST | `/:id/leaderboard` | Submit leaderboard rows. | Bearer token. Body `{ rows: [...] }`. | `{ leaderboard }`.
| POST | `/:id/bracket/seed` | Seed the bracket for tournaments. | Bearer token. Body `{ structure }`. | `{ bracket }`.
| POST | `/matches/:matchId/report` | Submit match results. | Bearer token. Body `{ score, notes }`. | `{ match }` pending verification.
| POST | `/matches/:matchId/verify` | Organizer/admin verifies reported match. | Bearer token. Body `{ status, notes? }`. | `{ match }`.

### Admin events (`/api/admin/events`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/events` | Paginated event list. | Admin bearer token. | `{ items, total, page, pageSize }`.
| POST | `/api/admin/events` | Create events on behalf of organizers. | Admin bearer token, body as per `createEventSchema`. | `{ event }`.
| PUT | `/api/admin/events/:id` | Update event. | Admin bearer token, body as per `updateEventSchema`. | `{ event }`.
| DELETE | `/api/admin/events/:id` | Remove an event. | Admin bearer token. | `{ message }`.

## Professionals (`/api/pros`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | List verified professionals. | Bearer token. Query filters `category`, `location`. | `{ items }`.
| GET | `/:id` | Fetch a professional profile. | Bearer token. Path `id`. | `{ professional }` profile.
| POST | `/orders` | Create a service order with a professional. | Bearer token. Body `{ professionalId, schedule, notes, budget }`. | `{ order }`.
| PATCH | `/orders/:id` | Update service order status/details. | Bearer token. Body with updated fields (`status`, `notes`). | `{ order }`.

## Verified directory (`/api/verified`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | Public list of verified entities. | Query filters optional. | `{ items }`.
| GET | `/:id` | Detail for a verified profile. | Path `id`. | `{ verified }`.
| POST | `/request` | Authenticated user submits verification request. | Bearer token. Body includes `documents`, `bio`, `portfolio`. | `{ request }` pending status.
| PATCH | `/me` | Update the authenticated user's verification submission. | Bearer token. Body fields similar to request. | `{ request }`.

### Admin verification (`/api/admin/verified` and `/api/admin/verification-requests`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/admin/verified/:id/approve` | Approve a verification submission. | Admin bearer token. Body optional `{ notes }`. | `{ verified }` with status `approved`.
| POST | `/api/admin/verified/:id/reject` | Reject a submission. | Admin bearer token. Body `{ reason }`. | `{ verified }` with status `rejected`.
| GET | `/api/admin/verified/requests` | List pending verification requests. | Admin bearer token. | `{ items, total }`.
| PATCH | `/api/admin/verification-requests/:id` | Update request status (approve/reject). | Admin bearer token. Body `{ status, notes? }`. | `{ request }`.

## Notifications & messaging (`/api/admin/messages`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/messages` | Retrieve messages submitted to the admin dashboard. | No auth required in router, but intended for admin UI. | `{ items }` sorted by date.

## Metrics (`/api/admin/metrics`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/metrics` | High-level KPIs for dashboard cards. | Admin bearer token. Query `range`. | `{ summary }`.
| GET | `/api/admin/metrics/timeseries` | Time-series data for charts. | Admin bearer token. Query `metric`, `range`. | `{ points }`.

## Users (admin) (`/api/admin/users`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/users` | Paginated user listing with filters. | Admin bearer token. Query `role`, `status`, `q`. | `{ items, total, page, pageSize }`.
| PATCH | `/api/admin/users/:id` | Update user profile fields. | Admin bearer token. Body supports same fields as `/api/users/me`. | `{ user }`.
| PUT | `/api/admin/users/:id/role` | Change user role (e.g., `customer`, `business`, `admin`). | Admin bearer token. Body `{ role }`. | `{ user }`.
| PUT | `/api/admin/users/:id/status` | Update verification status (`approved`, `rejected`, etc.). | Admin bearer token. Body `{ status }`. | `{ user }`.
| DELETE | `/api/admin/users/:id` | Delete a user. | Admin bearer token. | `{ message }`.
| PUT | `/api/admin/user/:id/verify` | Force verify a user. | Admin bearer token. Body optional. | `{ user }` verified.

## Specials (`/api/special`)

| Method | Path | Description | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/` | Public curated special products feed. | _None_. | `{ items }`.

## Verified pros notifications (`/api/admin/verified/requests` etc.)

See the verification section above for approval endpoints reused by the admin dashboard.

---

For field-level schemas refer to the validators inside [`server/validators`](../server/validators) and controller implementations in [`server/controllers`](../server/controllers).
