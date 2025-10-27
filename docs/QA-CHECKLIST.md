# QA Checklist

## Customer Experience
1. Sign up with a new customer account and confirm login succeeds.
2. Browse the catalog, add at least one everyday product and one special product to the cart.
3. Proceed to checkout, supply a shipping address, and submit the order.
4. Confirm the order summary appears in the customer orders list with the correct line items and totals.
5. Verify an order confirmation notification is delivered (toast, inbox, and/or email depending on environment).

## Business Fulfillment Workflow
1. Log in as a business owner and open the incoming orders dashboard.
2. Accept one pending order and reject another to confirm both paths update inventory and allocation states.
3. Switch to the customer account and ensure the accepted/rejected statuses are reflected in order history and notifications.

## Services Lifecycle
1. Create a new service request from the customer portal, supplying schedule, contact, and payment details.
2. As an administrator, assign the service to an available provider and confirm assignment notifications.
3. Log in as the provider, move the service from **IN_PROGRESS** to **COMPLETED**, and verify timestamps and notes persist.
4. Return to the customer account to confirm the completed service is visible and marked appropriately.

## Special Shop vs. Provider Portals
1. Navigate between the Special Shop and Providers sections to confirm each route renders without errors.
2. Trigger the call-to-action button in both sections and validate the appropriate modal, deep link, or phone prompt is launched.

## Events Engagement
1. Open the events window from the customer navigation and ensure upcoming events load.
2. Register for an event and verify confirmation UI plus any follow-up messaging.
3. Observe the leaderboard or participant list updates in real time (or after refresh) to include the new registration.
4. Confirm the public events page reflects the registration status correctly.

## Notification Center
1. Trigger one or more new alerts (orders, services, events) and observe the bell icon badge increment.
2. Open the notification center, mark items as read, and confirm the badge count decrements accordingly.

## Admin Analytics Dashboard
1. Log in as an administrator and refresh or revisit the analytics dashboard.
2. Ensure key metric cards and charts refresh with the latest order, service, and engagement data.

## Known Issues
- TBD – document newly discovered gaps or regressions here.
