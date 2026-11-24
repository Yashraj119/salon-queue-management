# Salon Queue — Project Brief & Scope

## Problem
On busy days, customers can wait a long time without knowing when their turn will come. Some leave because the wait is unclear, while others may disagree about who arrived first.

The Salon Queue Management System gives customers a way to join the queue and track their turn, while receptionists and barbers manage the queue and the waiting-area display keeps everyone informed.

## Users
- **Customer:** joins the queue, chooses services and a barber preference, and checks their live status.
- **Receptionist:** adds walk-ins, calls the next eligible customer, and handles cancellations and no-shows.
- **Barber:** sees the current and next customer, starts and completes services, and changes availability.
- **Owner:** manages services, prices, working barbers, queue availability, and daily statistics.

## Must-have features
1. Customers can join the queue from a phone by entering their name and phone number, selecting up to three services, and choosing a specific barber or **Any barber**.
2. Customers can see their token, queue position, estimated waiting time, and live status.
3. Customers receive a clear **Start coming** message when they are second in line and an **It's your turn!** message when called.
4. Receptionists can add walk-in customers, call the next eligible customer for a barber, and mark customers as no-show or cancelled.
5. Barbers can view their current customer, start a service, mark it done, and switch between available and on-break states.
6. A waiting-area TV display shows each barber's current token and the next five tokens with estimated times.
7. Owners can manage service names in English and Gujarati, duration, price and availability; manage barbers on duty; and open or close online queue joining.
8. The interface supports English and Gujarati and keeps phone, tablet and TV views in sync.

## Out of scope — do not build
- Online payments.
- Future-date appointments or appointment booking.
- SMS or WhatsApp messaging.
- Loyalty or rewards features.
- Multiple salon branches.

## Look & feel
A premium, clean, mobile-first salon interface using dark charcoal (`#1F2937`) with gold (`#D4A017`) accents, rounded cards, and English/Gujarati labels.

## Project boundaries
- Prioritise a polished, working user interface and the important end-to-end queue features.
- Do not design a database or API manually unless implementation requires it; choose the simplest storage approach that keeps customer, reception, barber and TV screens synchronised.
- Use realistic sample data while developing and testing.
