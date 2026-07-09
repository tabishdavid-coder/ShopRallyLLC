/** AUTO-GENERATED from prisma/data/motor-taxonomy-22124.json — do not edit by hand. */
/* eslint-disable @typescript-eslint/no-loss-of-precision */

export const MOTOR_REFERENCE_BASE_VEHICLE_ID = 22124 as const;

export type MotorLaborSubGroup = {
  id: string;
  label: string;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  nodeKey: string;
  keywords: string[];
};

export type MotorLaborGroup = {
  id: string;
  label: string;
  motorSystemId: number;
  motorGroupId: number;
  subgroups: MotorLaborSubGroup[];
};

export type MotorLaborSystem = {
  id: string;
  label: string;
  motorSystemId: number;
  groups: MotorLaborGroup[];
};

/** 3-level MOTOR taxonomy reference (System → Group → SubGroup). */
export const MOTOR_LABOR_SYSTEMS: MotorLaborSystem[] = [
  {
    "id": "motor-s-1",
    "label": "Body & Frame",
    "motorSystemId": 1,
    "groups": [
      {
        "id": "motor-g-7",
        "label": "Passenger Restraint System",
        "motorSystemId": 1,
        "motorGroupId": 7,
        "subgroups": [
          {
            "id": "motor-sg-2",
            "label": "Air Bag System",
            "motorSystemId": 1,
            "motorGroupId": 7,
            "motorSubGroupId": 2,
            "nodeKey": "22124|s|1|g|7|sg|2",
            "keywords": [
              "air bag system",
              "air",
              "bag",
              "system"
            ]
          },
          {
            "id": "motor-sg-142",
            "label": "Seat Belt System",
            "motorSystemId": 1,
            "motorGroupId": 7,
            "motorSubGroupId": 142,
            "nodeKey": "22124|s|1|g|7|sg|142",
            "keywords": [
              "seat belt system",
              "seat",
              "belt",
              "system"
            ]
          },
          {
            "id": "motor-sg-308",
            "label": "Seat Belt Warning System",
            "motorSystemId": 1,
            "motorGroupId": 7,
            "motorSubGroupId": 308,
            "nodeKey": "22124|s|1|g|7|sg|308",
            "keywords": [
              "seat belt warning system",
              "seat",
              "belt",
              "warning",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-13",
        "label": "Body Panels",
        "motorSystemId": 1,
        "motorGroupId": 13,
        "subgroups": [
          {
            "id": "motor-sg-20",
            "label": "Hood",
            "motorSystemId": 1,
            "motorGroupId": 13,
            "motorSubGroupId": 20,
            "nodeKey": "22124|s|1|g|13|sg|20",
            "keywords": [
              "hood",
              "hood"
            ]
          },
          {
            "id": "motor-sg-58",
            "label": "Door Systems",
            "motorSystemId": 1,
            "motorGroupId": 13,
            "motorSubGroupId": 58,
            "nodeKey": "22124|s|1|g|13|sg|58",
            "keywords": [
              "door systems",
              "door",
              "systems"
            ]
          },
          {
            "id": "motor-sg-88",
            "label": "Trunk",
            "motorSystemId": 1,
            "motorGroupId": 13,
            "motorSubGroupId": 88,
            "nodeKey": "22124|s|1|g|13|sg|88",
            "keywords": [
              "trunk",
              "trunk"
            ]
          },
          {
            "id": "motor-sg-153",
            "label": "Power Roof System",
            "motorSystemId": 1,
            "motorGroupId": 13,
            "motorSubGroupId": 153,
            "nodeKey": "22124|s|1|g|13|sg|153",
            "keywords": [
              "power roof system",
              "power",
              "roof",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-36",
        "label": "Interior Trim & Panels",
        "motorSystemId": 1,
        "motorGroupId": 36,
        "subgroups": [
          {
            "id": "motor-sg-123",
            "label": "Console",
            "motorSystemId": 1,
            "motorGroupId": 36,
            "motorSubGroupId": 123,
            "nodeKey": "22124|s|1|g|36|sg|123",
            "keywords": [
              "console",
              "console"
            ]
          },
          {
            "id": "motor-sg-171",
            "label": "Instrument Panel",
            "motorSystemId": 1,
            "motorGroupId": 36,
            "motorSubGroupId": 171,
            "nodeKey": "22124|s|1|g|36|sg|171",
            "keywords": [
              "instrument panel",
              "instrument",
              "panel"
            ]
          }
        ]
      },
      {
        "id": "motor-g-43",
        "label": "Bumper System",
        "motorSystemId": 1,
        "motorGroupId": 43,
        "subgroups": [
          {
            "id": "motor-sg-139",
            "label": "Bumper Cover",
            "motorSystemId": 1,
            "motorGroupId": 43,
            "motorSubGroupId": 139,
            "nodeKey": "22124|s|1|g|43|sg|139",
            "keywords": [
              "bumper cover",
              "bumper",
              "cover"
            ]
          }
        ]
      },
      {
        "id": "motor-g-55",
        "label": "Sensors",
        "motorSystemId": 1,
        "motorGroupId": 55,
        "subgroups": [
          {
            "id": "motor-sg-2",
            "label": "Air Bag System",
            "motorSystemId": 1,
            "motorGroupId": 55,
            "motorSubGroupId": 2,
            "nodeKey": "22124|s|1|g|55|sg|2",
            "keywords": [
              "air bag system",
              "air",
              "bag",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-56",
        "label": "Switches",
        "motorSystemId": 1,
        "motorGroupId": 56,
        "subgroups": [
          {
            "id": "motor-sg-58",
            "label": "Door Systems",
            "motorSystemId": 1,
            "motorGroupId": 56,
            "motorSubGroupId": 58,
            "nodeKey": "22124|s|1|g|56|sg|58",
            "keywords": [
              "door systems",
              "door",
              "systems"
            ]
          },
          {
            "id": "motor-sg-171",
            "label": "Instrument Panel",
            "motorSystemId": 1,
            "motorGroupId": 56,
            "motorSubGroupId": 171,
            "nodeKey": "22124|s|1|g|56|sg|171",
            "keywords": [
              "instrument panel",
              "instrument",
              "panel"
            ]
          }
        ]
      },
      {
        "id": "motor-g-58",
        "label": "Control Module",
        "motorSystemId": 1,
        "motorGroupId": 58,
        "subgroups": [
          {
            "id": "motor-sg-2",
            "label": "Air Bag System",
            "motorSystemId": 1,
            "motorGroupId": 58,
            "motorSubGroupId": 2,
            "nodeKey": "22124|s|1|g|58|sg|2",
            "keywords": [
              "air bag system",
              "air",
              "bag",
              "system"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-2",
    "label": "Brakes",
    "motorSystemId": 2,
    "groups": [
      {
        "id": "motor-g-1",
        "label": "@ALL",
        "motorSystemId": 2,
        "motorGroupId": 1,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 2,
            "motorGroupId": 1,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|2|g|1|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          }
        ]
      },
      {
        "id": "motor-g-15",
        "label": "Control System",
        "motorSystemId": 2,
        "motorGroupId": 15,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 2,
            "motorGroupId": 15,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|2|g|15|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-140",
            "label": "Anti-lock Brake System",
            "motorSystemId": 2,
            "motorGroupId": 15,
            "motorSubGroupId": 140,
            "nodeKey": "22124|s|2|g|15|sg|140",
            "keywords": [
              "anti-lock brake system",
              "anti",
              "lock",
              "brake",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-17",
        "label": "Disc Brakes",
        "motorSystemId": 2,
        "motorGroupId": 17,
        "subgroups": [
          {
            "id": "motor-sg-41",
            "label": "Brake Caliper",
            "motorSystemId": 2,
            "motorGroupId": 17,
            "motorSubGroupId": 41,
            "nodeKey": "22124|s|2|g|17|sg|41",
            "keywords": [
              "brake caliper",
              "brake",
              "caliper"
            ]
          },
          {
            "id": "motor-sg-44",
            "label": "Brake Pads",
            "motorSystemId": 2,
            "motorGroupId": 17,
            "motorSubGroupId": 44,
            "nodeKey": "22124|s|2|g|17|sg|44",
            "keywords": [
              "brake pads",
              "brake",
              "pads"
            ]
          },
          {
            "id": "motor-sg-45",
            "label": "Brake Rotor",
            "motorSystemId": 2,
            "motorGroupId": 17,
            "motorSubGroupId": 45,
            "nodeKey": "22124|s|2|g|17|sg|45",
            "keywords": [
              "brake rotor",
              "brake",
              "rotor"
            ]
          }
        ]
      },
      {
        "id": "motor-g-19",
        "label": "Drum Brakes",
        "motorSystemId": 2,
        "motorGroupId": 19,
        "subgroups": [
          {
            "id": "motor-sg-42",
            "label": "Brake Drum",
            "motorSystemId": 2,
            "motorGroupId": 19,
            "motorSubGroupId": 42,
            "nodeKey": "22124|s|2|g|19|sg|42",
            "keywords": [
              "brake drum",
              "brake",
              "drum"
            ]
          },
          {
            "id": "motor-sg-46",
            "label": "Brake Shoes",
            "motorSystemId": 2,
            "motorGroupId": 19,
            "motorSubGroupId": 46,
            "nodeKey": "22124|s|2|g|19|sg|46",
            "keywords": [
              "brake shoes",
              "brake",
              "shoes"
            ]
          },
          {
            "id": "motor-sg-93",
            "label": "Wheel Cylinder",
            "motorSystemId": 2,
            "motorGroupId": 19,
            "motorSubGroupId": 93,
            "nodeKey": "22124|s|2|g|19|sg|93",
            "keywords": [
              "wheel cylinder",
              "wheel",
              "cylinder"
            ]
          }
        ]
      },
      {
        "id": "motor-g-24",
        "label": "Hydraulic System",
        "motorSystemId": 2,
        "motorGroupId": 24,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 2,
            "motorGroupId": 24,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|2|g|24|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-22",
            "label": "Master Cylinder",
            "motorSystemId": 2,
            "motorGroupId": 24,
            "motorSubGroupId": 22,
            "nodeKey": "22124|s|2|g|24|sg|22",
            "keywords": [
              "master cylinder",
              "master",
              "cylinder"
            ]
          },
          {
            "id": "motor-sg-135",
            "label": "Brake Line",
            "motorSystemId": 2,
            "motorGroupId": 24,
            "motorSubGroupId": 135,
            "nodeKey": "22124|s|2|g|24|sg|135",
            "keywords": [
              "brake line",
              "brake",
              "line"
            ]
          }
        ]
      },
      {
        "id": "motor-g-27",
        "label": "Parking Brake",
        "motorSystemId": 2,
        "motorGroupId": 27,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 2,
            "motorGroupId": 27,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|2|g|27|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-71",
            "label": "Parking Brake Cable",
            "motorSystemId": 2,
            "motorGroupId": 27,
            "motorSubGroupId": 71,
            "nodeKey": "22124|s|2|g|27|sg|71",
            "keywords": [
              "parking brake cable",
              "parking",
              "brake",
              "cable"
            ]
          }
        ]
      },
      {
        "id": "motor-g-34",
        "label": "Power Assist",
        "motorSystemId": 2,
        "motorGroupId": 34,
        "subgroups": [
          {
            "id": "motor-sg-344",
            "label": "Brake Booster",
            "motorSystemId": 2,
            "motorGroupId": 34,
            "motorSubGroupId": 344,
            "nodeKey": "22124|s|2|g|34|sg|344",
            "keywords": [
              "brake booster",
              "brake",
              "booster"
            ]
          }
        ]
      },
      {
        "id": "motor-g-55",
        "label": "Sensors",
        "motorSystemId": 2,
        "motorGroupId": 55,
        "subgroups": [
          {
            "id": "motor-sg-140",
            "label": "Anti-lock Brake System",
            "motorSystemId": 2,
            "motorGroupId": 55,
            "motorSubGroupId": 140,
            "nodeKey": "22124|s|2|g|55|sg|140",
            "keywords": [
              "anti-lock brake system",
              "anti",
              "lock",
              "brake",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-56",
        "label": "Switches",
        "motorSystemId": 2,
        "motorGroupId": 56,
        "subgroups": [
          {
            "id": "motor-sg-22",
            "label": "Master Cylinder",
            "motorSystemId": 2,
            "motorGroupId": 56,
            "motorSubGroupId": 22,
            "nodeKey": "22124|s|2|g|56|sg|22",
            "keywords": [
              "master cylinder",
              "master",
              "cylinder"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-3",
    "label": "Electrical",
    "motorSystemId": 3,
    "groups": [
      {
        "id": "motor-g-1",
        "label": "@ALL",
        "motorSystemId": 3,
        "motorGroupId": 1,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 3,
            "motorGroupId": 1,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|3|g|1|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          }
        ]
      },
      {
        "id": "motor-g-4",
        "label": "Entertainment System",
        "motorSystemId": 3,
        "motorGroupId": 4,
        "subgroups": [
          {
            "id": "motor-sg-127",
            "label": "Antenna",
            "motorSystemId": 3,
            "motorGroupId": 4,
            "motorSubGroupId": 127,
            "nodeKey": "22124|s|3|g|4|sg|127",
            "keywords": [
              "antenna",
              "antenna"
            ]
          }
        ]
      },
      {
        "id": "motor-g-6",
        "label": "Exterior Lighting",
        "motorSystemId": 3,
        "motorGroupId": 6,
        "subgroups": [
          {
            "id": "motor-sg-17",
            "label": "Headlamp",
            "motorSystemId": 3,
            "motorGroupId": 6,
            "motorSubGroupId": 17,
            "nodeKey": "22124|s|3|g|6|sg|17",
            "keywords": [
              "headlamp",
              "headlamp"
            ]
          },
          {
            "id": "motor-sg-47",
            "label": "Bulbs",
            "motorSystemId": 3,
            "motorGroupId": 6,
            "motorSubGroupId": 47,
            "nodeKey": "22124|s|3|g|6|sg|47",
            "keywords": [
              "bulbs",
              "bulbs"
            ]
          }
        ]
      },
      {
        "id": "motor-g-11",
        "label": "Wiper & Washer System",
        "motorSystemId": 3,
        "motorGroupId": 11,
        "subgroups": [
          {
            "id": "motor-sg-31",
            "label": "Washer Reservoir",
            "motorSystemId": 3,
            "motorGroupId": 11,
            "motorSubGroupId": 31,
            "nodeKey": "22124|s|3|g|11|sg|31",
            "keywords": [
              "washer reservoir",
              "washer",
              "reservoir"
            ]
          },
          {
            "id": "motor-sg-91",
            "label": "Washer Fluid Pump",
            "motorSystemId": 3,
            "motorGroupId": 11,
            "motorSubGroupId": 91,
            "nodeKey": "22124|s|3|g|11|sg|91",
            "keywords": [
              "washer fluid pump",
              "washer",
              "fluid",
              "pump"
            ]
          },
          {
            "id": "motor-sg-124",
            "label": "Wiper Linkage",
            "motorSystemId": 3,
            "motorGroupId": 11,
            "motorSubGroupId": 124,
            "nodeKey": "22124|s|3|g|11|sg|124",
            "keywords": [
              "wiper linkage",
              "wiper",
              "linkage"
            ]
          },
          {
            "id": "motor-sg-126",
            "label": "Wiper Motor",
            "motorSystemId": 3,
            "motorGroupId": 11,
            "motorSubGroupId": 126,
            "nodeKey": "22124|s|3|g|11|sg|126",
            "keywords": [
              "wiper motor",
              "wiper",
              "motor"
            ]
          },
          {
            "id": "motor-sg-203",
            "label": "Windshield",
            "motorSystemId": 3,
            "motorGroupId": 11,
            "motorSubGroupId": 203,
            "nodeKey": "22124|s|3|g|11|sg|203",
            "keywords": [
              "windshield",
              "windshield"
            ]
          }
        ]
      },
      {
        "id": "motor-g-15",
        "label": "Control System",
        "motorSystemId": 3,
        "motorGroupId": 15,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 3,
            "motorGroupId": 15,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|3|g|15|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          }
        ]
      },
      {
        "id": "motor-g-20",
        "label": "Engine",
        "motorSystemId": 3,
        "motorGroupId": 20,
        "subgroups": [
          {
            "id": "motor-sg-36",
            "label": "Alternator",
            "motorSystemId": 3,
            "motorGroupId": 20,
            "motorSubGroupId": 36,
            "nodeKey": "22124|s|3|g|20|sg|36",
            "keywords": [
              "alternator",
              "alternator"
            ]
          },
          {
            "id": "motor-sg-78",
            "label": "Starting System",
            "motorSystemId": 3,
            "motorGroupId": 20,
            "motorSubGroupId": 78,
            "nodeKey": "22124|s|3|g|20|sg|78",
            "keywords": [
              "starting system",
              "starting",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-29",
        "label": "Power Distribution",
        "motorSystemId": 3,
        "motorGroupId": 29,
        "subgroups": [
          {
            "id": "motor-sg-3",
            "label": "Battery & Cables",
            "motorSystemId": 3,
            "motorGroupId": 29,
            "motorSubGroupId": 3,
            "nodeKey": "22124|s|3|g|29|sg|3",
            "keywords": [
              "battery & cables",
              "battery",
              "cables"
            ]
          }
        ]
      },
      {
        "id": "motor-g-30",
        "label": "Steering Column",
        "motorSystemId": 3,
        "motorGroupId": 30,
        "subgroups": [
          {
            "id": "motor-sg-272",
            "label": "Horn Components",
            "motorSystemId": 3,
            "motorGroupId": 30,
            "motorSubGroupId": 272,
            "nodeKey": "22124|s|3|g|30|sg|272",
            "keywords": [
              "horn components",
              "horn",
              "components"
            ]
          }
        ]
      },
      {
        "id": "motor-g-32",
        "label": "Warning Systems",
        "motorSystemId": 3,
        "motorGroupId": 32,
        "subgroups": [
          {
            "id": "motor-sg-86",
            "label": "Tire Pressure Monitor",
            "motorSystemId": 3,
            "motorGroupId": 32,
            "motorSubGroupId": 86,
            "nodeKey": "22124|s|3|g|32|sg|86",
            "keywords": [
              "tire pressure monitor",
              "tire",
              "pressure",
              "monitor"
            ]
          }
        ]
      },
      {
        "id": "motor-g-38",
        "label": "Latches & Locks",
        "motorSystemId": 3,
        "motorGroupId": 38,
        "subgroups": [
          {
            "id": "motor-sg-129",
            "label": "Lock Cylinder",
            "motorSystemId": 3,
            "motorGroupId": 38,
            "motorSubGroupId": 129,
            "nodeKey": "22124|s|3|g|38|sg|129",
            "keywords": [
              "lock cylinder",
              "lock",
              "cylinder"
            ]
          }
        ]
      },
      {
        "id": "motor-g-52",
        "label": "Driver Information System",
        "motorSystemId": 3,
        "motorGroupId": 52,
        "subgroups": [
          {
            "id": "motor-sg-170",
            "label": "Instrument Cluster",
            "motorSystemId": 3,
            "motorGroupId": 52,
            "motorSubGroupId": 170,
            "nodeKey": "22124|s|3|g|52|sg|170",
            "keywords": [
              "instrument cluster",
              "instrument",
              "cluster"
            ]
          }
        ]
      },
      {
        "id": "motor-g-53",
        "label": "Interior Lighting",
        "motorSystemId": 3,
        "motorGroupId": 53,
        "subgroups": [
          {
            "id": "motor-sg-47",
            "label": "Bulbs",
            "motorSystemId": 3,
            "motorGroupId": 53,
            "motorSubGroupId": 47,
            "nodeKey": "22124|s|3|g|53|sg|47",
            "keywords": [
              "bulbs",
              "bulbs"
            ]
          }
        ]
      },
      {
        "id": "motor-g-56",
        "label": "Switches",
        "motorSystemId": 3,
        "motorGroupId": 56,
        "subgroups": [
          {
            "id": "motor-sg-102",
            "label": "Seats",
            "motorSystemId": 3,
            "motorGroupId": 56,
            "motorSubGroupId": 102,
            "nodeKey": "22124|s|3|g|56|sg|102",
            "keywords": [
              "seats",
              "seats"
            ]
          },
          {
            "id": "motor-sg-178",
            "label": "Cruise Control System",
            "motorSystemId": 3,
            "motorGroupId": 56,
            "motorSubGroupId": 178,
            "nodeKey": "22124|s|3|g|56|sg|178",
            "keywords": [
              "cruise control system",
              "cruise",
              "control",
              "system"
            ]
          },
          {
            "id": "motor-sg-182",
            "label": "Exterior Lighting",
            "motorSystemId": 3,
            "motorGroupId": 56,
            "motorSubGroupId": 182,
            "nodeKey": "22124|s|3|g|56|sg|182",
            "keywords": [
              "exterior lighting",
              "exterior",
              "lighting"
            ]
          },
          {
            "id": "motor-sg-184",
            "label": "Wiper & Washer System",
            "motorSystemId": 3,
            "motorGroupId": 56,
            "motorSubGroupId": 184,
            "nodeKey": "22124|s|3|g|56|sg|184",
            "keywords": [
              "wiper & washer system",
              "wiper",
              "washer",
              "system"
            ]
          },
          {
            "id": "motor-sg-187",
            "label": "Power Distribution",
            "motorSystemId": 3,
            "motorGroupId": 56,
            "motorSubGroupId": 187,
            "nodeKey": "22124|s|3|g|56|sg|187",
            "keywords": [
              "power distribution",
              "power",
              "distribution"
            ]
          },
          {
            "id": "motor-sg-188",
            "label": "Steering Column",
            "motorSystemId": 3,
            "motorGroupId": 56,
            "motorSubGroupId": 188,
            "nodeKey": "22124|s|3|g|56|sg|188",
            "keywords": [
              "steering column",
              "steering",
              "column"
            ]
          }
        ]
      },
      {
        "id": "motor-g-58",
        "label": "Control Module",
        "motorSystemId": 3,
        "motorGroupId": 58,
        "subgroups": [
          {
            "id": "motor-sg-172",
            "label": "Body Control System",
            "motorSystemId": 3,
            "motorGroupId": 58,
            "motorSubGroupId": 172,
            "nodeKey": "22124|s|3|g|58|sg|172",
            "keywords": [
              "body control system",
              "body",
              "control",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-70",
        "label": "Relays",
        "motorSystemId": 3,
        "motorGroupId": 70,
        "subgroups": [
          {
            "id": "motor-sg-78",
            "label": "Starting System",
            "motorSystemId": 3,
            "motorGroupId": 70,
            "motorSubGroupId": 78,
            "nodeKey": "22124|s|3|g|70|sg|78",
            "keywords": [
              "starting system",
              "starting",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-89",
        "label": "Body Control System",
        "motorSystemId": 3,
        "motorGroupId": 89,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 3,
            "motorGroupId": 89,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|3|g|89|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-4",
    "label": "HVAC",
    "motorSystemId": 4,
    "groups": [
      {
        "id": "motor-g-2",
        "label": "Air Conditioning System",
        "motorSystemId": 4,
        "motorGroupId": 2,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|4|g|2|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-23",
            "label": "Relays",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 23,
            "nodeKey": "22124|s|4|g|2|sg|23",
            "keywords": [
              "relays",
              "relays"
            ]
          },
          {
            "id": "motor-sg-51",
            "label": "Compressor",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 51,
            "nodeKey": "22124|s|4|g|2|sg|51",
            "keywords": [
              "compressor",
              "compressor"
            ]
          },
          {
            "id": "motor-sg-52",
            "label": "Condenser Core",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 52,
            "nodeKey": "22124|s|4|g|2|sg|52",
            "keywords": [
              "condenser core",
              "condenser",
              "core"
            ]
          },
          {
            "id": "motor-sg-53",
            "label": "Condenser Fan Motor",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 53,
            "nodeKey": "22124|s|4|g|2|sg|53",
            "keywords": [
              "condenser fan motor",
              "condenser",
              "fan",
              "motor"
            ]
          },
          {
            "id": "motor-sg-61",
            "label": "HVAC Case",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 61,
            "nodeKey": "22124|s|4|g|2|sg|61",
            "keywords": [
              "hvac case",
              "hvac",
              "case"
            ]
          },
          {
            "id": "motor-sg-75",
            "label": "Receiver Drier",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 75,
            "nodeKey": "22124|s|4|g|2|sg|75",
            "keywords": [
              "receiver drier",
              "receiver",
              "drier"
            ]
          },
          {
            "id": "motor-sg-76",
            "label": "Refrigerant Line",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 76,
            "nodeKey": "22124|s|4|g|2|sg|76",
            "keywords": [
              "refrigerant line",
              "refrigerant",
              "line"
            ]
          },
          {
            "id": "motor-sg-89",
            "label": "Valves & Actuators",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 89,
            "nodeKey": "22124|s|4|g|2|sg|89",
            "keywords": [
              "valves & actuators",
              "valves",
              "actuators"
            ]
          },
          {
            "id": "motor-sg-185",
            "label": "Air Conditioning System",
            "motorSystemId": 4,
            "motorGroupId": 2,
            "motorSubGroupId": 185,
            "nodeKey": "22124|s|4|g|2|sg|185",
            "keywords": [
              "air conditioning system",
              "air",
              "conditioning",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-12",
        "label": "Air Distribution",
        "motorSystemId": 4,
        "motorGroupId": 12,
        "subgroups": [
          {
            "id": "motor-sg-34",
            "label": "Air Filter",
            "motorSystemId": 4,
            "motorGroupId": 12,
            "motorSubGroupId": 34,
            "nodeKey": "22124|s|4|g|12|sg|34",
            "keywords": [
              "air filter",
              "air",
              "filter"
            ]
          },
          {
            "id": "motor-sg-39",
            "label": "Blower Motor",
            "motorSystemId": 4,
            "motorGroupId": 12,
            "motorSubGroupId": 39,
            "nodeKey": "22124|s|4|g|12|sg|39",
            "keywords": [
              "blower motor",
              "blower",
              "motor"
            ]
          },
          {
            "id": "motor-sg-61",
            "label": "HVAC Case",
            "motorSystemId": 4,
            "motorGroupId": 12,
            "motorSubGroupId": 61,
            "nodeKey": "22124|s|4|g|12|sg|61",
            "keywords": [
              "hvac case",
              "hvac",
              "case"
            ]
          },
          {
            "id": "motor-sg-99",
            "label": "Control System",
            "motorSystemId": 4,
            "motorGroupId": 12,
            "motorSubGroupId": 99,
            "nodeKey": "22124|s|4|g|12|sg|99",
            "keywords": [
              "control system",
              "control",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-15",
        "label": "Control System",
        "motorSystemId": 4,
        "motorGroupId": 15,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 4,
            "motorGroupId": 15,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|4|g|15|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-89",
            "label": "Valves & Actuators",
            "motorSystemId": 4,
            "motorGroupId": 15,
            "motorSubGroupId": 89,
            "nodeKey": "22124|s|4|g|15|sg|89",
            "keywords": [
              "valves & actuators",
              "valves",
              "actuators"
            ]
          }
        ]
      },
      {
        "id": "motor-g-21",
        "label": "Heating",
        "motorSystemId": 4,
        "motorGroupId": 21,
        "subgroups": [
          {
            "id": "motor-sg-18",
            "label": "Heater Core",
            "motorSystemId": 4,
            "motorGroupId": 21,
            "motorSubGroupId": 18,
            "nodeKey": "22124|s|4|g|21|sg|18",
            "keywords": [
              "heater core",
              "heater",
              "core"
            ]
          },
          {
            "id": "motor-sg-19",
            "label": "Heater Hose",
            "motorSystemId": 4,
            "motorGroupId": 21,
            "motorSubGroupId": 19,
            "nodeKey": "22124|s|4|g|21|sg|19",
            "keywords": [
              "heater hose",
              "heater",
              "hose"
            ]
          }
        ]
      },
      {
        "id": "motor-g-55",
        "label": "Sensors",
        "motorSystemId": 4,
        "motorGroupId": 55,
        "subgroups": [
          {
            "id": "motor-sg-99",
            "label": "Control System",
            "motorSystemId": 4,
            "motorGroupId": 55,
            "motorSubGroupId": 99,
            "nodeKey": "22124|s|4|g|55|sg|99",
            "keywords": [
              "control system",
              "control",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-56",
        "label": "Switches",
        "motorSystemId": 4,
        "motorGroupId": 56,
        "subgroups": [
          {
            "id": "motor-sg-185",
            "label": "Air Conditioning System",
            "motorSystemId": 4,
            "motorGroupId": 56,
            "motorSubGroupId": 185,
            "nodeKey": "22124|s|4|g|56|sg|185",
            "keywords": [
              "air conditioning system",
              "air",
              "conditioning",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-58",
        "label": "Control Module",
        "motorSystemId": 4,
        "motorGroupId": 58,
        "subgroups": [
          {
            "id": "motor-sg-39",
            "label": "Blower Motor",
            "motorSystemId": 4,
            "motorGroupId": 58,
            "motorSubGroupId": 39,
            "nodeKey": "22124|s|4|g|58|sg|39",
            "keywords": [
              "blower motor",
              "blower",
              "motor"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-7",
    "label": "Powertrain",
    "motorSystemId": 7,
    "groups": [
      {
        "id": "motor-g-15",
        "label": "Control System",
        "motorSystemId": 7,
        "motorGroupId": 15,
        "subgroups": [
          {
            "id": "motor-sg-55",
            "label": "Control Module",
            "motorSystemId": 7,
            "motorGroupId": 15,
            "motorSubGroupId": 55,
            "nodeKey": "22124|s|7|g|15|sg|55",
            "keywords": [
              "control module",
              "control",
              "module"
            ]
          },
          {
            "id": "motor-sg-60",
            "label": "Emission Control",
            "motorSystemId": 7,
            "motorGroupId": 15,
            "motorSubGroupId": 60,
            "nodeKey": "22124|s|7|g|15|sg|60",
            "keywords": [
              "emission control",
              "emission",
              "control"
            ]
          }
        ]
      },
      {
        "id": "motor-g-18",
        "label": "Driveline",
        "motorSystemId": 7,
        "motorGroupId": 18,
        "subgroups": [
          {
            "id": "motor-sg-37",
            "label": "Axle",
            "motorSystemId": 7,
            "motorGroupId": 18,
            "motorSubGroupId": 37,
            "nodeKey": "22124|s|7|g|18|sg|37",
            "keywords": [
              "axle",
              "axle"
            ]
          }
        ]
      },
      {
        "id": "motor-g-20",
        "label": "Engine",
        "motorSystemId": 7,
        "motorGroupId": 20,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|7|g|20|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-7",
            "label": "Crankshaft",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 7,
            "nodeKey": "22124|s|7|g|20|sg|7",
            "keywords": [
              "crankshaft",
              "crankshaft"
            ]
          },
          {
            "id": "motor-sg-12",
            "label": "Engine Assembly",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 12,
            "nodeKey": "22124|s|7|g|20|sg|12",
            "keywords": [
              "engine assembly",
              "engine",
              "assembly"
            ]
          },
          {
            "id": "motor-sg-15",
            "label": "Fuel Injection",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 15,
            "nodeKey": "22124|s|7|g|20|sg|15",
            "keywords": [
              "fuel injection",
              "fuel",
              "injection"
            ]
          },
          {
            "id": "motor-sg-21",
            "label": "Lubrication System",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 21,
            "nodeKey": "22124|s|7|g|20|sg|21",
            "keywords": [
              "lubrication system",
              "lubrication",
              "system"
            ]
          },
          {
            "id": "motor-sg-33",
            "label": "Accessory Drive Belt",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 33,
            "nodeKey": "22124|s|7|g|20|sg|33",
            "keywords": [
              "accessory drive belt",
              "accessory",
              "drive",
              "belt"
            ]
          },
          {
            "id": "motor-sg-35",
            "label": "Air Intake System",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 35,
            "nodeKey": "22124|s|7|g|20|sg|35",
            "keywords": [
              "air intake system",
              "air",
              "intake",
              "system"
            ]
          },
          {
            "id": "motor-sg-56",
            "label": "Cooling System",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 56,
            "nodeKey": "22124|s|7|g|20|sg|56",
            "keywords": [
              "cooling system",
              "cooling",
              "system"
            ]
          },
          {
            "id": "motor-sg-60",
            "label": "Emission Control",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 60,
            "nodeKey": "22124|s|7|g|20|sg|60",
            "keywords": [
              "emission control",
              "emission",
              "control"
            ]
          },
          {
            "id": "motor-sg-62",
            "label": "Exhaust System",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 62,
            "nodeKey": "22124|s|7|g|20|sg|62",
            "keywords": [
              "exhaust system",
              "exhaust",
              "system"
            ]
          },
          {
            "id": "motor-sg-64",
            "label": "Fuel Supply System",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 64,
            "nodeKey": "22124|s|7|g|20|sg|64",
            "keywords": [
              "fuel supply system",
              "fuel",
              "supply",
              "system"
            ]
          },
          {
            "id": "motor-sg-67",
            "label": "Ignition System",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 67,
            "nodeKey": "22124|s|7|g|20|sg|67",
            "keywords": [
              "ignition system",
              "ignition",
              "system"
            ]
          },
          {
            "id": "motor-sg-70",
            "label": "Mounts",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 70,
            "nodeKey": "22124|s|7|g|20|sg|70",
            "keywords": [
              "mounts",
              "mounts"
            ]
          },
          {
            "id": "motor-sg-84",
            "label": "Timing Belt",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 84,
            "nodeKey": "22124|s|7|g|20|sg|84",
            "keywords": [
              "timing belt",
              "timing",
              "belt"
            ]
          },
          {
            "id": "motor-sg-85",
            "label": "Timing Chain",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 85,
            "nodeKey": "22124|s|7|g|20|sg|85",
            "keywords": [
              "timing chain",
              "timing",
              "chain"
            ]
          },
          {
            "id": "motor-sg-90",
            "label": "Valvetrain",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 90,
            "nodeKey": "22124|s|7|g|20|sg|90",
            "keywords": [
              "valvetrain",
              "valvetrain"
            ]
          },
          {
            "id": "motor-sg-107",
            "label": "Connecting Rod",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 107,
            "nodeKey": "22124|s|7|g|20|sg|107",
            "keywords": [
              "connecting rod",
              "connecting",
              "rod"
            ]
          },
          {
            "id": "motor-sg-108",
            "label": "Engine Cylinder",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 108,
            "nodeKey": "22124|s|7|g|20|sg|108",
            "keywords": [
              "engine cylinder",
              "engine",
              "cylinder"
            ]
          },
          {
            "id": "motor-sg-111",
            "label": "Flexplate",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 111,
            "nodeKey": "22124|s|7|g|20|sg|111",
            "keywords": [
              "flexplate",
              "flexplate"
            ]
          },
          {
            "id": "motor-sg-138",
            "label": "Cylinder Block",
            "motorSystemId": 7,
            "motorGroupId": 20,
            "motorSubGroupId": 138,
            "nodeKey": "22124|s|7|g|20|sg|138",
            "keywords": [
              "cylinder block",
              "cylinder",
              "block"
            ]
          }
        ]
      },
      {
        "id": "motor-g-31",
        "label": "Trans",
        "motorSystemId": 7,
        "motorGroupId": 31,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 7,
            "motorGroupId": 31,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|7|g|31|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-21",
            "label": "Lubrication System",
            "motorSystemId": 7,
            "motorGroupId": 31,
            "motorSubGroupId": 21,
            "nodeKey": "22124|s|7|g|31|sg|21",
            "keywords": [
              "lubrication system",
              "lubrication",
              "system"
            ]
          },
          {
            "id": "motor-sg-87",
            "label": "Trans Mount",
            "motorSystemId": 7,
            "motorGroupId": 31,
            "motorSubGroupId": 87,
            "nodeKey": "22124|s|7|g|31|sg|87",
            "keywords": [
              "trans mount",
              "trans",
              "mount"
            ]
          },
          {
            "id": "motor-sg-95",
            "label": "Trans Assembly",
            "motorSystemId": 7,
            "motorGroupId": 31,
            "motorSubGroupId": 95,
            "nodeKey": "22124|s|7|g|31|sg|95",
            "keywords": [
              "trans assembly",
              "trans",
              "assembly"
            ]
          }
        ]
      },
      {
        "id": "motor-g-41",
        "label": "Automatic Trans",
        "motorSystemId": 7,
        "motorGroupId": 41,
        "subgroups": [
          {
            "id": "motor-sg-4",
            "label": "Case & Components",
            "motorSystemId": 7,
            "motorGroupId": 41,
            "motorSubGroupId": 4,
            "nodeKey": "22124|s|7|g|41|sg|4",
            "keywords": [
              "case & components",
              "case",
              "components"
            ]
          },
          {
            "id": "motor-sg-118",
            "label": "Torque Converter",
            "motorSystemId": 7,
            "motorGroupId": 41,
            "motorSubGroupId": 118,
            "nodeKey": "22124|s|7|g|41|sg|118",
            "keywords": [
              "torque converter",
              "torque",
              "converter"
            ]
          },
          {
            "id": "motor-sg-143",
            "label": "Shift Lever",
            "motorSystemId": 7,
            "motorGroupId": 41,
            "motorSubGroupId": 143,
            "nodeKey": "22124|s|7|g|41|sg|143",
            "keywords": [
              "shift lever",
              "shift",
              "lever"
            ]
          }
        ]
      },
      {
        "id": "motor-g-42",
        "label": "Manual Trans",
        "motorSystemId": 7,
        "motorGroupId": 42,
        "subgroups": [
          {
            "id": "motor-sg-49",
            "label": "Clutch Assembly",
            "motorSystemId": 7,
            "motorGroupId": 42,
            "motorSubGroupId": 49,
            "nodeKey": "22124|s|7|g|42|sg|49",
            "keywords": [
              "clutch assembly",
              "clutch",
              "assembly"
            ]
          },
          {
            "id": "motor-sg-65",
            "label": "Hydraulic Clutch System",
            "motorSystemId": 7,
            "motorGroupId": 42,
            "motorSubGroupId": 65,
            "nodeKey": "22124|s|7|g|42|sg|65",
            "keywords": [
              "hydraulic clutch system",
              "hydraulic",
              "clutch",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-55",
        "label": "Sensors",
        "motorSystemId": 7,
        "motorGroupId": 55,
        "subgroups": [
          {
            "id": "motor-sg-179",
            "label": "Automatic Trans",
            "motorSystemId": 7,
            "motorGroupId": 55,
            "motorSubGroupId": 179,
            "nodeKey": "22124|s|7|g|55|sg|179",
            "keywords": [
              "automatic trans",
              "automatic",
              "trans"
            ]
          },
          {
            "id": "motor-sg-180",
            "label": "Engine",
            "motorSystemId": 7,
            "motorGroupId": 55,
            "motorSubGroupId": 180,
            "nodeKey": "22124|s|7|g|55|sg|180",
            "keywords": [
              "engine",
              "engine"
            ]
          },
          {
            "id": "motor-sg-181",
            "label": "Trans",
            "motorSystemId": 7,
            "motorGroupId": 55,
            "motorSubGroupId": 181,
            "nodeKey": "22124|s|7|g|55|sg|181",
            "keywords": [
              "trans",
              "trans"
            ]
          }
        ]
      },
      {
        "id": "motor-g-56",
        "label": "Switches",
        "motorSystemId": 7,
        "motorGroupId": 56,
        "subgroups": [
          {
            "id": "motor-sg-180",
            "label": "Engine",
            "motorSystemId": 7,
            "motorGroupId": 56,
            "motorSubGroupId": 180,
            "nodeKey": "22124|s|7|g|56|sg|180",
            "keywords": [
              "engine",
              "engine"
            ]
          }
        ]
      },
      {
        "id": "motor-g-58",
        "label": "Control Module",
        "motorSystemId": 7,
        "motorGroupId": 58,
        "subgroups": [
          {
            "id": "motor-sg-99",
            "label": "Control System",
            "motorSystemId": 7,
            "motorGroupId": 58,
            "motorSubGroupId": 99,
            "nodeKey": "22124|s|7|g|58|sg|99",
            "keywords": [
              "control system",
              "control",
              "system"
            ]
          },
          {
            "id": "motor-sg-181",
            "label": "Trans",
            "motorSystemId": 7,
            "motorGroupId": 58,
            "motorSubGroupId": 181,
            "nodeKey": "22124|s|7|g|58|sg|181",
            "keywords": [
              "trans",
              "trans"
            ]
          },
          {
            "id": "motor-sg-199",
            "label": "Engine Control System",
            "motorSystemId": 7,
            "motorGroupId": 58,
            "motorSubGroupId": 199,
            "nodeKey": "22124|s|7|g|58|sg|199",
            "keywords": [
              "engine control system",
              "engine",
              "control",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-66",
        "label": "Hybrid Powertrain System",
        "motorSystemId": 7,
        "motorGroupId": 66,
        "subgroups": [
          {
            "id": "motor-sg-300",
            "label": "High Voltage System",
            "motorSystemId": 7,
            "motorGroupId": 66,
            "motorSubGroupId": 300,
            "nodeKey": "22124|s|7|g|66|sg|300",
            "keywords": [
              "high voltage system",
              "high",
              "voltage",
              "system"
            ]
          }
        ]
      },
      {
        "id": "motor-g-70",
        "label": "Relays",
        "motorSystemId": 7,
        "motorGroupId": 70,
        "subgroups": [
          {
            "id": "motor-sg-56",
            "label": "Cooling System",
            "motorSystemId": 7,
            "motorGroupId": 70,
            "motorSubGroupId": 56,
            "nodeKey": "22124|s|7|g|70|sg|56",
            "keywords": [
              "cooling system",
              "cooling",
              "system"
            ]
          },
          {
            "id": "motor-sg-64",
            "label": "Fuel Supply System",
            "motorSystemId": 7,
            "motorGroupId": 70,
            "motorSubGroupId": 64,
            "nodeKey": "22124|s|7|g|70|sg|64",
            "keywords": [
              "fuel supply system",
              "fuel",
              "supply",
              "system"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-5",
    "label": "Steering",
    "motorSystemId": 5,
    "groups": [
      {
        "id": "motor-g-16",
        "label": "Directional Control",
        "motorSystemId": 5,
        "motorGroupId": 16,
        "subgroups": [
          {
            "id": "motor-sg-79",
            "label": "Steering Gear Assembly",
            "motorSystemId": 5,
            "motorGroupId": 16,
            "motorSubGroupId": 79,
            "nodeKey": "22124|s|5|g|16|sg|79",
            "keywords": [
              "steering gear assembly",
              "steering",
              "gear",
              "assembly"
            ]
          },
          {
            "id": "motor-sg-83",
            "label": "Tie Rod",
            "motorSystemId": 5,
            "motorGroupId": 16,
            "motorSubGroupId": 83,
            "nodeKey": "22124|s|5|g|16|sg|83",
            "keywords": [
              "tie rod",
              "tie",
              "rod"
            ]
          }
        ]
      },
      {
        "id": "motor-g-24",
        "label": "Hydraulic System",
        "motorSystemId": 5,
        "motorGroupId": 24,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 5,
            "motorGroupId": 24,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|5|g|24|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          },
          {
            "id": "motor-sg-72",
            "label": "Power Steering Line",
            "motorSystemId": 5,
            "motorGroupId": 24,
            "motorSubGroupId": 72,
            "nodeKey": "22124|s|5|g|24|sg|72",
            "keywords": [
              "power steering line",
              "power",
              "steering",
              "line"
            ]
          },
          {
            "id": "motor-sg-73",
            "label": "Power Steering Pump",
            "motorSystemId": 5,
            "motorGroupId": 24,
            "motorSubGroupId": 73,
            "nodeKey": "22124|s|5|g|24|sg|73",
            "keywords": [
              "power steering pump",
              "power",
              "steering",
              "pump"
            ]
          }
        ]
      },
      {
        "id": "motor-g-28",
        "label": "Pivot Points",
        "motorSystemId": 5,
        "motorGroupId": 28,
        "subgroups": [
          {
            "id": "motor-sg-80",
            "label": "Steering Knuckle",
            "motorSystemId": 5,
            "motorGroupId": 28,
            "motorSubGroupId": 80,
            "nodeKey": "22124|s|5|g|28|sg|80",
            "keywords": [
              "steering knuckle",
              "steering",
              "knuckle"
            ]
          }
        ]
      },
      {
        "id": "motor-g-58",
        "label": "Control Module",
        "motorSystemId": 5,
        "motorGroupId": 58,
        "subgroups": [
          {
            "id": "motor-sg-192",
            "label": "Power Steering System",
            "motorSystemId": 5,
            "motorGroupId": 58,
            "motorSubGroupId": 192,
            "nodeKey": "22124|s|5|g|58|sg|192",
            "keywords": [
              "power steering system",
              "power",
              "steering",
              "system"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-6",
    "label": "Suspension",
    "motorSystemId": 6,
    "groups": [
      {
        "id": "motor-g-1",
        "label": "@ALL",
        "motorSystemId": 6,
        "motorGroupId": 1,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 6,
            "motorGroupId": 1,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|6|g|1|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          }
        ]
      },
      {
        "id": "motor-g-9",
        "label": "Tire & Wheel",
        "motorSystemId": 6,
        "motorGroupId": 9,
        "subgroups": [
          {
            "id": "motor-sg-29",
            "label": "Tire",
            "motorSystemId": 6,
            "motorGroupId": 9,
            "motorSubGroupId": 29,
            "nodeKey": "22124|s|6|g|9|sg|29",
            "keywords": [
              "tire",
              "tire"
            ]
          },
          {
            "id": "motor-sg-32",
            "label": "Wheel",
            "motorSystemId": 6,
            "motorGroupId": 9,
            "motorSubGroupId": 32,
            "nodeKey": "22124|s|6|g|9|sg|32",
            "keywords": [
              "wheel",
              "wheel"
            ]
          },
          {
            "id": "motor-sg-141",
            "label": "Tire & Wheel Assembly",
            "motorSystemId": 6,
            "motorGroupId": 9,
            "motorSubGroupId": 141,
            "nodeKey": "22124|s|6|g|9|sg|141",
            "keywords": [
              "tire & wheel assembly",
              "tire",
              "wheel",
              "assembly"
            ]
          }
        ]
      },
      {
        "id": "motor-g-22",
        "label": "Vertical Dampening",
        "motorSystemId": 6,
        "motorGroupId": 22,
        "subgroups": [
          {
            "id": "motor-sg-50",
            "label": "Coil Spring",
            "motorSystemId": 6,
            "motorGroupId": 22,
            "motorSubGroupId": 50,
            "nodeKey": "22124|s|6|g|22|sg|50",
            "keywords": [
              "coil spring",
              "coil",
              "spring"
            ]
          },
          {
            "id": "motor-sg-81",
            "label": "Strut",
            "motorSystemId": 6,
            "motorGroupId": 22,
            "motorSubGroupId": 81,
            "nodeKey": "22124|s|6|g|22|sg|81",
            "keywords": [
              "strut",
              "strut"
            ]
          },
          {
            "id": "motor-sg-360",
            "label": "Shock/Strut",
            "motorSystemId": 6,
            "motorGroupId": 22,
            "motorSubGroupId": 360,
            "nodeKey": "22124|s|6|g|22|sg|360",
            "keywords": [
              "shock/strut",
              "shock",
              "strut"
            ]
          }
        ]
      },
      {
        "id": "motor-g-23",
        "label": "Hub & Bearings",
        "motorSystemId": 6,
        "motorGroupId": 23,
        "subgroups": [
          {
            "id": "motor-sg-92",
            "label": "Wheel Bearing",
            "motorSystemId": 6,
            "motorGroupId": 23,
            "motorSubGroupId": 92,
            "nodeKey": "22124|s|6|g|23|sg|92",
            "keywords": [
              "wheel bearing",
              "wheel",
              "bearing"
            ]
          },
          {
            "id": "motor-sg-94",
            "label": "Wheel Hub",
            "motorSystemId": 6,
            "motorGroupId": 23,
            "motorSubGroupId": 94,
            "nodeKey": "22124|s|6|g|23|sg|94",
            "keywords": [
              "wheel hub",
              "wheel",
              "hub"
            ]
          }
        ]
      },
      {
        "id": "motor-g-25",
        "label": "Lateral Dampening",
        "motorSystemId": 6,
        "motorGroupId": 25,
        "subgroups": [
          {
            "id": "motor-sg-77",
            "label": "Stabilizer Bar",
            "motorSystemId": 6,
            "motorGroupId": 25,
            "motorSubGroupId": 77,
            "nodeKey": "22124|s|6|g|25|sg|77",
            "keywords": [
              "stabilizer bar",
              "stabilizer",
              "bar"
            ]
          }
        ]
      },
      {
        "id": "motor-g-28",
        "label": "Pivot Points",
        "motorSystemId": 6,
        "motorGroupId": 28,
        "subgroups": [
          {
            "id": "motor-sg-54",
            "label": "Suspension Arm",
            "motorSystemId": 6,
            "motorGroupId": 28,
            "motorSubGroupId": 54,
            "nodeKey": "22124|s|6|g|28|sg|54",
            "keywords": [
              "suspension arm",
              "suspension",
              "arm"
            ]
          }
        ]
      },
      {
        "id": "motor-g-33",
        "label": "Adjustments",
        "motorSystemId": 6,
        "motorGroupId": 33,
        "subgroups": [
          {
            "id": "motor-sg-96",
            "label": "Wheel Alignment",
            "motorSystemId": 6,
            "motorGroupId": 33,
            "motorSubGroupId": 96,
            "nodeKey": "22124|s|6|g|33|sg|96",
            "keywords": [
              "wheel alignment",
              "wheel",
              "alignment"
            ]
          }
        ]
      },
      {
        "id": "motor-g-55",
        "label": "Sensors",
        "motorSystemId": 6,
        "motorGroupId": 55,
        "subgroups": [
          {
            "id": "motor-sg-86",
            "label": "Tire Pressure Monitor",
            "motorSystemId": 6,
            "motorGroupId": 55,
            "motorSubGroupId": 86,
            "nodeKey": "22124|s|6|g|55|sg|86",
            "keywords": [
              "tire pressure monitor",
              "tire",
              "pressure",
              "monitor"
            ]
          }
        ]
      },
      {
        "id": "motor-g-58",
        "label": "Control Module",
        "motorSystemId": 6,
        "motorGroupId": 58,
        "subgroups": [
          {
            "id": "motor-sg-86",
            "label": "Tire Pressure Monitor",
            "motorSystemId": 6,
            "motorGroupId": 58,
            "motorSubGroupId": 86,
            "nodeKey": "22124|s|6|g|58|sg|86",
            "keywords": [
              "tire pressure monitor",
              "tire",
              "pressure",
              "monitor"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "motor-s-8",
    "label": "Vehicle",
    "motorSystemId": 8,
    "groups": [
      {
        "id": "motor-g-1",
        "label": "@ALL",
        "motorSystemId": 8,
        "motorGroupId": 1,
        "subgroups": [
          {
            "id": "motor-sg-1",
            "label": "@ALL",
            "motorSystemId": 8,
            "motorGroupId": 1,
            "motorSubGroupId": 1,
            "nodeKey": "22124|s|8|g|1|sg|1",
            "keywords": [
              "@all",
              "@all"
            ]
          }
        ]
      },
      {
        "id": "motor-g-80",
        "label": "Universal Vehicle Operation",
        "motorSystemId": 8,
        "motorGroupId": 80,
        "subgroups": [
          {
            "id": "motor-sg-332",
            "label": "Universal Vehicle Operation",
            "motorSystemId": 8,
            "motorGroupId": 80,
            "motorSubGroupId": 332,
            "nodeKey": "22124|s|8|g|80|sg|332",
            "keywords": [
              "universal vehicle operation",
              "universal",
              "vehicle",
              "operation"
            ]
          }
        ]
      }
    ]
  }
] as MotorLaborSystem[];

/** Flat subcategories for 2-level backward compat (label = Group › SubGroup). */
export const MOTOR_FLAT_SUBCATEGORIES = [
  {
    "id": "motor-sg-2",
    "label": "Passenger Restraint System › Air Bag System",
    "groupLabel": "Passenger Restraint System",
    "motorSystemId": 1,
    "motorGroupId": 7,
    "motorSubGroupId": 2,
    "nodeKey": "22124|s|1|g|7|sg|2",
    "keywords": [
      "air bag system",
      "air",
      "bag",
      "system"
    ]
  },
  {
    "id": "motor-sg-142",
    "label": "Passenger Restraint System › Seat Belt System",
    "groupLabel": "Passenger Restraint System",
    "motorSystemId": 1,
    "motorGroupId": 7,
    "motorSubGroupId": 142,
    "nodeKey": "22124|s|1|g|7|sg|142",
    "keywords": [
      "seat belt system",
      "seat",
      "belt",
      "system"
    ]
  },
  {
    "id": "motor-sg-308",
    "label": "Passenger Restraint System › Seat Belt Warning System",
    "groupLabel": "Passenger Restraint System",
    "motorSystemId": 1,
    "motorGroupId": 7,
    "motorSubGroupId": 308,
    "nodeKey": "22124|s|1|g|7|sg|308",
    "keywords": [
      "seat belt warning system",
      "seat",
      "belt",
      "warning",
      "system"
    ]
  },
  {
    "id": "motor-sg-20",
    "label": "Body Panels › Hood",
    "groupLabel": "Body Panels",
    "motorSystemId": 1,
    "motorGroupId": 13,
    "motorSubGroupId": 20,
    "nodeKey": "22124|s|1|g|13|sg|20",
    "keywords": [
      "hood",
      "hood"
    ]
  },
  {
    "id": "motor-sg-58",
    "label": "Body Panels › Door Systems",
    "groupLabel": "Body Panels",
    "motorSystemId": 1,
    "motorGroupId": 13,
    "motorSubGroupId": 58,
    "nodeKey": "22124|s|1|g|13|sg|58",
    "keywords": [
      "door systems",
      "door",
      "systems"
    ]
  },
  {
    "id": "motor-sg-88",
    "label": "Body Panels › Trunk",
    "groupLabel": "Body Panels",
    "motorSystemId": 1,
    "motorGroupId": 13,
    "motorSubGroupId": 88,
    "nodeKey": "22124|s|1|g|13|sg|88",
    "keywords": [
      "trunk",
      "trunk"
    ]
  },
  {
    "id": "motor-sg-153",
    "label": "Body Panels › Power Roof System",
    "groupLabel": "Body Panels",
    "motorSystemId": 1,
    "motorGroupId": 13,
    "motorSubGroupId": 153,
    "nodeKey": "22124|s|1|g|13|sg|153",
    "keywords": [
      "power roof system",
      "power",
      "roof",
      "system"
    ]
  },
  {
    "id": "motor-sg-123",
    "label": "Interior Trim & Panels › Console",
    "groupLabel": "Interior Trim & Panels",
    "motorSystemId": 1,
    "motorGroupId": 36,
    "motorSubGroupId": 123,
    "nodeKey": "22124|s|1|g|36|sg|123",
    "keywords": [
      "console",
      "console"
    ]
  },
  {
    "id": "motor-sg-171",
    "label": "Interior Trim & Panels › Instrument Panel",
    "groupLabel": "Interior Trim & Panels",
    "motorSystemId": 1,
    "motorGroupId": 36,
    "motorSubGroupId": 171,
    "nodeKey": "22124|s|1|g|36|sg|171",
    "keywords": [
      "instrument panel",
      "instrument",
      "panel"
    ]
  },
  {
    "id": "motor-sg-139",
    "label": "Bumper System › Bumper Cover",
    "groupLabel": "Bumper System",
    "motorSystemId": 1,
    "motorGroupId": 43,
    "motorSubGroupId": 139,
    "nodeKey": "22124|s|1|g|43|sg|139",
    "keywords": [
      "bumper cover",
      "bumper",
      "cover"
    ]
  },
  {
    "id": "motor-sg-2",
    "label": "Sensors › Air Bag System",
    "groupLabel": "Sensors",
    "motorSystemId": 1,
    "motorGroupId": 55,
    "motorSubGroupId": 2,
    "nodeKey": "22124|s|1|g|55|sg|2",
    "keywords": [
      "air bag system",
      "air",
      "bag",
      "system"
    ]
  },
  {
    "id": "motor-sg-58",
    "label": "Switches › Door Systems",
    "groupLabel": "Switches",
    "motorSystemId": 1,
    "motorGroupId": 56,
    "motorSubGroupId": 58,
    "nodeKey": "22124|s|1|g|56|sg|58",
    "keywords": [
      "door systems",
      "door",
      "systems"
    ]
  },
  {
    "id": "motor-sg-171",
    "label": "Switches › Instrument Panel",
    "groupLabel": "Switches",
    "motorSystemId": 1,
    "motorGroupId": 56,
    "motorSubGroupId": 171,
    "nodeKey": "22124|s|1|g|56|sg|171",
    "keywords": [
      "instrument panel",
      "instrument",
      "panel"
    ]
  },
  {
    "id": "motor-sg-2",
    "label": "Control Module › Air Bag System",
    "groupLabel": "Control Module",
    "motorSystemId": 1,
    "motorGroupId": 58,
    "motorSubGroupId": 2,
    "nodeKey": "22124|s|1|g|58|sg|2",
    "keywords": [
      "air bag system",
      "air",
      "bag",
      "system"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "@ALL › @ALL",
    "groupLabel": "@ALL",
    "motorSystemId": 2,
    "motorGroupId": 1,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|2|g|1|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Control System › @ALL",
    "groupLabel": "Control System",
    "motorSystemId": 2,
    "motorGroupId": 15,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|2|g|15|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-140",
    "label": "Control System › Anti-lock Brake System",
    "groupLabel": "Control System",
    "motorSystemId": 2,
    "motorGroupId": 15,
    "motorSubGroupId": 140,
    "nodeKey": "22124|s|2|g|15|sg|140",
    "keywords": [
      "anti-lock brake system",
      "anti",
      "lock",
      "brake",
      "system"
    ]
  },
  {
    "id": "motor-sg-41",
    "label": "Disc Brakes › Brake Caliper",
    "groupLabel": "Disc Brakes",
    "motorSystemId": 2,
    "motorGroupId": 17,
    "motorSubGroupId": 41,
    "nodeKey": "22124|s|2|g|17|sg|41",
    "keywords": [
      "brake caliper",
      "brake",
      "caliper"
    ]
  },
  {
    "id": "motor-sg-44",
    "label": "Disc Brakes › Brake Pads",
    "groupLabel": "Disc Brakes",
    "motorSystemId": 2,
    "motorGroupId": 17,
    "motorSubGroupId": 44,
    "nodeKey": "22124|s|2|g|17|sg|44",
    "keywords": [
      "brake pads",
      "brake",
      "pads"
    ]
  },
  {
    "id": "motor-sg-45",
    "label": "Disc Brakes › Brake Rotor",
    "groupLabel": "Disc Brakes",
    "motorSystemId": 2,
    "motorGroupId": 17,
    "motorSubGroupId": 45,
    "nodeKey": "22124|s|2|g|17|sg|45",
    "keywords": [
      "brake rotor",
      "brake",
      "rotor"
    ]
  },
  {
    "id": "motor-sg-42",
    "label": "Drum Brakes › Brake Drum",
    "groupLabel": "Drum Brakes",
    "motorSystemId": 2,
    "motorGroupId": 19,
    "motorSubGroupId": 42,
    "nodeKey": "22124|s|2|g|19|sg|42",
    "keywords": [
      "brake drum",
      "brake",
      "drum"
    ]
  },
  {
    "id": "motor-sg-46",
    "label": "Drum Brakes › Brake Shoes",
    "groupLabel": "Drum Brakes",
    "motorSystemId": 2,
    "motorGroupId": 19,
    "motorSubGroupId": 46,
    "nodeKey": "22124|s|2|g|19|sg|46",
    "keywords": [
      "brake shoes",
      "brake",
      "shoes"
    ]
  },
  {
    "id": "motor-sg-93",
    "label": "Drum Brakes › Wheel Cylinder",
    "groupLabel": "Drum Brakes",
    "motorSystemId": 2,
    "motorGroupId": 19,
    "motorSubGroupId": 93,
    "nodeKey": "22124|s|2|g|19|sg|93",
    "keywords": [
      "wheel cylinder",
      "wheel",
      "cylinder"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Hydraulic System › @ALL",
    "groupLabel": "Hydraulic System",
    "motorSystemId": 2,
    "motorGroupId": 24,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|2|g|24|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-22",
    "label": "Hydraulic System › Master Cylinder",
    "groupLabel": "Hydraulic System",
    "motorSystemId": 2,
    "motorGroupId": 24,
    "motorSubGroupId": 22,
    "nodeKey": "22124|s|2|g|24|sg|22",
    "keywords": [
      "master cylinder",
      "master",
      "cylinder"
    ]
  },
  {
    "id": "motor-sg-135",
    "label": "Hydraulic System › Brake Line",
    "groupLabel": "Hydraulic System",
    "motorSystemId": 2,
    "motorGroupId": 24,
    "motorSubGroupId": 135,
    "nodeKey": "22124|s|2|g|24|sg|135",
    "keywords": [
      "brake line",
      "brake",
      "line"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Parking Brake › @ALL",
    "groupLabel": "Parking Brake",
    "motorSystemId": 2,
    "motorGroupId": 27,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|2|g|27|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-71",
    "label": "Parking Brake › Parking Brake Cable",
    "groupLabel": "Parking Brake",
    "motorSystemId": 2,
    "motorGroupId": 27,
    "motorSubGroupId": 71,
    "nodeKey": "22124|s|2|g|27|sg|71",
    "keywords": [
      "parking brake cable",
      "parking",
      "brake",
      "cable"
    ]
  },
  {
    "id": "motor-sg-344",
    "label": "Power Assist › Brake Booster",
    "groupLabel": "Power Assist",
    "motorSystemId": 2,
    "motorGroupId": 34,
    "motorSubGroupId": 344,
    "nodeKey": "22124|s|2|g|34|sg|344",
    "keywords": [
      "brake booster",
      "brake",
      "booster"
    ]
  },
  {
    "id": "motor-sg-140",
    "label": "Sensors › Anti-lock Brake System",
    "groupLabel": "Sensors",
    "motorSystemId": 2,
    "motorGroupId": 55,
    "motorSubGroupId": 140,
    "nodeKey": "22124|s|2|g|55|sg|140",
    "keywords": [
      "anti-lock brake system",
      "anti",
      "lock",
      "brake",
      "system"
    ]
  },
  {
    "id": "motor-sg-22",
    "label": "Switches › Master Cylinder",
    "groupLabel": "Switches",
    "motorSystemId": 2,
    "motorGroupId": 56,
    "motorSubGroupId": 22,
    "nodeKey": "22124|s|2|g|56|sg|22",
    "keywords": [
      "master cylinder",
      "master",
      "cylinder"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "@ALL › @ALL",
    "groupLabel": "@ALL",
    "motorSystemId": 3,
    "motorGroupId": 1,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|3|g|1|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-127",
    "label": "Entertainment System › Antenna",
    "groupLabel": "Entertainment System",
    "motorSystemId": 3,
    "motorGroupId": 4,
    "motorSubGroupId": 127,
    "nodeKey": "22124|s|3|g|4|sg|127",
    "keywords": [
      "antenna",
      "antenna"
    ]
  },
  {
    "id": "motor-sg-17",
    "label": "Exterior Lighting › Headlamp",
    "groupLabel": "Exterior Lighting",
    "motorSystemId": 3,
    "motorGroupId": 6,
    "motorSubGroupId": 17,
    "nodeKey": "22124|s|3|g|6|sg|17",
    "keywords": [
      "headlamp",
      "headlamp"
    ]
  },
  {
    "id": "motor-sg-47",
    "label": "Exterior Lighting › Bulbs",
    "groupLabel": "Exterior Lighting",
    "motorSystemId": 3,
    "motorGroupId": 6,
    "motorSubGroupId": 47,
    "nodeKey": "22124|s|3|g|6|sg|47",
    "keywords": [
      "bulbs",
      "bulbs"
    ]
  },
  {
    "id": "motor-sg-31",
    "label": "Wiper & Washer System › Washer Reservoir",
    "groupLabel": "Wiper & Washer System",
    "motorSystemId": 3,
    "motorGroupId": 11,
    "motorSubGroupId": 31,
    "nodeKey": "22124|s|3|g|11|sg|31",
    "keywords": [
      "washer reservoir",
      "washer",
      "reservoir"
    ]
  },
  {
    "id": "motor-sg-91",
    "label": "Wiper & Washer System › Washer Fluid Pump",
    "groupLabel": "Wiper & Washer System",
    "motorSystemId": 3,
    "motorGroupId": 11,
    "motorSubGroupId": 91,
    "nodeKey": "22124|s|3|g|11|sg|91",
    "keywords": [
      "washer fluid pump",
      "washer",
      "fluid",
      "pump"
    ]
  },
  {
    "id": "motor-sg-124",
    "label": "Wiper & Washer System › Wiper Linkage",
    "groupLabel": "Wiper & Washer System",
    "motorSystemId": 3,
    "motorGroupId": 11,
    "motorSubGroupId": 124,
    "nodeKey": "22124|s|3|g|11|sg|124",
    "keywords": [
      "wiper linkage",
      "wiper",
      "linkage"
    ]
  },
  {
    "id": "motor-sg-126",
    "label": "Wiper & Washer System › Wiper Motor",
    "groupLabel": "Wiper & Washer System",
    "motorSystemId": 3,
    "motorGroupId": 11,
    "motorSubGroupId": 126,
    "nodeKey": "22124|s|3|g|11|sg|126",
    "keywords": [
      "wiper motor",
      "wiper",
      "motor"
    ]
  },
  {
    "id": "motor-sg-203",
    "label": "Wiper & Washer System › Windshield",
    "groupLabel": "Wiper & Washer System",
    "motorSystemId": 3,
    "motorGroupId": 11,
    "motorSubGroupId": 203,
    "nodeKey": "22124|s|3|g|11|sg|203",
    "keywords": [
      "windshield",
      "windshield"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Control System › @ALL",
    "groupLabel": "Control System",
    "motorSystemId": 3,
    "motorGroupId": 15,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|3|g|15|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-36",
    "label": "Engine › Alternator",
    "groupLabel": "Engine",
    "motorSystemId": 3,
    "motorGroupId": 20,
    "motorSubGroupId": 36,
    "nodeKey": "22124|s|3|g|20|sg|36",
    "keywords": [
      "alternator",
      "alternator"
    ]
  },
  {
    "id": "motor-sg-78",
    "label": "Engine › Starting System",
    "groupLabel": "Engine",
    "motorSystemId": 3,
    "motorGroupId": 20,
    "motorSubGroupId": 78,
    "nodeKey": "22124|s|3|g|20|sg|78",
    "keywords": [
      "starting system",
      "starting",
      "system"
    ]
  },
  {
    "id": "motor-sg-3",
    "label": "Power Distribution › Battery & Cables",
    "groupLabel": "Power Distribution",
    "motorSystemId": 3,
    "motorGroupId": 29,
    "motorSubGroupId": 3,
    "nodeKey": "22124|s|3|g|29|sg|3",
    "keywords": [
      "battery & cables",
      "battery",
      "cables"
    ]
  },
  {
    "id": "motor-sg-272",
    "label": "Steering Column › Horn Components",
    "groupLabel": "Steering Column",
    "motorSystemId": 3,
    "motorGroupId": 30,
    "motorSubGroupId": 272,
    "nodeKey": "22124|s|3|g|30|sg|272",
    "keywords": [
      "horn components",
      "horn",
      "components"
    ]
  },
  {
    "id": "motor-sg-86",
    "label": "Warning Systems › Tire Pressure Monitor",
    "groupLabel": "Warning Systems",
    "motorSystemId": 3,
    "motorGroupId": 32,
    "motorSubGroupId": 86,
    "nodeKey": "22124|s|3|g|32|sg|86",
    "keywords": [
      "tire pressure monitor",
      "tire",
      "pressure",
      "monitor"
    ]
  },
  {
    "id": "motor-sg-129",
    "label": "Latches & Locks › Lock Cylinder",
    "groupLabel": "Latches & Locks",
    "motorSystemId": 3,
    "motorGroupId": 38,
    "motorSubGroupId": 129,
    "nodeKey": "22124|s|3|g|38|sg|129",
    "keywords": [
      "lock cylinder",
      "lock",
      "cylinder"
    ]
  },
  {
    "id": "motor-sg-170",
    "label": "Driver Information System › Instrument Cluster",
    "groupLabel": "Driver Information System",
    "motorSystemId": 3,
    "motorGroupId": 52,
    "motorSubGroupId": 170,
    "nodeKey": "22124|s|3|g|52|sg|170",
    "keywords": [
      "instrument cluster",
      "instrument",
      "cluster"
    ]
  },
  {
    "id": "motor-sg-47",
    "label": "Interior Lighting › Bulbs",
    "groupLabel": "Interior Lighting",
    "motorSystemId": 3,
    "motorGroupId": 53,
    "motorSubGroupId": 47,
    "nodeKey": "22124|s|3|g|53|sg|47",
    "keywords": [
      "bulbs",
      "bulbs"
    ]
  },
  {
    "id": "motor-sg-102",
    "label": "Switches › Seats",
    "groupLabel": "Switches",
    "motorSystemId": 3,
    "motorGroupId": 56,
    "motorSubGroupId": 102,
    "nodeKey": "22124|s|3|g|56|sg|102",
    "keywords": [
      "seats",
      "seats"
    ]
  },
  {
    "id": "motor-sg-178",
    "label": "Switches › Cruise Control System",
    "groupLabel": "Switches",
    "motorSystemId": 3,
    "motorGroupId": 56,
    "motorSubGroupId": 178,
    "nodeKey": "22124|s|3|g|56|sg|178",
    "keywords": [
      "cruise control system",
      "cruise",
      "control",
      "system"
    ]
  },
  {
    "id": "motor-sg-182",
    "label": "Switches › Exterior Lighting",
    "groupLabel": "Switches",
    "motorSystemId": 3,
    "motorGroupId": 56,
    "motorSubGroupId": 182,
    "nodeKey": "22124|s|3|g|56|sg|182",
    "keywords": [
      "exterior lighting",
      "exterior",
      "lighting"
    ]
  },
  {
    "id": "motor-sg-184",
    "label": "Switches › Wiper & Washer System",
    "groupLabel": "Switches",
    "motorSystemId": 3,
    "motorGroupId": 56,
    "motorSubGroupId": 184,
    "nodeKey": "22124|s|3|g|56|sg|184",
    "keywords": [
      "wiper & washer system",
      "wiper",
      "washer",
      "system"
    ]
  },
  {
    "id": "motor-sg-187",
    "label": "Switches › Power Distribution",
    "groupLabel": "Switches",
    "motorSystemId": 3,
    "motorGroupId": 56,
    "motorSubGroupId": 187,
    "nodeKey": "22124|s|3|g|56|sg|187",
    "keywords": [
      "power distribution",
      "power",
      "distribution"
    ]
  },
  {
    "id": "motor-sg-188",
    "label": "Switches › Steering Column",
    "groupLabel": "Switches",
    "motorSystemId": 3,
    "motorGroupId": 56,
    "motorSubGroupId": 188,
    "nodeKey": "22124|s|3|g|56|sg|188",
    "keywords": [
      "steering column",
      "steering",
      "column"
    ]
  },
  {
    "id": "motor-sg-172",
    "label": "Control Module › Body Control System",
    "groupLabel": "Control Module",
    "motorSystemId": 3,
    "motorGroupId": 58,
    "motorSubGroupId": 172,
    "nodeKey": "22124|s|3|g|58|sg|172",
    "keywords": [
      "body control system",
      "body",
      "control",
      "system"
    ]
  },
  {
    "id": "motor-sg-78",
    "label": "Relays › Starting System",
    "groupLabel": "Relays",
    "motorSystemId": 3,
    "motorGroupId": 70,
    "motorSubGroupId": 78,
    "nodeKey": "22124|s|3|g|70|sg|78",
    "keywords": [
      "starting system",
      "starting",
      "system"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Body Control System › @ALL",
    "groupLabel": "Body Control System",
    "motorSystemId": 3,
    "motorGroupId": 89,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|3|g|89|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Air Conditioning System › @ALL",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|4|g|2|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-23",
    "label": "Air Conditioning System › Relays",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 23,
    "nodeKey": "22124|s|4|g|2|sg|23",
    "keywords": [
      "relays",
      "relays"
    ]
  },
  {
    "id": "motor-sg-51",
    "label": "Air Conditioning System › Compressor",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 51,
    "nodeKey": "22124|s|4|g|2|sg|51",
    "keywords": [
      "compressor",
      "compressor"
    ]
  },
  {
    "id": "motor-sg-52",
    "label": "Air Conditioning System › Condenser Core",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 52,
    "nodeKey": "22124|s|4|g|2|sg|52",
    "keywords": [
      "condenser core",
      "condenser",
      "core"
    ]
  },
  {
    "id": "motor-sg-53",
    "label": "Air Conditioning System › Condenser Fan Motor",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 53,
    "nodeKey": "22124|s|4|g|2|sg|53",
    "keywords": [
      "condenser fan motor",
      "condenser",
      "fan",
      "motor"
    ]
  },
  {
    "id": "motor-sg-61",
    "label": "Air Conditioning System › HVAC Case",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 61,
    "nodeKey": "22124|s|4|g|2|sg|61",
    "keywords": [
      "hvac case",
      "hvac",
      "case"
    ]
  },
  {
    "id": "motor-sg-75",
    "label": "Air Conditioning System › Receiver Drier",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 75,
    "nodeKey": "22124|s|4|g|2|sg|75",
    "keywords": [
      "receiver drier",
      "receiver",
      "drier"
    ]
  },
  {
    "id": "motor-sg-76",
    "label": "Air Conditioning System › Refrigerant Line",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 76,
    "nodeKey": "22124|s|4|g|2|sg|76",
    "keywords": [
      "refrigerant line",
      "refrigerant",
      "line"
    ]
  },
  {
    "id": "motor-sg-89",
    "label": "Air Conditioning System › Valves & Actuators",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 89,
    "nodeKey": "22124|s|4|g|2|sg|89",
    "keywords": [
      "valves & actuators",
      "valves",
      "actuators"
    ]
  },
  {
    "id": "motor-sg-185",
    "label": "Air Conditioning System › Air Conditioning System",
    "groupLabel": "Air Conditioning System",
    "motorSystemId": 4,
    "motorGroupId": 2,
    "motorSubGroupId": 185,
    "nodeKey": "22124|s|4|g|2|sg|185",
    "keywords": [
      "air conditioning system",
      "air",
      "conditioning",
      "system"
    ]
  },
  {
    "id": "motor-sg-34",
    "label": "Air Distribution › Air Filter",
    "groupLabel": "Air Distribution",
    "motorSystemId": 4,
    "motorGroupId": 12,
    "motorSubGroupId": 34,
    "nodeKey": "22124|s|4|g|12|sg|34",
    "keywords": [
      "air filter",
      "air",
      "filter"
    ]
  },
  {
    "id": "motor-sg-39",
    "label": "Air Distribution › Blower Motor",
    "groupLabel": "Air Distribution",
    "motorSystemId": 4,
    "motorGroupId": 12,
    "motorSubGroupId": 39,
    "nodeKey": "22124|s|4|g|12|sg|39",
    "keywords": [
      "blower motor",
      "blower",
      "motor"
    ]
  },
  {
    "id": "motor-sg-61",
    "label": "Air Distribution › HVAC Case",
    "groupLabel": "Air Distribution",
    "motorSystemId": 4,
    "motorGroupId": 12,
    "motorSubGroupId": 61,
    "nodeKey": "22124|s|4|g|12|sg|61",
    "keywords": [
      "hvac case",
      "hvac",
      "case"
    ]
  },
  {
    "id": "motor-sg-99",
    "label": "Air Distribution › Control System",
    "groupLabel": "Air Distribution",
    "motorSystemId": 4,
    "motorGroupId": 12,
    "motorSubGroupId": 99,
    "nodeKey": "22124|s|4|g|12|sg|99",
    "keywords": [
      "control system",
      "control",
      "system"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Control System › @ALL",
    "groupLabel": "Control System",
    "motorSystemId": 4,
    "motorGroupId": 15,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|4|g|15|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-89",
    "label": "Control System › Valves & Actuators",
    "groupLabel": "Control System",
    "motorSystemId": 4,
    "motorGroupId": 15,
    "motorSubGroupId": 89,
    "nodeKey": "22124|s|4|g|15|sg|89",
    "keywords": [
      "valves & actuators",
      "valves",
      "actuators"
    ]
  },
  {
    "id": "motor-sg-18",
    "label": "Heating › Heater Core",
    "groupLabel": "Heating",
    "motorSystemId": 4,
    "motorGroupId": 21,
    "motorSubGroupId": 18,
    "nodeKey": "22124|s|4|g|21|sg|18",
    "keywords": [
      "heater core",
      "heater",
      "core"
    ]
  },
  {
    "id": "motor-sg-19",
    "label": "Heating › Heater Hose",
    "groupLabel": "Heating",
    "motorSystemId": 4,
    "motorGroupId": 21,
    "motorSubGroupId": 19,
    "nodeKey": "22124|s|4|g|21|sg|19",
    "keywords": [
      "heater hose",
      "heater",
      "hose"
    ]
  },
  {
    "id": "motor-sg-99",
    "label": "Sensors › Control System",
    "groupLabel": "Sensors",
    "motorSystemId": 4,
    "motorGroupId": 55,
    "motorSubGroupId": 99,
    "nodeKey": "22124|s|4|g|55|sg|99",
    "keywords": [
      "control system",
      "control",
      "system"
    ]
  },
  {
    "id": "motor-sg-185",
    "label": "Switches › Air Conditioning System",
    "groupLabel": "Switches",
    "motorSystemId": 4,
    "motorGroupId": 56,
    "motorSubGroupId": 185,
    "nodeKey": "22124|s|4|g|56|sg|185",
    "keywords": [
      "air conditioning system",
      "air",
      "conditioning",
      "system"
    ]
  },
  {
    "id": "motor-sg-39",
    "label": "Control Module › Blower Motor",
    "groupLabel": "Control Module",
    "motorSystemId": 4,
    "motorGroupId": 58,
    "motorSubGroupId": 39,
    "nodeKey": "22124|s|4|g|58|sg|39",
    "keywords": [
      "blower motor",
      "blower",
      "motor"
    ]
  },
  {
    "id": "motor-sg-55",
    "label": "Control System › Control Module",
    "groupLabel": "Control System",
    "motorSystemId": 7,
    "motorGroupId": 15,
    "motorSubGroupId": 55,
    "nodeKey": "22124|s|7|g|15|sg|55",
    "keywords": [
      "control module",
      "control",
      "module"
    ]
  },
  {
    "id": "motor-sg-60",
    "label": "Control System › Emission Control",
    "groupLabel": "Control System",
    "motorSystemId": 7,
    "motorGroupId": 15,
    "motorSubGroupId": 60,
    "nodeKey": "22124|s|7|g|15|sg|60",
    "keywords": [
      "emission control",
      "emission",
      "control"
    ]
  },
  {
    "id": "motor-sg-37",
    "label": "Driveline › Axle",
    "groupLabel": "Driveline",
    "motorSystemId": 7,
    "motorGroupId": 18,
    "motorSubGroupId": 37,
    "nodeKey": "22124|s|7|g|18|sg|37",
    "keywords": [
      "axle",
      "axle"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Engine › @ALL",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|7|g|20|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-7",
    "label": "Engine › Crankshaft",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 7,
    "nodeKey": "22124|s|7|g|20|sg|7",
    "keywords": [
      "crankshaft",
      "crankshaft"
    ]
  },
  {
    "id": "motor-sg-12",
    "label": "Engine › Engine Assembly",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 12,
    "nodeKey": "22124|s|7|g|20|sg|12",
    "keywords": [
      "engine assembly",
      "engine",
      "assembly"
    ]
  },
  {
    "id": "motor-sg-15",
    "label": "Engine › Fuel Injection",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 15,
    "nodeKey": "22124|s|7|g|20|sg|15",
    "keywords": [
      "fuel injection",
      "fuel",
      "injection"
    ]
  },
  {
    "id": "motor-sg-21",
    "label": "Engine › Lubrication System",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 21,
    "nodeKey": "22124|s|7|g|20|sg|21",
    "keywords": [
      "lubrication system",
      "lubrication",
      "system"
    ]
  },
  {
    "id": "motor-sg-33",
    "label": "Engine › Accessory Drive Belt",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 33,
    "nodeKey": "22124|s|7|g|20|sg|33",
    "keywords": [
      "accessory drive belt",
      "accessory",
      "drive",
      "belt"
    ]
  },
  {
    "id": "motor-sg-35",
    "label": "Engine › Air Intake System",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 35,
    "nodeKey": "22124|s|7|g|20|sg|35",
    "keywords": [
      "air intake system",
      "air",
      "intake",
      "system"
    ]
  },
  {
    "id": "motor-sg-56",
    "label": "Engine › Cooling System",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 56,
    "nodeKey": "22124|s|7|g|20|sg|56",
    "keywords": [
      "cooling system",
      "cooling",
      "system"
    ]
  },
  {
    "id": "motor-sg-60",
    "label": "Engine › Emission Control",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 60,
    "nodeKey": "22124|s|7|g|20|sg|60",
    "keywords": [
      "emission control",
      "emission",
      "control"
    ]
  },
  {
    "id": "motor-sg-62",
    "label": "Engine › Exhaust System",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 62,
    "nodeKey": "22124|s|7|g|20|sg|62",
    "keywords": [
      "exhaust system",
      "exhaust",
      "system"
    ]
  },
  {
    "id": "motor-sg-64",
    "label": "Engine › Fuel Supply System",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 64,
    "nodeKey": "22124|s|7|g|20|sg|64",
    "keywords": [
      "fuel supply system",
      "fuel",
      "supply",
      "system"
    ]
  },
  {
    "id": "motor-sg-67",
    "label": "Engine › Ignition System",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 67,
    "nodeKey": "22124|s|7|g|20|sg|67",
    "keywords": [
      "ignition system",
      "ignition",
      "system"
    ]
  },
  {
    "id": "motor-sg-70",
    "label": "Engine › Mounts",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 70,
    "nodeKey": "22124|s|7|g|20|sg|70",
    "keywords": [
      "mounts",
      "mounts"
    ]
  },
  {
    "id": "motor-sg-84",
    "label": "Engine › Timing Belt",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 84,
    "nodeKey": "22124|s|7|g|20|sg|84",
    "keywords": [
      "timing belt",
      "timing",
      "belt"
    ]
  },
  {
    "id": "motor-sg-85",
    "label": "Engine › Timing Chain",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 85,
    "nodeKey": "22124|s|7|g|20|sg|85",
    "keywords": [
      "timing chain",
      "timing",
      "chain"
    ]
  },
  {
    "id": "motor-sg-90",
    "label": "Engine › Valvetrain",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 90,
    "nodeKey": "22124|s|7|g|20|sg|90",
    "keywords": [
      "valvetrain",
      "valvetrain"
    ]
  },
  {
    "id": "motor-sg-107",
    "label": "Engine › Connecting Rod",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 107,
    "nodeKey": "22124|s|7|g|20|sg|107",
    "keywords": [
      "connecting rod",
      "connecting",
      "rod"
    ]
  },
  {
    "id": "motor-sg-108",
    "label": "Engine › Engine Cylinder",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 108,
    "nodeKey": "22124|s|7|g|20|sg|108",
    "keywords": [
      "engine cylinder",
      "engine",
      "cylinder"
    ]
  },
  {
    "id": "motor-sg-111",
    "label": "Engine › Flexplate",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 111,
    "nodeKey": "22124|s|7|g|20|sg|111",
    "keywords": [
      "flexplate",
      "flexplate"
    ]
  },
  {
    "id": "motor-sg-138",
    "label": "Engine › Cylinder Block",
    "groupLabel": "Engine",
    "motorSystemId": 7,
    "motorGroupId": 20,
    "motorSubGroupId": 138,
    "nodeKey": "22124|s|7|g|20|sg|138",
    "keywords": [
      "cylinder block",
      "cylinder",
      "block"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Trans › @ALL",
    "groupLabel": "Trans",
    "motorSystemId": 7,
    "motorGroupId": 31,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|7|g|31|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-21",
    "label": "Trans › Lubrication System",
    "groupLabel": "Trans",
    "motorSystemId": 7,
    "motorGroupId": 31,
    "motorSubGroupId": 21,
    "nodeKey": "22124|s|7|g|31|sg|21",
    "keywords": [
      "lubrication system",
      "lubrication",
      "system"
    ]
  },
  {
    "id": "motor-sg-87",
    "label": "Trans › Trans Mount",
    "groupLabel": "Trans",
    "motorSystemId": 7,
    "motorGroupId": 31,
    "motorSubGroupId": 87,
    "nodeKey": "22124|s|7|g|31|sg|87",
    "keywords": [
      "trans mount",
      "trans",
      "mount"
    ]
  },
  {
    "id": "motor-sg-95",
    "label": "Trans › Trans Assembly",
    "groupLabel": "Trans",
    "motorSystemId": 7,
    "motorGroupId": 31,
    "motorSubGroupId": 95,
    "nodeKey": "22124|s|7|g|31|sg|95",
    "keywords": [
      "trans assembly",
      "trans",
      "assembly"
    ]
  },
  {
    "id": "motor-sg-4",
    "label": "Automatic Trans › Case & Components",
    "groupLabel": "Automatic Trans",
    "motorSystemId": 7,
    "motorGroupId": 41,
    "motorSubGroupId": 4,
    "nodeKey": "22124|s|7|g|41|sg|4",
    "keywords": [
      "case & components",
      "case",
      "components"
    ]
  },
  {
    "id": "motor-sg-118",
    "label": "Automatic Trans › Torque Converter",
    "groupLabel": "Automatic Trans",
    "motorSystemId": 7,
    "motorGroupId": 41,
    "motorSubGroupId": 118,
    "nodeKey": "22124|s|7|g|41|sg|118",
    "keywords": [
      "torque converter",
      "torque",
      "converter"
    ]
  },
  {
    "id": "motor-sg-143",
    "label": "Automatic Trans › Shift Lever",
    "groupLabel": "Automatic Trans",
    "motorSystemId": 7,
    "motorGroupId": 41,
    "motorSubGroupId": 143,
    "nodeKey": "22124|s|7|g|41|sg|143",
    "keywords": [
      "shift lever",
      "shift",
      "lever"
    ]
  },
  {
    "id": "motor-sg-49",
    "label": "Manual Trans › Clutch Assembly",
    "groupLabel": "Manual Trans",
    "motorSystemId": 7,
    "motorGroupId": 42,
    "motorSubGroupId": 49,
    "nodeKey": "22124|s|7|g|42|sg|49",
    "keywords": [
      "clutch assembly",
      "clutch",
      "assembly"
    ]
  },
  {
    "id": "motor-sg-65",
    "label": "Manual Trans › Hydraulic Clutch System",
    "groupLabel": "Manual Trans",
    "motorSystemId": 7,
    "motorGroupId": 42,
    "motorSubGroupId": 65,
    "nodeKey": "22124|s|7|g|42|sg|65",
    "keywords": [
      "hydraulic clutch system",
      "hydraulic",
      "clutch",
      "system"
    ]
  },
  {
    "id": "motor-sg-179",
    "label": "Sensors › Automatic Trans",
    "groupLabel": "Sensors",
    "motorSystemId": 7,
    "motorGroupId": 55,
    "motorSubGroupId": 179,
    "nodeKey": "22124|s|7|g|55|sg|179",
    "keywords": [
      "automatic trans",
      "automatic",
      "trans"
    ]
  },
  {
    "id": "motor-sg-180",
    "label": "Sensors › Engine",
    "groupLabel": "Sensors",
    "motorSystemId": 7,
    "motorGroupId": 55,
    "motorSubGroupId": 180,
    "nodeKey": "22124|s|7|g|55|sg|180",
    "keywords": [
      "engine",
      "engine"
    ]
  },
  {
    "id": "motor-sg-181",
    "label": "Sensors › Trans",
    "groupLabel": "Sensors",
    "motorSystemId": 7,
    "motorGroupId": 55,
    "motorSubGroupId": 181,
    "nodeKey": "22124|s|7|g|55|sg|181",
    "keywords": [
      "trans",
      "trans"
    ]
  },
  {
    "id": "motor-sg-180",
    "label": "Switches › Engine",
    "groupLabel": "Switches",
    "motorSystemId": 7,
    "motorGroupId": 56,
    "motorSubGroupId": 180,
    "nodeKey": "22124|s|7|g|56|sg|180",
    "keywords": [
      "engine",
      "engine"
    ]
  },
  {
    "id": "motor-sg-99",
    "label": "Control Module › Control System",
    "groupLabel": "Control Module",
    "motorSystemId": 7,
    "motorGroupId": 58,
    "motorSubGroupId": 99,
    "nodeKey": "22124|s|7|g|58|sg|99",
    "keywords": [
      "control system",
      "control",
      "system"
    ]
  },
  {
    "id": "motor-sg-181",
    "label": "Control Module › Trans",
    "groupLabel": "Control Module",
    "motorSystemId": 7,
    "motorGroupId": 58,
    "motorSubGroupId": 181,
    "nodeKey": "22124|s|7|g|58|sg|181",
    "keywords": [
      "trans",
      "trans"
    ]
  },
  {
    "id": "motor-sg-199",
    "label": "Control Module › Engine Control System",
    "groupLabel": "Control Module",
    "motorSystemId": 7,
    "motorGroupId": 58,
    "motorSubGroupId": 199,
    "nodeKey": "22124|s|7|g|58|sg|199",
    "keywords": [
      "engine control system",
      "engine",
      "control",
      "system"
    ]
  },
  {
    "id": "motor-sg-300",
    "label": "Hybrid Powertrain System › High Voltage System",
    "groupLabel": "Hybrid Powertrain System",
    "motorSystemId": 7,
    "motorGroupId": 66,
    "motorSubGroupId": 300,
    "nodeKey": "22124|s|7|g|66|sg|300",
    "keywords": [
      "high voltage system",
      "high",
      "voltage",
      "system"
    ]
  },
  {
    "id": "motor-sg-56",
    "label": "Relays › Cooling System",
    "groupLabel": "Relays",
    "motorSystemId": 7,
    "motorGroupId": 70,
    "motorSubGroupId": 56,
    "nodeKey": "22124|s|7|g|70|sg|56",
    "keywords": [
      "cooling system",
      "cooling",
      "system"
    ]
  },
  {
    "id": "motor-sg-64",
    "label": "Relays › Fuel Supply System",
    "groupLabel": "Relays",
    "motorSystemId": 7,
    "motorGroupId": 70,
    "motorSubGroupId": 64,
    "nodeKey": "22124|s|7|g|70|sg|64",
    "keywords": [
      "fuel supply system",
      "fuel",
      "supply",
      "system"
    ]
  },
  {
    "id": "motor-sg-79",
    "label": "Directional Control › Steering Gear Assembly",
    "groupLabel": "Directional Control",
    "motorSystemId": 5,
    "motorGroupId": 16,
    "motorSubGroupId": 79,
    "nodeKey": "22124|s|5|g|16|sg|79",
    "keywords": [
      "steering gear assembly",
      "steering",
      "gear",
      "assembly"
    ]
  },
  {
    "id": "motor-sg-83",
    "label": "Directional Control › Tie Rod",
    "groupLabel": "Directional Control",
    "motorSystemId": 5,
    "motorGroupId": 16,
    "motorSubGroupId": 83,
    "nodeKey": "22124|s|5|g|16|sg|83",
    "keywords": [
      "tie rod",
      "tie",
      "rod"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "Hydraulic System › @ALL",
    "groupLabel": "Hydraulic System",
    "motorSystemId": 5,
    "motorGroupId": 24,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|5|g|24|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-72",
    "label": "Hydraulic System › Power Steering Line",
    "groupLabel": "Hydraulic System",
    "motorSystemId": 5,
    "motorGroupId": 24,
    "motorSubGroupId": 72,
    "nodeKey": "22124|s|5|g|24|sg|72",
    "keywords": [
      "power steering line",
      "power",
      "steering",
      "line"
    ]
  },
  {
    "id": "motor-sg-73",
    "label": "Hydraulic System › Power Steering Pump",
    "groupLabel": "Hydraulic System",
    "motorSystemId": 5,
    "motorGroupId": 24,
    "motorSubGroupId": 73,
    "nodeKey": "22124|s|5|g|24|sg|73",
    "keywords": [
      "power steering pump",
      "power",
      "steering",
      "pump"
    ]
  },
  {
    "id": "motor-sg-80",
    "label": "Pivot Points › Steering Knuckle",
    "groupLabel": "Pivot Points",
    "motorSystemId": 5,
    "motorGroupId": 28,
    "motorSubGroupId": 80,
    "nodeKey": "22124|s|5|g|28|sg|80",
    "keywords": [
      "steering knuckle",
      "steering",
      "knuckle"
    ]
  },
  {
    "id": "motor-sg-192",
    "label": "Control Module › Power Steering System",
    "groupLabel": "Control Module",
    "motorSystemId": 5,
    "motorGroupId": 58,
    "motorSubGroupId": 192,
    "nodeKey": "22124|s|5|g|58|sg|192",
    "keywords": [
      "power steering system",
      "power",
      "steering",
      "system"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "@ALL › @ALL",
    "groupLabel": "@ALL",
    "motorSystemId": 6,
    "motorGroupId": 1,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|6|g|1|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-29",
    "label": "Tire & Wheel › Tire",
    "groupLabel": "Tire & Wheel",
    "motorSystemId": 6,
    "motorGroupId": 9,
    "motorSubGroupId": 29,
    "nodeKey": "22124|s|6|g|9|sg|29",
    "keywords": [
      "tire",
      "tire"
    ]
  },
  {
    "id": "motor-sg-32",
    "label": "Tire & Wheel › Wheel",
    "groupLabel": "Tire & Wheel",
    "motorSystemId": 6,
    "motorGroupId": 9,
    "motorSubGroupId": 32,
    "nodeKey": "22124|s|6|g|9|sg|32",
    "keywords": [
      "wheel",
      "wheel"
    ]
  },
  {
    "id": "motor-sg-141",
    "label": "Tire & Wheel › Tire & Wheel Assembly",
    "groupLabel": "Tire & Wheel",
    "motorSystemId": 6,
    "motorGroupId": 9,
    "motorSubGroupId": 141,
    "nodeKey": "22124|s|6|g|9|sg|141",
    "keywords": [
      "tire & wheel assembly",
      "tire",
      "wheel",
      "assembly"
    ]
  },
  {
    "id": "motor-sg-50",
    "label": "Vertical Dampening › Coil Spring",
    "groupLabel": "Vertical Dampening",
    "motorSystemId": 6,
    "motorGroupId": 22,
    "motorSubGroupId": 50,
    "nodeKey": "22124|s|6|g|22|sg|50",
    "keywords": [
      "coil spring",
      "coil",
      "spring"
    ]
  },
  {
    "id": "motor-sg-81",
    "label": "Vertical Dampening › Strut",
    "groupLabel": "Vertical Dampening",
    "motorSystemId": 6,
    "motorGroupId": 22,
    "motorSubGroupId": 81,
    "nodeKey": "22124|s|6|g|22|sg|81",
    "keywords": [
      "strut",
      "strut"
    ]
  },
  {
    "id": "motor-sg-360",
    "label": "Vertical Dampening › Shock/Strut",
    "groupLabel": "Vertical Dampening",
    "motorSystemId": 6,
    "motorGroupId": 22,
    "motorSubGroupId": 360,
    "nodeKey": "22124|s|6|g|22|sg|360",
    "keywords": [
      "shock/strut",
      "shock",
      "strut"
    ]
  },
  {
    "id": "motor-sg-92",
    "label": "Hub & Bearings › Wheel Bearing",
    "groupLabel": "Hub & Bearings",
    "motorSystemId": 6,
    "motorGroupId": 23,
    "motorSubGroupId": 92,
    "nodeKey": "22124|s|6|g|23|sg|92",
    "keywords": [
      "wheel bearing",
      "wheel",
      "bearing"
    ]
  },
  {
    "id": "motor-sg-94",
    "label": "Hub & Bearings › Wheel Hub",
    "groupLabel": "Hub & Bearings",
    "motorSystemId": 6,
    "motorGroupId": 23,
    "motorSubGroupId": 94,
    "nodeKey": "22124|s|6|g|23|sg|94",
    "keywords": [
      "wheel hub",
      "wheel",
      "hub"
    ]
  },
  {
    "id": "motor-sg-77",
    "label": "Lateral Dampening › Stabilizer Bar",
    "groupLabel": "Lateral Dampening",
    "motorSystemId": 6,
    "motorGroupId": 25,
    "motorSubGroupId": 77,
    "nodeKey": "22124|s|6|g|25|sg|77",
    "keywords": [
      "stabilizer bar",
      "stabilizer",
      "bar"
    ]
  },
  {
    "id": "motor-sg-54",
    "label": "Pivot Points › Suspension Arm",
    "groupLabel": "Pivot Points",
    "motorSystemId": 6,
    "motorGroupId": 28,
    "motorSubGroupId": 54,
    "nodeKey": "22124|s|6|g|28|sg|54",
    "keywords": [
      "suspension arm",
      "suspension",
      "arm"
    ]
  },
  {
    "id": "motor-sg-96",
    "label": "Adjustments › Wheel Alignment",
    "groupLabel": "Adjustments",
    "motorSystemId": 6,
    "motorGroupId": 33,
    "motorSubGroupId": 96,
    "nodeKey": "22124|s|6|g|33|sg|96",
    "keywords": [
      "wheel alignment",
      "wheel",
      "alignment"
    ]
  },
  {
    "id": "motor-sg-86",
    "label": "Sensors › Tire Pressure Monitor",
    "groupLabel": "Sensors",
    "motorSystemId": 6,
    "motorGroupId": 55,
    "motorSubGroupId": 86,
    "nodeKey": "22124|s|6|g|55|sg|86",
    "keywords": [
      "tire pressure monitor",
      "tire",
      "pressure",
      "monitor"
    ]
  },
  {
    "id": "motor-sg-86",
    "label": "Control Module › Tire Pressure Monitor",
    "groupLabel": "Control Module",
    "motorSystemId": 6,
    "motorGroupId": 58,
    "motorSubGroupId": 86,
    "nodeKey": "22124|s|6|g|58|sg|86",
    "keywords": [
      "tire pressure monitor",
      "tire",
      "pressure",
      "monitor"
    ]
  },
  {
    "id": "motor-sg-1",
    "label": "@ALL › @ALL",
    "groupLabel": "@ALL",
    "motorSystemId": 8,
    "motorGroupId": 1,
    "motorSubGroupId": 1,
    "nodeKey": "22124|s|8|g|1|sg|1",
    "keywords": [
      "@all",
      "@all"
    ]
  },
  {
    "id": "motor-sg-332",
    "label": "Universal Vehicle Operation › Universal Vehicle Operation",
    "groupLabel": "Universal Vehicle Operation",
    "motorSystemId": 8,
    "motorGroupId": 80,
    "motorSubGroupId": 332,
    "nodeKey": "22124|s|8|g|80|sg|332",
    "keywords": [
      "universal vehicle operation",
      "universal",
      "vehicle",
      "operation"
    ]
  }
] as Array<{
  id: string;
  label: string;
  groupLabel: string;
  motorSystemId: number;
  motorGroupId: number;
  motorSubGroupId: number;
  nodeKey: string;
  keywords: string[];
}>;

/** Legacy shop-library subcategoryId → MOTOR SubGroup shop id. */
export const LEGACY_SUBCATEGORY_TO_MOTOR: Record<string, string> = {
  "brakes-pads": "motor-sg-44",
  "brakes-rotors": "motor-sg-45",
  "brakes-calipers": "motor-sg-41",
  "suspension-struts": "motor-sg-81",
  "hvac-compressor": "motor-sg-51"
};

export const MOTOR_REFERENCE_COUNTS = {
  systems: 8,
  groups: 65,
  subgroups: 144,
} as const;
