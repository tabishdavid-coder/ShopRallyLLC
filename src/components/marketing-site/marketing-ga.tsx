import Script from "next/script";

import { getMarketingGaMeasurementId } from "@/lib/marketing-analytics";

/** GA4 for getShopRally.com marketing + public legal surfaces. */
export function MarketingGa() {
  const measurementId = getMarketingGaMeasurementId();
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="marketing-ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
