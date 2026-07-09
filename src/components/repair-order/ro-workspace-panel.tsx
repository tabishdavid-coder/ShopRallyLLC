import type { ReactNode } from "react";



import { RoTabs, type RoTabBadges } from "@/components/repair-order/ro-tabs";



/** ShopRally RO workspace — compact header, context deck, tabs + lifecycle; only body scrolls. */

export function RoWorkspacePanel({

  header,

  contextDeck,

  lifecycle,

  basePath,

  showMembershipTab,

  badges,

  allowedSegments,

  fillContent = false,

  children,

}: {

  header: ReactNode;

  contextDeck?: ReactNode;

  lifecycle?: ReactNode;

  basePath: string;

  showMembershipTab?: boolean;

  badges?: RoTabBadges;

  allowedSegments?: readonly string[];

  /** Estimate builder — no phase stepper, no card chrome; body fills viewport. */

  fillContent?: boolean;

  children: ReactNode;

}) {

  const showPhaseNav = !fillContent;

  const showHero = Boolean(header);



  return (

    <div

      className={

        fillContent

          ? "flex h-full min-h-0 flex-col overflow-hidden bg-background"

          : "ro-workspace-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"

      }

    >

      {showHero ? (

        <div

          className={

            fillContent

              ? "ro-workspace-hero shrink-0 border-b border-border bg-white px-3 py-2 md:px-4"

              : "ro-workspace-hero shrink-0 border-b border-border px-3 py-2 md:px-4"

          }

        >

          {header}

        </div>

      ) : null}

      {contextDeck}

      {showPhaseNav ? (

        <div className="ro-workspace-nav shrink-0 border-b border-border bg-card px-3 py-1.5 md:px-4">

          <RoTabs

            basePath={basePath}

            showMembershipTab={showMembershipTab}

            badges={badges}

            allowedSegments={allowedSegments}

            embedded

            trailing={lifecycle}

          />

        </div>

      ) : null}

      <div

        className={

          fillContent

            ? "flex min-h-0 flex-1 flex-col overflow-hidden"

            : "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5"

        }

      >

        {children}

      </div>

    </div>

  );

}


