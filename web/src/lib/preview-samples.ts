import type { LessorDashboard } from "@/lib/lessor-dashboard";
import type { RenterDashboardProps } from "@/components/renter-dashboard";
import type { ForecastMonth } from "@/components/year-forecast";
import type {
  RenterRentalsData,
  RenterRentalDetailData,
} from "@/lib/renter-rentals";

/**
 * Hand-made sample data for the admin "preview a dashboard" pages, so the
 * founder can see exactly what a lessor and a renter see — even before any real
 * users exist. Money is in centavos (₱8,500 = 850000).
 */

export const SAMPLE_LESSOR: LessorDashboard = {
  outstanding: 1_850_000,
  proofsToReview: 1,
  anyOverdue: true,
  properties: [
    {
      id: "sample-1",
      name: "Unit 2 · Ground floor",
      tenant: "Juan dela Cruz",
      monthly: 850_000,
      owed: 0,
      overdueCount: 0,
      proofCount: 0,
      allPaid: true,
      vacant: false,
      assetId: "sample-1",
      coverPhoto: null,
      photoCount: 0,
      transactionNo: "DM-7KQ3PX2M",
      attention: [],
      nextDue: "2026-11-05",
      lastPaid: "2026-10-05",
    },
    {
      id: "sample-2",
      name: "Apartment B",
      tenant: "Maria Santos",
      monthly: 1_200_000,
      owed: 1_200_000,
      overdueCount: 1,
      proofCount: 0,
      allPaid: false,
      vacant: false,
      assetId: "sample-2",
      coverPhoto: null,
      photoCount: 0,
      transactionNo: "DM-9ZT4MW6B",
      nextDue: null,
      lastPaid: "2026-08-05",
      attention: [
        {
          periodId: "sample-2-sep",
          dueDate: "2026-09-05",
          remaining: 1_200_000,
          tone: "overdue",
          proof: false,
          reminderCount: 3,
          reminderLast: "2026-10-01T09:00:00+08:00",
        },
      ],
    },
    {
      id: "sample-3",
      name: "Studio C",
      tenant: "Pedro Reyes",
      monthly: 650_000,
      owed: 650_000,
      overdueCount: 0,
      proofCount: 1,
      allPaid: false,
      vacant: false,
      assetId: "sample-3",
      coverPhoto: null,
      photoCount: 0,
      transactionNo: "DM-2H8NRC5K",
      nextDue: null,
      lastPaid: "2026-09-05",
      attention: [
        {
          periodId: "sample-3-oct",
          dueDate: "2026-10-05",
          remaining: 650_000,
          tone: "due",
          proof: true,
          reminderCount: 1,
          reminderLast: "2026-10-02T09:00:00+08:00",
        },
      ],
    },
    {
      id: "sample-4",
      name: "Studio D · 2nd floor",
      tenant: "",
      monthly: 0,
      owed: 0,
      overdueCount: 0,
      proofCount: 0,
      allPaid: true,
      vacant: true,
      assetId: "sample-4",
      coverPhoto: null,
      photoCount: 0,
      transactionNo: null,
      nextDue: null,
      lastPaid: null,
      attention: [],
    },
  ],
};

function sampleMonths(): ForecastMonth[] {
  const rent = 850_000;
  const months: ForecastMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const dueDate = `2026-${String(m).padStart(2, "0")}-05`;
    let status: ForecastMonth["status"];
    let paid = 0;
    if (m <= 9) {
      status = "paid";
      paid = rent;
    } else if (m === 10) {
      status = "due";
    } else {
      status = "upcoming";
    }
    months.push({
      periodId: `sample-${m}`,
      dueDate,
      due: rent,
      paid,
      remaining: rent - paid,
      status,
      isNow: m === 10,
      reminders:
        m === 10
          ? [
              {
                sentAt: "2026-10-02T09:00:00+08:00",
                label: "Reminder",
                body: "Kumusta Juan! Paalala lang po, due na ang upa ninyo (₱8,500) ngayong Oct 5. Salamat po! 🙏",
              },
            ]
          : [],
    });
  }
  return months;
}

export const SAMPLE_TENANT: RenterDashboardProps = {
  token: "preview",
  firstName: "Juan",
  unitLabel: "Unit 2 · Ground floor",
  address: "123 Mabini St, Brgy. Poblacion, Lipa City, Batangas",
  scheduleLabel: "Monthly · due on the 5th",
  outstanding: 850_000,
  dueNow: {
    remaining: 850_000,
    dueDate: "2026-10-05",
    paid: 0,
    due: 850_000,
  },
  months: sampleMonths(),
  unpaidForProof: [],
  methods: ["gcash", "maya", "bank_transfer"],
  paymentInstructions:
    "GCash: Juan dela Cruz · 0917 123 4567\nMaya: 0917 123 4567\nBPI: 1234-5678-90",
  contract: null,
  hasRenterId: true,
};

/** Sample per-unit timetable (the "Apartment B" overdue case from SAMPLE_LESSOR). */
function sampleUnitMonths(): ForecastMonth[] {
  const rent = 1_200_000;
  const MON = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const months: ForecastMonth[] = [];
  for (let m = 0; m < 12; m++) {
    const dueDate = `2026-${String(m + 1).padStart(2, "0")}-05`;
    const prev = MON[(m + 11) % 12];
    const preDue = {
      sentAt: `2026-${String(((m + 11) % 12) + 1).padStart(2, "0")}-29T09:00:00+08:00`,
      label: "3 days before",
      body: `Kumusta po! Paalala lang, due na ang upa (₱12,000) sa ${MON[m]} 5. Salamat po! 🙏`,
    };
    if (m <= 7) {
      months.push({
        periodId: `s-${m}`,
        dueDate,
        due: rent,
        paid: rent,
        remaining: 0,
        status: "paid",
        isNow: false,
        reminders: [{ ...preDue, label: `before ${prev}` }],
      });
    } else if (m === 8) {
      months.push({
        periodId: `s-${m}`,
        dueDate,
        due: rent,
        paid: 0,
        remaining: rent,
        status: "overdue",
        isNow: false,
        reminders: [
          { sentAt: "2026-09-11T09:00:00+08:00", label: "weekly follow-up", body: "Kumusta po! Overdue na po ang upa ninyo. Pwede po ba natin ayusin? Salamat! 🙏" },
          { sentAt: "2026-09-08T09:00:00+08:00", label: "3 days after", body: "Hi po, lampas na po sa due ang upa. Paalala lang po. Salamat!" },
          { sentAt: "2026-09-05T09:00:00+08:00", label: "on due date", body: "Due na po ngayon ang upa (₱12,000). Salamat po!" },
          { sentAt: "2026-09-02T09:00:00+08:00", label: "3 days before", body: "Paalala po, due na ang upa sa Sep 5. Salamat!" },
        ],
      });
    } else if (m === 9) {
      months.push({
        periodId: `s-${m}`,
        dueDate,
        due: rent,
        paid: 600_000,
        remaining: 600_000,
        status: "partial",
        isNow: true,
        reminders: [preDue],
      });
    } else {
      months.push({
        periodId: `s-${m}`,
        dueDate,
        due: rent,
        paid: 0,
        remaining: rent,
        status: "upcoming",
        isNow: false,
        reminders: [],
      });
    }
  }
  return months;
}

export const SAMPLE_UNIT = {
  agreementId: "sample-2",
  unitLabel: "Apartment B",
  renterName: "Maria Santos",
  scheduleLabel: "Monthly · due on the 5th",
  months: sampleUnitMonths(),
  collected: 10_200_000,
  outstanding: 1_800_000,
  remindersSent: 13,
  transactionNo: "DM-9ZT4MW6B",
  isActive: true,
  documents: {
    contractUrl: "#sample-contract",
    lessorIdUrl: "#sample-lessor-id",
    renterIdUrl: "#sample-renter-id",
  },
};

// ---- Renter records list + detail (new list→detail renter dashboard) ----

/** The renter's records list: a couple of apartments they rent. */
export const SAMPLE_TENANT_RENTALS: RenterRentalsData = {
  rentals: [
    {
      id: "sample-rental-1",
      unitLabel: "Unit 2 · Ground floor",
      address: "123 Mabini St, Brgy. Poblacion, Lipa City, Batangas",
      monthly: 850_000,
      outstanding: 850_000,
      overdueCount: 0,
      allPaid: false,

      transactionNo: "DM-4XJ7QD3P",
    },
    {
      id: "sample-rental-2",
      unitLabel: "Studio near school",
      address: "45 Rizal Ave, Brgy. San Jose, Batangas City",
      monthly: 650_000,
      outstanding: 0,
      overdueCount: 0,
      allPaid: true,

      transactionNo: "DM-6PLY8VA2",
    },
  ],
  totalOutstanding: 850_000,
  activeCount: 2,
};

/** The detail for one sample rental (the active Unit 2). */
export const SAMPLE_TENANT_DETAIL: RenterRentalDetailData = {
  id: "sample-rental-1",
  token: "preview",
  unitLabel: SAMPLE_TENANT.unitLabel,
  address: SAMPLE_TENANT.address,
  scheduleLabel: SAMPLE_TENANT.scheduleLabel,
  outstanding: SAMPLE_TENANT.outstanding,
  dueNow: SAMPLE_TENANT.dueNow,
  months: SAMPLE_TENANT.months,
  unpaidForProof: SAMPLE_TENANT.unpaidForProof,
  methods: SAMPLE_TENANT.methods,
  paymentInstructions: SAMPLE_TENANT.paymentInstructions,
  contract: SAMPLE_TENANT.contract,
  hasRenterId: SAMPLE_TENANT.hasRenterId,
  transactionNo: "DM-4XJ7QD3P",
  isActive: true,
  lessorIdUrl: "#sample-lessor-id",
  renterIdUrl: "#sample-renter-id",
  messagesByPeriod: {},
  unitPhotos: [],
};
