"""
Billing Calculator — strict separation of concerns
==================================================
Reads shop rate from shop_config and base hours from labor_time_matrix ONLY.
Never accepts LLM output, scraped guesses, or client-supplied rates/hours.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from uuid import UUID

from src.db import fetch_one


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class BillingCalculator:
    """Unalterable labor line calculator for Tabish Friday Labor."""

    def __init__(self, default_region: str = "Albany/Capital Region") -> None:
        self.default_region = default_region

    def get_shop_rate(self, region: str | None = None) -> Decimal:
        region_name = region or self.default_region
        row = fetch_one(
            "SELECT region, shop_rate FROM shop_config WHERE region = %s",
            (region_name,),
        )
        if not row:
            raise LookupError(f"shop_config region not found: {region_name}")
        return Decimal(str(row["shop_rate"]))

    def get_base_hours(self, vehicle_id: str | UUID, operation_id: str | UUID) -> dict[str, Any]:
        row = fetch_one(
            """
            SELECT id, vehicle_id, operation_id, base_labor_hrs, status, confidence
            FROM labor_time_matrix
            WHERE vehicle_id = %s AND operation_id = %s
            """,
            (str(vehicle_id), str(operation_id)),
        )
        if not row:
            raise LookupError(
                f"labor_time_matrix miss for vehicle={vehicle_id} operation={operation_id}"
            )
        return row

    def calculate_labor_line(
        self,
        vehicle_id: str | UUID,
        operation_id: str | UUID,
        quantity: float | Decimal = 1,
        *,
        region: str | None = None,
    ) -> dict[str, Any]:
        """
        labor_total = base_labor_hrs * shop_rate * quantity  (2 decimal places).

        Inputs are database IDs only — no free-form hours/rates from callers.
        """
        qty = Decimal(str(quantity))
        if qty <= 0:
            raise ValueError("quantity must be > 0")

        rate = self.get_shop_rate(region)
        matrix = self.get_base_hours(vehicle_id, operation_id)
        hours = Decimal(str(matrix["base_labor_hrs"]))
        line_hours = hours * qty
        labor_total = _money(line_hours * rate)

        return {
            "vehicle_id": str(vehicle_id),
            "operation_id": str(operation_id),
            "quantity": float(qty),
            "base_labor_hrs": float(hours),
            "billable_hours": float(line_hours),
            "region": region or self.default_region,
            "shop_rate": float(rate),
            "labor_total": float(labor_total),
            "currency": "USD",
            "matrix_status": matrix["status"],
            "confidence": float(matrix["confidence"]),
            "source": "labor_time_matrix×shop_config",
        }


if __name__ == "__main__":
    print("BillingCalculator is import-ready. Use via labor_guide_api or pass DB UUIDs.")
