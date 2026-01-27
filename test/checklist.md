# Create Ticket Page - Manual Test Checklist

## Prerequisites
- [ ] MongoDB connected and running
- [ ] User logged in with Privy
- [ ] Wallet connected (embedded wallet)

## Test 1: Basic Form Rendering
- [ ] Page loads without errors
- [ ] All form fields are visible
- [ ] Category dropdown shows options
- [ ] Date/time pickers work
- [ ] Image upload area visible

## Test 2: Free Event Creation
1. **Fill Form:**
   - [ ] Event Name: "Free Community Meetup"
   - [ ] Dates: Today & Tomorrow
   - [ ] Category: "Networking"
   - [ ] Location: "Community Center"
   - [ ] Description: "Free networking event"
   - [ ] Price: Keep as "Free"
   - [ ] Capacity: "Unlimited"
   - [ ] Upload test image
   
2. **Submit Form:**
   - [ ] Click "Create Event"
   - [ ] See loading indicator
   - [ ] See success toast
   - [ ] Redirect to dashboard
   
3. **Verify Database:**
   - [ ] Event exists in MongoDB
   - [ ] isFree: true
   - [ ] isOnChain: false
   - [ ] transactionHash: "FREE_EVENT_NO_TX"

## Test 3: Paid Event Creation
1. **Fill Form:**
   - [ ] Event Name: "VIP Workshop"
   - [ ] Select "Paid" option
   - [ ] Price: "49.99"
   - [ ] Currency: "USD"
   - [ ] Ticket Type: "VIPPremium"
   - [ ] Capacity: "50"
   - [ ] Upload image
   
2. **Submit Form:**
   - [ ] See IPFS upload progress
   - [ ] See blockchain minting progress
   - [ ] See success message
   - [ ] Redirect to dashboard
   
3. **Verify Database:**
   - [ ] Event saved with isOnChain: true
   - [ ] Transaction hash exists
   - [ ] TicketType created
   - [ ] imageCid and metadataCid populated

## Test 4: Validation Tests
- [ ] Try empty form → shows errors
- [ ] Try negative price → shows error
- [ ] Try invalid date → shows error
- [ ] Try image >5MB → shows error
- [ ] Try without wallet → shows error

## Test 5: Virtual Event
- [ ] Enter "Virtual Conference" as location
- [ ] Virtual options appear
- [ ] Select virtual options
- [ ] Submit → saves virtualOptions correctly

## Test 6: Edge Cases
- [ ] Event with custom category
- [ ] Event with past date (should work)
- [ ] Long description (2000 chars)
- [ ] Special characters in title
- [ ] Multiple rapid submissions