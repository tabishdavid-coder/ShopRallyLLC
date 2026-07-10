import { getJobBoard } from "@/server/job-board";
import { getShopTechnicians } from "@/server/staff";
import { getDefaultAppointmentDuration } from "@/server/actions/appointments";
import { getShopId } from "@/lib/shop";
import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import {
  parseJobBoardApproval,
  parseJobBoardPayment,
  parseJobBoardSort,
  parseJobBoardView,
  parseJobBoardVisibility,
} from "@/lib/job-board-filters";
import {
  flattenJobBoard,
  jobBoardListSummary,
  sortJobBoardListRows,
} from "@/lib/job-board-list-utils";
import { buildRoLabelOptions } from "@/lib/ro-label";
import { JobBoardToolbar } from "@/components/job-board/job-board-toolbar";
import { JobBoardDnd } from "@/components/job-board/job-board-dnd";
import { JobBoardListView } from "@/components/job-board/job-board-list-view";

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    employee?: string;
    appt?: string;
    visibility?: string;
    payment?: string;
    approval?: string;
    source?: string;
    view?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const employeeId = sp.employee ?? "";
  const appointmentOption = sp.appt ?? "";
  const visibility = parseJobBoardVisibility(sp.visibility);
  const payment = parseJobBoardPayment(sp.payment);
  const approval = parseJobBoardApproval(sp.approval);
  const marketingSource = sp.source ?? "";
  const view = parseJobBoardView(sp.view);
  const sort = parseJobBoardSort(sp.sort);
  const shopId = await getShopId();

  const [board, employees, defaultAppointmentDurationMins] = await Promise.all([
    getJobBoard({
      shopId,
      q,
      employeeId: employeeId || undefined,
      appointmentOption: appointmentOption || undefined,
      visibility,
      payment: payment ?? undefined,
      approval: approval ?? undefined,
      marketingSource: marketingSource || undefined,
    }),
    getShopTechnicians(shopId),
    getDefaultAppointmentDuration(),
  ]);

  const ap3030 = isAutopilot3030Shell();
  const listRows = sortJobBoardListRows(flattenJobBoard(board), sort);
  const listSummary = jobBoardListSummary(listRows);
  const labelOptions = buildRoLabelOptions(board);

  return (
    <div className="job-board-shell flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {!ap3030 ? (
        <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Shop pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Drag repair orders across stages — quotes, bay work, and ready to close.
            </p>
          </div>
        </div>
      ) : (
        <p className="px-0.5 text-sm ap-text-muted">
          Drag repair orders across Intake, {AP_TERMS.workInProgress}, and Closed &amp; Paid.
        </p>
      )}
      <JobBoardToolbar
        query={q}
        employeeId={employeeId}
        appointmentOption={appointmentOption}
        visibility={visibility}
        payment={payment}
        approval={approval}
        marketingSource={marketingSource}
        view={view}
        sort={sort}
        employees={employees}
        labelOptions={labelOptions}
      />
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {view === "list" ? (
          <JobBoardListView
            rows={listRows}
            summary={listSummary}
            appointmentEmployees={employees}
            defaultAppointmentDurationMins={defaultAppointmentDurationMins}
          />
        ) : (
          <JobBoardDnd
            board={board}
            appointmentEmployees={employees}
            defaultAppointmentDurationMins={defaultAppointmentDurationMins}
          />
        )}
      </div>
    </div>
  );
}
