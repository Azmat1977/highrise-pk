// File: components/property-detail/PropertyPaymentPlan.tsx
// Installment timeline, developer project progress, and legal approvals card

import React from "react";
import { HardHat, ClipboardCheck } from "lucide-react";
import PaymentTimeline from "@/components/property/PaymentTimeline";
import { formatDate, formatPrice } from "./propertyDetailUtils";

interface InstallmentPlan {
  planName?: string;
  developerName?: string;
  planDuration?: number;
  planDurationUnit?: string;
  hasMonthly?: boolean;
  monthlyAmount?: number;
  monthlyCount?: number;
  hasQuarterly?: boolean;
  quarterlyAmount?: number;
  quarterlyCount?: number;
  hasHalfYearly?: boolean;
  halfYearlyAmount?: number;
  halfYearlyCount?: number;
  hasYearly?: boolean;
  yearlyAmount?: number;
  yearlyCount?: number;
}

interface BookingPayment {
  amount?: number;
  percentage?: number;
  dueDate?: string;
  isPaid?: boolean;
}

interface PossessionPayment {
  amount?: number;
  percentage?: number;
  dueDate?: string;
  isPaid?: boolean;
}

interface ProjectDetails {
  projectName?: string;
  developerName?: string;
  projectStatus?: string;
  developmentProgress?: number;
  launchDate?: string;
  expectedCompletionDate?: string;
}

interface Approvals {
  authority?: string;
}

interface Legal {
  ownershipType?: string;
}

interface PropertyPaymentPlanProps {
  booking?: BookingPayment;
  downPayment?: BookingPayment;
  installmentPlan?: InstallmentPlan;
  possession?: PossessionPayment;
  totalPrice: number;
  projectDetails?: ProjectDetails;
  approvals?: Approvals;
  legal?: Legal;
  isBankFinanceAvailable?: boolean;
}

export default function PropertyPaymentPlan({
  booking,
  downPayment,
  installmentPlan,
  possession,
  totalPrice,
  projectDetails,
  approvals,
  legal,
  isBankFinanceAvailable,
}: PropertyPaymentPlanProps): React.ReactElement {
  return (
    <div id="payment-plan" className="space-y-4">
      <PaymentTimeline
        booking={booking}
        downPayment={downPayment}
        installmentPlan={installmentPlan}
        possession={possession}
        totalPrice={totalPrice}
        formatPrice={formatPrice}
      />

      {projectDetails?.projectName && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-[#029bba]" />
            Project Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-[#333333]">
                  {projectDetails.projectName}
                </p>
                {projectDetails.developerName && (
                  <p className="text-xs text-[#666666] mt-1">
                    By {projectDetails.developerName}
                  </p>
                )}
              </div>
              {projectDetails.projectStatus && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize whitespace-nowrap">
                  {String(projectDetails.projectStatus).replace(/_/g, " ")}
                </span>
              )}
            </div>

            {projectDetails.developmentProgress !== undefined && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#666666]">
                    Development Progress
                  </p>
                  <p className="text-sm font-semibold text-[#333333]">
                    {projectDetails.developmentProgress}%
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#029bba] h-2 rounded-full transition-all"
                    style={{
                      width: `${projectDetails.developmentProgress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {projectDetails.launchDate && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-[#666666]">Launch Date</p>
                  <p className="text-sm font-medium text-[#333333]">
                    {formatDate(projectDetails.launchDate)}
                  </p>
                </div>
              )}
              {projectDetails.expectedCompletionDate && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-[#666666]">
                    Expected Completion
                  </p>
                  <p className="text-sm font-medium text-[#333333]">
                    {formatDate(projectDetails.expectedCompletionDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(approvals?.authority || legal?.ownershipType) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#029bba]" />
            Legal &amp; Approvals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {approvals?.authority && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-[#666666] mb-1">
                  Approval Authority
                </p>
                <p className="font-medium text-[#333333] uppercase">
                  {approvals.authority}
                </p>
              </div>
            )}
            {legal?.ownershipType && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-[#666666] mb-1">Ownership Type</p>
                <p className="font-medium text-[#333333] capitalize">
                  {String(legal.ownershipType).replace(/_/g, " ")}
                </p>
              </div>
            )}
            {isBankFinanceAvailable !== undefined && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-[#666666] mb-1">Bank Finance</p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    isBankFinanceAvailable
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {isBankFinanceAvailable ? "Available" : "Not Available"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}