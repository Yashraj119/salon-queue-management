# Salon Queue — Flows & Rules

This document is the source of truth for queue behaviour, status transitions, assignment, waiting-time estimates and edge cases.

## Flow: Remote customer
1. Customer opens Home (`/`) and selects **Join Queue**.
2. Customer enters name and phone number, selects one or more services, and chooses a specific barber or **Any barber**.
3. The app displays the combined service duration, price and estimated wait.
4. Customer confirms and receives a token, for example `S-14`.
5. Customer follows token, position and estimated wait on My Status (`/status/:id`).
6. When the customer reaches second position, the app displays **Start coming to the salon**.
7. Receptionist selects **Call next** on an eligible barber card.
8. The customer status becomes Called; the phone displays **It's your turn! Go to [barber]** and the TV highlights the token.
9. Barber taps **Start**, changing the status to In chair.
10. Barber taps **Done**, changing the status to Done and removing the customer from the active queue.

## Flow: Walk-in customer
1. Receptionist selects **+ Add walk-in**.
2. Receptionist enters the customer's name, phone number, services and barber preference.
3. The walk-in is added to the same queue at the end, following first-come, first-served order.
4. The customer is handled by the same call, start and done process as a remote customer.

## Queue statuses and allowed transitions
- `Waiting` → `Called`
- `Waiting` → `Cancelled`
- `Called` → `In chair`
- `Called` → `No-show`
- `In chair` → `Done`

Rules:
- Do not move a customer backwards to an earlier status.
- `Done`, `Cancelled` and `No-show` are terminal states for that queue entry.
- If a no-show customer later returns, create a new queue entry at the end with a new token; do not reactivate the old entry.

## Queue ordering and barber assignment
1. Queue order is first come, first served.
2. **Call next** for barber X selects the earliest `Waiting` customer who selected barber X or **Any barber**.
3. A customer who selected a specific barber must never be assigned to a different barber.
4. A customer who selected **Any barber** may be assigned to an available barber.
5. A barber may have only one customer In chair at a time.
6. A barber on break is not eligible to receive a new customer.
7. If a customer selected a barber who is on break, show a message such as `Ravi is on a break`. Do not silently reassign that customer to another barber.
8. A customer can be called only once and cannot be called by two barbers simultaneously.

## Waiting-time estimate
Use the guide's approximation:

`Estimated wait ≈ total minutes of services ahead ÷ number of barbers working`

- Recalculate the estimate when queue entries change, a barber becomes available/on break, or a service is started/completed.
- The estimate is approximate and should be labelled accordingly (for example, `about 35 min`).
- Do not display a negative waiting time.
- If there are no working barbers, do not divide by zero; show an unavailable estimate and a helpful message.
- The estimate should decrease as customers ahead finish.

## Customer and queue validation rules
- A phone number must contain exactly 10 digits.
- A phone number can have only one active queue entry at a time.
- If the same phone number tries to join again while an active entry exists, show the existing spot instead of creating a duplicate.
- A customer must select at least one service and no more than three services.
- The selected service total is the sum of the selected service durations and prices.
- A customer may choose one specific barber or **Any barber**.

## Cancellation rules
- A customer can cancel their own Waiting spot after confirming the action.
- Reception can cancel an eligible active queue entry after confirmation.
- Cancelled entries are removed from the active waiting order.
- Do not treat a cancelled entry as a no-show or as a completed service.

## No-show rules
- A customer who has been Called but has not arrived within 10 minutes may be marked No-show by reception.
- A No-show entry is removed from the active queue.
- If that customer arrives later, reception adds them again at the end of the queue and a new token is generated.

## Queue opening and closing
- Online joining closes 30 minutes before salon closing time.
- Reception can still add walk-in customers when online joining is closed.
- If the owner manually closes online joining, disable the Join Queue action and show a clear explanation.
- The queue closing rule applies to online joining; it does not automatically cancel customers already in the queue.

## Barber availability
- A barber can be Available, Busy or On break.
- A barber who is Busy already has a customer In chair and cannot receive another customer.
- A barber On break cannot receive a new customer.
- Customers with a specific preference for a barber on break should see a clear message, such as `Ravi is on a break`.

## Synchronisation
- Customer phone, Reception Dashboard, Barber View and Waiting Area TV must reflect queue changes across separate browser windows.
- Important updates (Call next, Start, Done, On break) should appear on the other screens within 5 seconds.
- If live synchronisation is temporarily unavailable, show a visible error/retry state rather than silently presenting stale information.

## Test checklist
- [ ] Join with two services; verify the combined duration and price.
- [ ] Attempt to select four services; verify the three-service limit.
- [ ] Enter an invalid phone number; verify validation.
- [ ] Join with a phone number that already has an active spot; verify the existing spot is shown and no duplicate is created.
- [ ] Call next for Amit; verify that a customer who selected Ravi is skipped.
- [ ] Call next for a barber; verify the earliest eligible customer who selected that barber or Any barber is selected.
- [ ] Verify that a customer with a specific barber preference is never reassigned.
- [ ] Call next; verify the customer's phone shows **It's your turn!** within 5 seconds.
- [ ] Start and Done on Barber View; verify Reception and TV update.
- [ ] Mark a called customer No-show; add them again and verify they receive a new token at the end.
- [ ] Cancel a Waiting customer; verify they leave the active queue.
- [ ] Close online joining; verify Join Queue is disabled with a message while reception can still add walk-ins.
- [ ] Verify the language toggle changes all labels to Gujarati and back to English.
- [ ] Verify estimated wait decreases as customers ahead finish.
- [ ] Put a barber on break; verify they are not assigned another customer.
- [ ] Verify phone, tablet and TV windows stay in sync within 5 seconds.
