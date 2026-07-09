"use client";

import type { ComponentType } from "react";

import type { PlansPageTemplate } from "@/generated/prisma";
import type { ResolvedPlansTheme } from "@/lib/plans-page-theme";

import { TemplateBold } from "./template-bold";
import { TemplateClassic } from "./template-classic";
import { TemplateModern } from "./template-modern";
import { TemplatePremium } from "./template-premium";
import type { PlansTemplateProps } from "./plans-shared";

const TEMPLATE_MAP: Record<PlansPageTemplate, ComponentType<PlansTemplateProps>> = {
  CLASSIC: TemplateClassic,
  MODERN: TemplateModern,
  BOLD: TemplateBold,
  PREMIUM: TemplatePremium,
};

type Props = PlansTemplateProps & {
  theme: ResolvedPlansTheme;
};

export function PlansPageShell({ theme, ...rest }: Props) {
  const Template = TEMPLATE_MAP[theme.template] ?? TemplateClassic;
  return <Template {...rest} theme={theme} />;
}
