# Calendar & Booking — Simple Connect

## Default Calendar
- **Name:** 30 Minute Meeting
- **Slug:** `30-min`
- **Duration:** 30 minutes
- **Buffer:** 5 min before + 5 min after
- **Availability:** Mon–Fri, 9:00 AM – 5:00 PM (America/New_York)
- **Booking window:** 30 days out
- **Max per day:** 8
- **Meeting type:** Video
- **Color:** #22c55e (brand green)

## Booking URL
- OS booking page: `https://os.simpleconnect2.com/book/sc?calendar=30-min`
- Website modal calls: `https://www.simpleconnect2.com/api/calendars/30-min?brand=sc`

## Website Booking Flow
1. Visitor clicks "Book a Demo" on any page
2. **Step 1** — Month calendar (available weekdays highlighted green)
3. **Step 2** — Time slot picker (30-min intervals, 9 AM–5 PM)
4. **Step 3** — Contact form: Name, Business Name, Phone, Email, Notes
   - Transactional SMS consent disclosure shown
   - Optional marketing opt-in checkbox
5. **Step 4** — Confirmation screen

## API Endpoints (public, no auth required)
- `GET /api/calendars/:slug?brand=sc` — fetch calendar config
- `POST /api/appointments` — create booking

## Auto-Contact Creation
When a booking is submitted:
- Checks for existing contact by email
- Creates new contact if none found
- Links appointment to contact
- Fires `new_appointment` automation trigger
- Sends confirmation email (if Resend configured)

## Managing Calendars
- Go to OS → Scheduling
- GHL-style interface: General / Availability / Date Overrides / Form Fields / Share tabs
- Blocked dates can be set per calendar
- Multiple calendars supported per brand

## A2P SMS Compliance
See [[A2P SMS Compliance]] for opt-in language and registration details.
