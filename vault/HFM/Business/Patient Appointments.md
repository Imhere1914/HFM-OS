# Patient Appointments — HFM

## Default Calendar
- **Name:** 30 Minute Consultation
- **Slug:** `30-min`
- **Duration:** 30 minutes
- **Buffer:** 5 min before + 5 min after
- **Availability:** Mon–Fri, 9:00 AM – 5:00 PM (America/New_York)
- **Max per day:** 8
- **Type:** Video

## Booking URL
- OS page: `https://os.holisticfunctionalcare.com/book/hfm?calendar=30-min`

## Booking Flow
1. Patient clicks booking button on website
2. Calendar grid → pick a date (available weekdays)
3. Time slot selection
4. Patient details form: Name, Phone, Email, Notes
   - SMS consent shown at point of data collection
5. Confirmation screen

## Post-Booking Automation
- Auto-creates patient contact in CRM
- Fires `new_appointment` automation trigger
- Sends confirmation email (requires Resend configured)
- Can trigger appointment reminder automation

## Managing Blocked Dates
In OS → Scheduling → select calendar → Date Overrides tab:
- Add blocked dates (vacation, holidays, etc.)
- These dates grey out in the patient-facing calendar

## Appointment Statuses
`scheduled` → `confirmed` → `completed` / `cancelled` / `no_show`
Update status from OS → Appointments screen.
