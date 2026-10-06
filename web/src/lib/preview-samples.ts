import type { LessorDashboard } from "@/lib/lessor-dashboard";
import type { RenterDashboardProps } from "@/components/renter-dashboard";
import type { ForecastMonth } from "@/components/year-forecast";

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
