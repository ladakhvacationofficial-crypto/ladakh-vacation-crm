import { BookingsService } from './bookings.service';
import { BookingStatus, Role } from '@prisma/client';

describe('Vouchers & Movement Operations', () => {
  let service: BookingsService;
  let mockPrisma: any;
  let mockOfflineConversions: any;

  const mockActor: any = {
    id: 'user-admin',
    email: 'admin@ladakhvacation.in',
    role: Role.SUPER_ADMIN,
  };

  beforeEach(() => {
    mockPrisma = {
      booking: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      vendor: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      itinerary: {
        findUnique: jest.fn(),
      },
    };
    mockOfflineConversions = {
      uploadBookingConversion: jest.fn(),
    };
    service = new BookingsService(mockPrisma, mockOfflineConversions);
  });

  describe('getHotelVoucherData', () => {
    it('constructs complete hotel confirmation voucher details', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b-101',
        bookingNumber: 'LV-B-2026-0042',
        packageName: 'Classic Ladakh 6N/7D',
        travelStartDate: new Date('2027-06-15'),
        travelEndDate: new Date('2027-06-21'),
        adults: 4,
        children: 1,
        nights: 6,
        notes: 'Ground floor rooms preferred for elderly guest.',
        lead: {
          name: 'Vikram Malhotra',
          phone: '+91 98100 12345',
          email: 'vikram@example.com',
        },
        costs: [
          {
            vendorId: 'v-hotel-1',
            description: 'Deluxe Heritage Room Booking',
          },
        ],
      });

      mockPrisma.vendor.findMany.mockResolvedValue([
        {
          id: 'v-hotel-1',
          name: 'The Grand Dragon Ladakh',
          city: 'Leh',
          type: 'HOTEL',
          address: 'Sheynam, Old Road, Leh',
          phone: '+91 1982 255266',
          contactPerson: 'Tashi Namgyal',
        },
      ]);

      const res = await service.getHotelVoucherData('b-101', mockActor);

      expect(res.voucherNumber).toBe('VCH-HTL-LV-B-2026-0042');
      expect(res.hotelName).toBe('The Grand Dragon Ladakh');
      expect(res.hotelCity).toBe('Leh');
      expect(res.guestName).toBe('Vikram Malhotra');
      expect(res.totalPax).toBe(5);
      expect(res.adults).toBe(4);
      expect(res.children).toBe(1);
      expect(res.roomCount).toBe(2); // 4 adults = 2 rooms
      expect(res.mealPlan).toContain('MAP');
      expect(res.specialRequests).toBe('Ground floor rooms preferred for elderly guest.');
    });
  });

  describe('getDriverVoucherData', () => {
    it('constructs driver duty slip with circuit route and vehicle allocation', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b-102',
        bookingNumber: 'LV-B-2026-0055',
        packageName: 'Ladakh Explorer with Innova Crysta',
        travelStartDate: new Date('2027-07-10'),
        travelEndDate: new Date('2027-07-15'),
        adults: 2,
        children: 0,
        nights: 5,
        lead: {
          name: 'Ananya Roy',
          phone: '+91 99000 54321',
          email: 'ananya@example.com',
        },
        costs: [
          {
            vendorId: 'v-trans-1',
            description: 'Innova Crysta Full Circuit',
          },
        ],
      });

      mockPrisma.vendor.findMany.mockResolvedValue([
        {
          id: 'v-trans-1',
          name: 'Ladakh Taxi Union Fleet #441',
          type: 'TRANSPORT',
        },
      ]);

      const res = await service.getDriverVoucherData('b-102', mockActor);

      expect(res.voucherNumber).toBe('VCH-DRV-LV-B-2026-0055');
      expect(res.guestName).toBe('Ananya Roy');
      expect(res.vehicleType).toContain('Innova Crysta');
      expect(res.circuitDays.length).toBeGreaterThanOrEqual(6);
      expect(res.circuitDays.some((d) => d.routeTitle.includes('Khardung La'))).toBe(true);
      expect(res.circuitDays.some((d) => d.routeTitle.includes('Pangong'))).toBe(true);
    });
  });

  describe('getDailyMovement', () => {
    it('aggregates daily arrivals, departures, pass crossings and valley stays', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'b-arr',
          bookingNumber: 'LV-B-2026-001',
          packageName: 'Arrivals Group',
          travelStartDate: new Date('2027-06-15T08:00:00Z'),
          travelEndDate: new Date('2027-06-20T10:00:00Z'),
          adults: 2,
          children: 0,
          nights: 5,
          lead: { id: 'l-1', name: 'Rohan Sharma', phone: '9876500001', email: 'rohan@test.com' },
          costs: [{ vendorId: 'v-hotel-leh', description: 'Leh Hotel' }],
        },
        {
          id: 'b-transit-nubra',
          bookingNumber: 'LV-B-2026-002',
          packageName: 'Nubra Bound Group',
          travelStartDate: new Date('2027-06-13T08:00:00Z'), // Day 3 on June 15
          travelEndDate: new Date('2027-06-18T10:00:00Z'),
          adults: 3,
          children: 1,
          nights: 5,
          lead: { id: 'l-2', name: 'Pooja Verma', phone: '9876500002', email: 'pooja@test.com' },
          costs: [{ vendorId: 'v-camp-nubra', description: 'Nubra Luxury Camp' }],
        },
        {
          id: 'b-dep',
          bookingNumber: 'LV-B-2026-003',
          packageName: 'Departure Group',
          travelStartDate: new Date('2027-06-10T08:00:00Z'),
          travelEndDate: new Date('2027-06-15T11:00:00Z'), // Departs June 15
          adults: 2,
          children: 0,
          nights: 5,
          lead: { id: 'l-3', name: 'Sunil Mehta', phone: '9876500003', email: 'sunil@test.com' },
          costs: [{ vendorId: 'v-hotel-leh2', description: 'Grand Dragon' }],
        },
      ]);

      mockPrisma.vendor.findMany.mockResolvedValue([
        { id: 'v-hotel-leh', name: 'Hotel Singge Palace', type: 'HOTEL', city: 'Leh' },
        { id: 'v-camp-nubra', name: 'Mystic Meadows Camp', type: 'CAMP', city: 'Nubra' },
        { id: 'v-hotel-leh2', name: 'Grand Dragon', type: 'HOTEL', city: 'Leh' },
      ]);

      const res = await service.getDailyMovement('2027-06-15', mockActor);

      expect(res.summary.totalGuestsInDestination).toBe(8); // 2 + 4 + 2
      expect(res.summary.activeBookingsCount).toBe(3);
      expect(res.summary.arrivalsToday).toBe(1);
      expect(res.arrivals[0].guestName).toBe('Rohan Sharma');
      expect(res.summary.departuresToday).toBe(1);
      expect(res.departures[0].guestName).toBe('Sunil Mehta');
      expect(res.inTransit.length).toBe(1);
      expect(res.inTransit[0].sector).toContain('Khardung La');
      expect(res.valleyDistribution.nubra.length).toBe(1);
      expect(res.valleyDistribution.nubra[0].guestName).toBe('Pooja Verma');
    });
  });
});
