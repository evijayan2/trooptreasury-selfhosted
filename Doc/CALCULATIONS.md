# Calculation Scenarios & Logic

This document provides concrete examples of how TroopTreasury calculates financial splits for various scenarios.

---

## 1. Campout Cost Splitting

**Scenario:** "Wilderness Survival Campout 2026"
An event where the total cost is shared among participants.

**Add Data:**
- **Expenses Recorded:**
  - Site Reservation: $200 (Paid by Troop Card)
  - Food: $300 (Paid by Adult Leader A - Reimbursable)
  - Propane: $50 (Paid by Adult Leader B - Reimbursable)
  - **Total Expenses**: $550

- **Roster (Participants):**
  - 10 Scouts (Attendees)
  - 2 Adult Leaders (Attendees)
  - 3 Adult Organizers (Staff - do not pay)
  - **Total Paying Participants**: 12

**Verify Calculation:**
1.  **Total Cost**: $200 + $300 + $50 = **$550**
2.  **Cost Per Person**: $550 / 12 = **$45.83**
3.  **Individual Obligations**:
    - Each Scout owes: $45.83
    - Each Adult Attendee owes: $45.83
    - Organizers owe: $0.00
4.  **Reimbursements**:
    - Adult Leader A is owed: $300
    - Adult Leader B is owed: $50

---

## 2. General Fundraising (Simple Percentage)

**Scenario:** "Holiday Wreath Sale"
A simple fundraiser where the troop keeps 70% and the scout gets 30% of their sales.

**Add Data:**
- **Campaign Settings**:
  - Type: `GENERAL`
  - IBA Percentage: 30%
- **Transaction:**
  - Scout "Johnny" brings in a check for **$200** for wreaths he sold.

**Verify Calculation:**
1.  **Gross Amount**: $200
2.  **Scout Allocation (30%)**: $200 * 0.30 = **$60.00** (Credited to Johnny's IBA)
3.  **Troop Fund (70%)**: $200 - $60 = **$140.00** (Retained by Troop)

---

## 3. Product Sale Fundraising (Multi-Product)

**Scenario:** "Fall Popcorn Sale 2025"
Selling specific inventory items with defined costs and profits.

**Add Data:**
- **Products:**
  - *Classic Caramel*: Price $10, Cost $6, **Scout Profit $2**
  - *Cheese Lover Tin*: Price $20, Cost $12, **Scout Profit $5**
  - *Donation*: Price $1, Cost $0, **Scout Profit $0.50**

- **Sales Recorded (Scout "Timmy"):**
  - 10 x Classic Caramel
  - 2 x Cheese Lover Tin

**Verify Calculation:**
1.  **Total Collected (Revenue)**:
    - (10 * $10) + (2 * $20) = $100 + $40 = **$140.00**
2.  **Total Vendor Cost**:
    - (10 * $6) + (2 * $12) = $60 + $24 = **$84.00**
3.  **Scout IBA Earnings**:
    - (10 * $2) + (2 * $5) = $20 + $10 = **$30.00**
4.  **Troop Net Profit**:
    - $140 (Rev) - $84 (Cost) - $30 (Scout) = **$26.00**

*Note: Funds are credited to Timmy's IBA only when the campaign is marked CLOSED.*

---

## 4. Complex Event Fundraiser (The "Shotgun" Model)

**Scenario:** "Charity Shotgun Event"
A complex event with tickets, a volunteer pool, and a seller pool.
**Settings:**
- Ticket Price: $100
- Total Allocation to Scouts: 30% (Split into pools below)
- **Volunteer Pool**: 5% of Net Profit
- **Seller Pool**: 25% of Net Profit (Allocated by tickets sold)

**Add Data:**
- **Income**:
  - Ticket Sales: 15 Tickets * $100 = $1,500
  - General Donation: $500
  - **Total Income**: $2,000
- **Expenses**:
  - Gift Basket & Supplies: $200
- **Activity**:
  - Scout A: Sold 10 tickets, Volunteered.
  - Scout B: Sold 5 tickets.
  - Scout C: Sold 0 tickets, Volunteered.

**Verify Calculation:**
1.  **Net Profit**:
    - $2,000 (Income) - $200 (Expense) = **$1,800**
    
2.  **Pool Calculations**:
    - **Volunteer Pool (5%)**: $1,800 * 0.05 = **$90.00**
    - **Seller Pool (25%)**: $1,800 * 0.25 = **$450.00**

3.  **Distribution Rates**:
    - **Volunteer Share**: $90 / 2 Volunteers (A & C) = **$45.00 per Volunteer**
    - **Seller Share**: $450 / 15 Tickets Sold = **$30.00 per Ticket**

4.  **Final Scout Shares**:
    - **Scout A**:
        - Sales: 10 * $30 = $300
        - Volunteer: $45
        - **Total**: **$345.00**
    - **Scout B**:
        - Sales: 5 * $30 = $150
        - Volunteer: $0
        - **Total**: **$150.00**
    - **Scout C**:
        - Sales: 0
        - Volunteer: $45
        - **Total**: **$45.00**

5.  **Check Sum**:
    - $345 + $150 + $45 = **$540.00**
    - Total Allocated (30% of $1,800) = $540.00. **Matches.**
