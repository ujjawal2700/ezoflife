const fs = require('fs');
const path = 'd:/ezoflife/frontend/src/modules/user/pages/HomePage.jsx';
const content = fs.readFileSync(path, 'utf8');

// 1. Update availableDates to ensure it starts from today (already does, but we'll be explicit)
// 2. Update timeSlots rendering to filter out past slots if today is selected

const timeSlotFix = `                      {timeSlots.map((slot) => {
                        const isSelected = (activeSlotType === 'pickup' ? pickupTime : deliveryTime) === slot;
                        let isDisabled = false;
                        
                        // 1. Logic for Delivery min-gap
                        if (activeSlotType === 'delivery' && selectedPickup && pickupTime && selectedDelivery) {
                          const pickupDT = getSlotDateTime(selectedPickup, pickupTime);
                          const deliveryDT = getSlotDateTime(selectedDelivery, slot);
                          const minHours = isExpress ? 24 : 72;
                          const diffHours = (deliveryDT - pickupDT) / (1000 * 60 * 60);
                          if (diffHours < minHours) isDisabled = true;
                        }

                        // 2. Logic for Past Time Slots (Today only)
                        const isToday = (activeSlotType === 'pickup' ? selectedPickup : selectedDelivery)?.includes('TODAY');
                        if (isToday) {
                          const [slotStart] = slot.split(' - ');
                          const slotDT = getSlotDateTime(activeSlotType === 'pickup' ? selectedPickup : selectedDelivery, slot);
                          if (slotDT && slotDT < new Date()) isDisabled = true;
                        }

                        return (<button key={slot} disabled={isDisabled} onClick={() => activeSlotType === 'pickup' ? setPickupTime(slot) : setDeliveryTime(slot)} className={\`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all \${isDisabled ? 'opacity-20 cursor-not-allowed grayscale' : (isSelected ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-slate-50 text-slate-400 border-slate-100')}\`}>{slot}</button>);
                      })}`;

let newContent = content.replace(/\{timeSlots\.map\(\(slot\) => \{[\s\S]+?\}\)\}/, timeSlotFix);

fs.writeFileSync(path, newContent);
console.log('Time slot filtering logic (Past slots for Today) implemented');
