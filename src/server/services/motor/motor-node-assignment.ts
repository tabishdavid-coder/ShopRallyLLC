import "server-only";



import { findStaticMotorSubGroup } from "@/lib/labor-book-reference";

import {

  isLicensedMotorCatalog,

  isReferenceTaxonomyMode,

} from "@/lib/labor-catalog-mode";

import { prisma } from "@/db/client";

import {

  findMotorCatalogApplicationMatch,

  motorTaxonomyCategoryPath,

  type MotorCatalogAppMatch,

} from "@/server/services/motor/motor-ai-context";



export type MotorNodeAssignment = {

  baseVehicleId: number;

  motorApplicationId?: number | null;

  motorSubGroupId?: number | null;

  motorGroupId?: number | null;

  motorSystemId?: number | null;

  dataSource: string;

  categoryPath?: string;

};



export type AssignMotorNodeInput = {

  baseVehicleId: number;

  jobName: string;

  positionHint?: string;

  motorSubGroupId?: number;

};



function normalizeText(s: string): string {

  return s

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, " ")

    .trim()

    .replace(/\s+/g, " ");

}



async function assignFromApplication(app: MotorCatalogAppMatch): Promise<MotorNodeAssignment> {

  const categoryPath =

    (await motorTaxonomyCategoryPath(app.baseVehicleId, app.motorSubGroupId)) ?? undefined;

  return {

    baseVehicleId: app.baseVehicleId,

    motorApplicationId: app.motorApplicationId,

    motorSubGroupId: app.motorSubGroupId,

    motorGroupId: app.motorGroupId,

    motorSystemId: app.motorSystemId,

    dataSource: "motor_ewt",

    categoryPath,

  };

}



function assignSubGroupFromStaticTree(

  baseVehicleId: number,

  motorSubGroupId: number,

): MotorNodeAssignment | null {

  const found = findStaticMotorSubGroup(motorSubGroupId);

  if (!found) return null;

  return {

    baseVehicleId,

    motorApplicationId: null,

    motorSubGroupId: found.motorSubGroupId,

    motorGroupId: found.motorGroupId,

    motorSystemId: found.motorSystemId,

    dataSource: "ai_taxonomy_scoped",

    categoryPath: found.categoryPath,

  };

}



async function assignSubGroupOnly(

  baseVehicleId: number,

  motorSubGroupId: number,

): Promise<MotorNodeAssignment | null> {

  if (isLicensedMotorCatalog()) {

    const subgroupNode = await prisma.motorCatalogNode.findFirst({

      where: { baseVehicleId, level: "subgroup", motorSubGroupId },

      select: {

        motorSystemId: true,

        motorGroupId: true,

        motorSubGroupId: true,

      },

    });

    if (subgroupNode?.motorSubGroupId) {

      const categoryPath = await motorTaxonomyCategoryPath(baseVehicleId, motorSubGroupId);

      return {

        baseVehicleId,

        motorApplicationId: null,

        motorSubGroupId: subgroupNode.motorSubGroupId,

        motorGroupId: subgroupNode.motorGroupId ?? undefined,

        motorSystemId: subgroupNode.motorSystemId,

        dataSource: "ai_motor_scoped",

        categoryPath: categoryPath ?? undefined,

      };

    }

  }



  return assignSubGroupFromStaticTree(baseVehicleId, motorSubGroupId);

}



/** Match AI suggestion to MOTOR application or SubGroup taxonomy nodes. */

export async function assignMotorNodeFromSuggestion(

  input: AssignMotorNodeInput,

): Promise<MotorNodeAssignment | null> {

  if (isReferenceTaxonomyMode() && input.motorSubGroupId != null) {

    return assignSubGroupFromStaticTree(input.baseVehicleId, input.motorSubGroupId);

  }



  const appMatch = await findMotorCatalogApplicationMatch(input.baseVehicleId, input.jobName, {

    motorSubGroupId: input.motorSubGroupId,

    positionHint: input.positionHint,

  });



  if (appMatch && normalizeText(appMatch.literalName).includes(normalizeText(input.jobName).slice(0, 8))) {

    return assignFromApplication(appMatch);

  }



  if (appMatch && normalizeText(input.jobName).includes(normalizeText(appMatch.literalName).slice(0, 8))) {

    return assignFromApplication(appMatch);

  }



  if (appMatch) {

    const jobTokens = normalizeText(input.jobName).split(" ").filter((t) => t.length > 2);

    const appTokens = normalizeText(appMatch.literalName).split(" ").filter((t) => t.length > 2);

    const overlap = jobTokens.filter((t) => appTokens.some((a) => a.includes(t) || t.includes(a)));

    if (overlap.length >= 2) return assignFromApplication(appMatch);

  }



  if (input.motorSubGroupId != null) {

    return assignSubGroupOnly(input.baseVehicleId, input.motorSubGroupId);

  }



  const broadMatch = await findMotorCatalogApplicationMatch(input.baseVehicleId, input.jobName, {

    positionHint: input.positionHint,

  });

  if (broadMatch) return assignFromApplication(broadMatch);



  return null;

}


