export type ServiceAdvisorInfo = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export function buildServiceAdvisor(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null | undefined,
): ServiceAdvisorInfo {
  if (!user) return { name: null, email: null, phone: null };
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return {
    name: name || null,
    email: user.email ?? null,
    phone: user.phone ?? null,
  };
}

export function serviceAdvisorLabel(advisor: ServiceAdvisorInfo): string {
  if (advisor.name) return advisor.name;
  if (advisor.email) return advisor.email;
  return "—";
}
