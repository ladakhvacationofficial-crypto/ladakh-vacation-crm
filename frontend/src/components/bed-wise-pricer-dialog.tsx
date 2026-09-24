'use client';

import { useMemo, useState } from 'react';
import { Calculator, Copy, Check, Info } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/badge';
import { money } from '@/lib/format';

export function BedWisePricerDialog({
  open,
  onClose,
  initialNights = 5,
  initialPax = 4,
}: {
  open: boolean;
  onClose: () => void;
  initialNights?: number;
  initialPax?: number;
}) {
  const [nights, setNights] = useState(initialNights);
  const [doubleRooms, setDoubleRooms] = useState(Math.ceil(initialPax / 2));
  const [hotelCostPerRoom, setHotelCostPerRoom] = useState(4500);
  const [transportCost, setTransportCost] = useState(38000);
  const [fixedActivitiesCost, setFixedActivitiesCost] = useState(4500);
  const [miscCost, setMiscCost] = useState(2000);

  // Occupancy breakdown
  const [adultDouble, setAdultDouble] = useState(initialPax);
  const [adultExtraBed, setAdultExtraBed] = useState(0);
  const [childExtraBed, setChildExtraBed] = useState(0);
  const [childNoBed, setChildNoBed] = useState(0);

  // Extra bed costs
  const [extraBedAdultPerNight, setExtraBedAdultPerNight] = useState(1500);
  const [extraBedChildPerNight, setExtraBedChildPerNight] = useState(1000);

  const [markupPercent, setMarkupPercent] = useState(20);
  const [gstPercent, setGstPercent] = useState(5);
  const [copied, setCopied] = useState(false);

  // Real-time Ladakh DMC Calculation
  const quote = useMemo(() => {
    const totalPax = adultDouble + adultExtraBed + childExtraBed + childNoBed;
    const payingPax = Math.max(1, totalPax);

    // Shared costs per head
    const sharedFixed = transportCost + fixedActivitiesCost + miscCost;
    const sharedPerPerson = sharedFixed / payingPax;

    // Room costs
    const totalDoubleRoomCost = doubleRooms * hotelCostPerRoom * nights;
    const doublePaxCount = Math.max(1, adultDouble);
    const roomCostPerDoubleAdult = totalDoubleRoomCost / doublePaxCount;

    // Line base costs
    const baseAdultDouble = roomCostPerDoubleAdult + sharedPerPerson;
    const baseAwEB = extraBedAdultPerNight * nights + sharedPerPerson;
    const baseCwEB = extraBedChildPerNight * nights + sharedPerPerson;
    const baseCNB = sharedPerPerson * 0.7; // Child no bed pays partial shared costs

    function processCategory(baseCost: number) {
      const withMarkup = baseCost * (1 + markupPercent / 100);
      const withGst = withMarkup * (1 + gstPercent / 100);
      const roundedSell = Math.ceil(withGst / 100) * 100; // DMC standard ₹100 rounding
      return {
        baseCost: Math.round(baseCost),
        sellingPrice: roundedSell,
      };
    }

    const adultQuote = processCategory(baseAdultDouble);
    const awebQuote = processCategory(baseAwEB);
    const cwebQuote = processCategory(baseCwEB);
    const cnbQuote = processCategory(baseCNB);

    const totalCalculated =
      adultDouble * adultQuote.sellingPrice +
      adultExtraBed * awebQuote.sellingPrice +
      childExtraBed * cwebQuote.sellingPrice +
      childNoBed * cnbQuote.sellingPrice;

    return {
      totalPax,
      adultQuote,
      awebQuote,
      cwebQuote,
      cnbQuote,
      totalCalculated,
      sharedPerPerson: Math.round(sharedPerPerson),
      roomCostPerDoubleAdult: Math.round(roomCostPerDoubleAdult),
    };
  }, [
    nights,
    doubleRooms,
    hotelCostPerRoom,
    transportCost,
    fixedActivitiesCost,
    miscCost,
    adultDouble,
    adultExtraBed,
    childExtraBed,
    childNoBed,
    extraBedAdultPerNight,
    extraBedChildPerNight,
    markupPercent,
    gstPercent,
  ]);

  function copyQuotation() {
    const text = `*LADAKH VACATION — BED-WISE QUOTATION*
Duration: ${nights} Nights / ${nights + 1} Days
Pax: ${quote.totalPax} (${doubleRooms} Double Rooms)

💰 *Per-Person Pricing Breakdown (GST 5% Included)*:
• Double Sharing (/Adult): ${money(quote.adultQuote.sellingPrice)} per adult (${adultDouble} pax)
${adultExtraBed > 0 ? `• Adult with Extra Bed (/AwEB): ${money(quote.awebQuote.sellingPrice)} per person (${adultExtraBed} pax)\n` : ''}${childExtraBed > 0 ? `• Child with Extra Bed (/CwEB): ${money(quote.cwebQuote.sellingPrice)} per child (${childExtraBed} pax)\n` : ''}${childNoBed > 0 ? `• Child without Bed (/CNB): ${money(quote.cnbQuote.sellingPrice)} per child (${childNoBed} pax)\n` : ''}
*Total Tour Quotation:* ${money(quote.totalCalculated)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Bed-Wise Occupancy Pricing Calculator" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5">

        <div className="space-y-4 py-2">
          {/* Section 1: Trip & Shared Costs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-ink-800 bg-ink-900">
            <div className="space-y-1">
              <Label className="text-[11px]">Nights</Label>
              <Input
                type="number"
                value={nights}
                onChange={(e) => setNights(Number(e.target.value) || 1)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Double Rooms</Label>
              <Input
                type="number"
                value={doubleRooms}
                onChange={(e) => setDoubleRooms(Number(e.target.value) || 1)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Hotel / Room / Nt (₹)</Label>
              <Input
                type="number"
                value={hotelCostPerRoom}
                onChange={(e) => setHotelCostPerRoom(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Transport / Cab (₹)</Label>
              <Input
                type="number"
                value={transportCost}
                onChange={(e) => setTransportCost(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Section 2: Occupancy Headcount */}
          <div className="p-3 rounded-lg border border-ink-800 bg-ink-900 space-y-2">
            <p className="text-[12px] font-semibold text-ink-200">Traveller Occupancy Roster</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px]">Adult Double (/Adult)</Label>
                <Input
                  type="number"
                  value={adultDouble}
                  onChange={(e) => setAdultDouble(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Adult + Extra Bed (/AwEB)</Label>
                <Input
                  type="number"
                  value={adultExtraBed}
                  onChange={(e) => setAdultExtraBed(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Child + Extra Bed (/CwEB)</Label>
                <Input
                  type="number"
                  value={childExtraBed}
                  onChange={(e) => setChildExtraBed(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Child No Bed (/CNB)</Label>
                <Input
                  type="number"
                  value={childNoBed}
                  onChange={(e) => setChildNoBed(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Extra Bed Costs & Markup */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-ink-800 bg-ink-900">
            <div className="space-y-1">
              <Label className="text-[11px]">AwEB / Night (₹)</Label>
              <Input
                type="number"
                value={extraBedAdultPerNight}
                onChange={(e) => setExtraBedAdultPerNight(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">CwEB / Night (₹)</Label>
              <Input
                type="number"
                value={extraBedChildPerNight}
                onChange={(e) => setExtraBedChildPerNight(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Markup %</Label>
              <Input
                type="number"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">GST %</Label>
              <Input
                type="number"
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Section 4: Live Bed-Wise Rate Card Output */}
          <div className="rounded-lg border border-signal-500/30 bg-signal-500/8 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-signal-300 text-[13px]">
                Calculated Per-Person Selling Quotes (GST 5% + ₹100 Rounded):
              </p>
              <Chip className="bg-signal-500/20 text-signal-400">{quote.totalPax} Total Pax</Chip>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded bg-ink-900 border border-ink-800">
                <p className="text-ink-400 font-medium">/Adult (Double)</p>
                <p className="tabular text-base font-bold text-ink-100 mt-1">
                  {money(quote.adultQuote.sellingPrice)}
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">{adultDouble} pax</p>
              </div>

              <div className="p-2.5 rounded bg-ink-900 border border-ink-800">
                <p className="text-ink-400 font-medium">/AwEB (Extra Bed)</p>
                <p className="tabular text-base font-bold text-ink-100 mt-1">
                  {money(quote.awebQuote.sellingPrice)}
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">{adultExtraBed} pax</p>
              </div>

              <div className="p-2.5 rounded bg-ink-900 border border-ink-800">
                <p className="text-ink-400 font-medium">/CwEB (Child Bed)</p>
                <p className="tabular text-base font-bold text-ink-100 mt-1">
                  {money(quote.cwebQuote.sellingPrice)}
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">{childExtraBed} pax</p>
              </div>

              <div className="p-2.5 rounded bg-ink-900 border border-ink-800">
                <p className="text-ink-400 font-medium">/CNB (No Bed)</p>
                <p className="tabular text-base font-bold text-ink-100 mt-1">
                  {money(quote.cnbQuote.sellingPrice)}
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">{childNoBed} pax</p>
              </div>
            </div>

            <div className="pt-2 border-t border-signal-500/20 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-ink-300">
                Total File Value (Sum of Rounded Lines):
              </span>
              <span className="tabular text-lg font-bold text-brand-400">
                {money(quote.totalCalculated)}
              </span>
            </div>
          </div>
        </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-ink-800 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={copyQuotation}>
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy Quote Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
