# Security Specification: OpenNow Kathmandu

## Data Invariants
1. A user can only create a business status report.
2. A user's karma is updated based on verification counts (logic handled client-side/functions).
3. Businesses are public records but can only be updated by authenticated users (for status changes).
4. Users can only edit their own profile fields (name).
5. All IDs must be valid alphanumeric strings.

## The "Dirty Dozen" Payloads (Denial Tests)
1. Creating a status for a non-existent business.
2. Creating a status with a `user_id` that doesn't match `request.auth.uid`.
3. Updating a status report after it's created.
4. Injecting a 1MB string into a business `name`.
5. Modifying someone else's karma.
6. Creating a business with a fake `last_status_update` in the past/future (must be `request.time`).
7. Blanket reading the entire `users` collection.
8. Deleting a business document.
9. Updating `status_open_count` without updating `status_total_count` (orphaned write).
10. Spoofing user location reports from a different city.
11. Massive batch of 500 reports from one user in 1 minute (rate limiting).
12. Status update without providing a `confidence` score.

## Test Runner (Logic Overview)
The `firestore.rules` will enforce that:
- `auth.uid` matches the `user_id` field.
- Document IDs match `isValidId`.
- String sizes are constrained.
- Timestamps use `request.time`.
- `update` operations on businesses are restricted to specific fields (`status_open_count`, `status_total_count`, `last_status_update`).
