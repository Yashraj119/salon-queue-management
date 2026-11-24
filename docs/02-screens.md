# Salon Queue — Screens & Features

This document is the source of truth for screen layout and behaviour. Build only the screen requested in each task and avoid changing unrelated screens.

## Shared UI requirements
- Theme: dark charcoal (`#1F2937`) with gold (`#D4A017`) accents.
- Use rounded cards, clear hierarchy, readable typography and large touch targets.
- Mobile-first customer and barber screens; tablet landscape for reception; large, high-contrast text for the TV display.
- Provide an English/Gujarati language toggle. All user-facing labels must come from the language file rather than being hard-coded in individual components.
- Show clear loading, empty, validation and error states.
- Keep queue information synchronised across open phone, tablet and TV browser windows.

## Screen 1: Home (`/`)
**User:** Customer  
**Purpose:** Explain the current queue situation and let a customer join.

### Layout, top to bottom
- Salon name and logo.
- Opening-status badge, for example: `Open · Closes 9 PM`.
- Live queue summary, for example: `6 people waiting · about 50 min`.
- Barber cards or chips with name and status, for example:
  - Ravi — Busy
  - Amit — Free
  - Imran — On break
- Prominent gold **Join Queue** button.

### Behaviour
- **Join Queue** opens `/join`.
- If online joining is closed, disable the button and explain that online joining is unavailable. Walk-ins may still be accepted by reception.
- Display the current queue count and estimated wait using the rules in `03-flows-rules.md`.

### Responsive behaviour
- Phone: vertically stacked cards and a full-width primary button.
- Tablet/desktop: use available width without making the queue summary difficult to scan.

## Screen 2: Join Queue (`/join`)
**User:** Customer  
**Purpose:** Collect the details needed to create a queue entry.

### Form elements, top to bottom
1. Name field.
2. Phone field: exactly 10 digits; validate before submission.
3. Service cards, selectable together, with a maximum of three services. Each card shows service name, duration and price. Sample services:
   - Haircut — 30 min — ₹150
   - Beard trim — 15 min — ₹80
   - Hair spa — 45 min — ₹400
4. Barber picker:
   - **Any barber (fastest)**, or
   - A specific barber card with name and photo.
5. Live summary showing selected service duration, total price and estimated queue wait. Example: `Total 45 min · ₹230 · Expected wait ~35 min`.
6. **Confirm** button.

### Behaviour
- Update total service duration and price immediately when services are selected or deselected.
- Do not allow more than three selected services.
- Validate the name, 10-digit phone number, at least one service, and barber choice.
- Prevent a second active queue entry for the same phone number. If one exists, show the existing queue spot instead of creating a duplicate.
- On successful confirmation, create a token such as `S-14` and navigate to `/status/:id`.
- If online joining is closed, prevent submission and show a clear message.

### Responsive behaviour
- Phone: single-column layout; service cards and controls must be easy to tap.
- Tablet/desktop: form and summary may sit side by side if both remain readable.

## Screen 3: My Status (`/status/:id`)
**User:** Customer  
**Purpose:** Let a customer follow their place in the queue.

### Layout
- Large queue token, for example `S-14`.
- Current position, for example `4th in line`.
- Circular or prominent countdown showing estimated wait, for example `about 35 min`.
- Current status and selected barber preference.
- Contextual notification area.
- **Cancel my spot** button.

### Behaviour
- Refresh position and estimated wait automatically as queue entries change.
- When the customer becomes second in line, show: **Start coming to the salon**.
- When called, show a prominent full-screen gold state: **It's your turn! Go to [barber name]**.
- **Cancel my spot** opens a confirmation dialog. Only cancel after confirmation.
- Display the correct terminal state if the spot is completed, cancelled or marked no-show.

### Responsive behaviour
- Phone: prioritise token, position, wait and turn notification.
- Larger screens: keep the same information hierarchy without adding unrelated controls.

## Screen 4: Reception Dashboard (`/reception`)
**User:** Receptionist  
**Target device:** 10-inch tablet in landscape  
**Purpose:** Manage the live queue and assign eligible customers to barbers.

### Layout
- Top bar with salon name, queue open/closed state and **+ Add walk-in** button.
- Barber cards showing:
  - Barber name and availability.
  - Current customer/token.
  - Time elapsed or time remaining, where available.
  - **Call next** button.
- Waiting list in queue order. Each row shows:
  - Token.
  - Customer name.
  - Selected services.
  - Preferred barber.
  - Waiting time.
  - **No-show** and **Cancel** actions.
- Highlight customers waiting more than 60 minutes in amber.

### Behaviour
- **+ Add walk-in** opens a quick form for name, phone, services and barber preference. A walk-in joins the same queue at the end.
- **Call next** selects the earliest eligible waiting customer for that barber, respecting the rules in `03-flows-rules.md`.
- **No-show** changes a called customer to No-show.
- **Cancel** removes an eligible customer from the active queue after confirmation.
- Update the dashboard when customer, barber or owner actions change queue state.

### Responsive behaviour
- Optimise for tablet landscape. Keep barber cards prominent and the waiting list readable.
- On narrower screens, stack the barber cards above the waiting list rather than squeezing the table.

## Screen 5: Barber View (`/barber/:name`)
**User:** Barber  
**Target device:** Phone  
**Purpose:** Let a barber manage the service currently assigned to them.

### Layout
- Barber name and availability status.
- Current customer name and token.
- Selected services.
- Timer showing elapsed time since service start.
- Large action button: **Start** before service begins, then **Done**.
- **Next for you** preview, for example: `S-15 Kunal (Haircut)`.
- Availability toggle: **Available / On break**.

### Behaviour
- **Start** changes the called customer to In chair and starts the service timer.
- **Done** marks the current customer Done and clears the barber's chair.
- Availability toggle updates the receptionist dashboard and customer-facing barber status.
- Do not allow a barber to have more than one customer in the chair at a time.
- Starting or completing service must update Reception, TV and customer status views.

## Screen 6: Waiting Area TV (`/display`)
**User:** Customers in the salon  
**Target device:** TV / large display  
**Purpose:** Show who is currently being served and who is coming next.

### Layout
- High-contrast salon header.
- One row or card per barber with photo, name and current token, for example `Now: S-12`.
- **Up next** list containing the next five tokens and estimated times.
- Large, readable text suitable for viewing from approximately five metres away.

### Behaviour
- Update automatically when a customer is called, starts service or finishes.
- Newly called token flashes gold and plays a gentle chime where supported.
- Avoid exposing unnecessary personal information; show tokens rather than full customer phone numbers.

### Responsive behaviour
- TV layout is landscape-first, spacious and readable at a distance.
- Do not use small controls; this is a display, not an operator screen.

## Screen 7: Owner Settings (`/admin`)
**User:** Salon owner  
**Purpose:** Configure the salon's services, staff availability and online queue.

### Layout
- Services list showing English and Gujarati names, duration, price and on/off state.
- Barbers on duty today, each with an availability toggle.
- Online queue switch: **Open / Closed**.
- Today's statistics cards:
  - Customers served.
  - Average wait.
  - No-shows.

### Behaviour
- Turning a service off removes it from the Join Queue screen; existing queue entries retain the service they selected.
- Changing service duration or price affects new queue entries.
- Barber on-duty and availability changes are reflected in the other screens.
- Closing the online queue disables online joining with a clear message; walk-ins can still be added by reception.
- Statistics update from the day's queue activity.

## Shared empty, loading and error states
- Empty queue: `No one waiting — walk right in!`
- No barber available: explain that no barber is currently available and direct the customer to reception.
- Loading: show a concise loading indicator without losing the page structure.
- Network/synchronisation error: explain that live updates are temporarily unavailable and provide a retry action.
- Invalid form: show the error next to the relevant field and preserve valid entered data.
- Closed online queue: explain that online joining is closed and walk-ins may be handled at reception.

## Screen acceptance checklist
- [ ] All seven routes load directly.
- [ ] Navigation and every visible button have a working action.
- [ ] Join Queue updates its summary as services are selected.
- [ ] Customer status changes when reception and barber actions occur.
- [ ] Reception, barber and TV screens stay synchronised.
- [ ] English/Gujarati toggle translates all visible labels.
- [ ] Phone, tablet and TV layouts are usable at their target sizes.
- [ ] Phone-screen tap targets are at least 44px.
