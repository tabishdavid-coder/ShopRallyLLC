/**
 * Insert dummy customers for CRM load testing (default: 1000).
 * Tagged with "CRM Load Test" — re-running removes prior dummy rows first.
 *
 * Run: npx tsx scripts/seed-dummy-customers.ts
 *      npx tsx scripts/seed-dummy-customers.ts --count=500 --shop=shop_demo
 */
import { PrismaClient } from "../src/generated/prisma";
import { phoneDigitsKey } from "../src/lib/phone";
import { LEAD_SOURCES } from "../src/lib/options";
import { seedDummyRepairScenario } from "./seed-dummy-repair-scenario";

const prisma = new PrismaClient();

const DUMMY_TAG = "CRM Load Test";
const DEFAULT_SHOP_ID = "shop_demo";
const DEFAULT_COUNT = 1000;
const BATCH_SIZE = 100;

const FIRST_NAMES = [
  "James", "Maria", "Robert", "Linda", "Michael", "Patricia", "David", "Jennifer",
  "William", "Elizabeth", "Richard", "Barbara", "Joseph", "Susan", "Thomas", "Jessica",
  "Charles", "Sarah", "Christopher", "Karen", "Daniel", "Lisa", "Matthew", "Nancy",
  "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Steven", "Ashley",
  "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna", "Kenneth", "Michelle",
  "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah",
  "Ronald", "Stephanie", "Jason", "Rebecca", "Ryan", "Sharon", "Jacob", "Laura",
  "Gary", "Cynthia", "Nicholas", "Kathleen", "Eric", "Amy", "Jonathan", "Angela",
  "Stephen", "Shirley", "Larry", "Anna", "Justin", "Brenda", "Scott", "Pamela",
  "Brandon", "Emma", "Benjamin", "Nicole", "Samuel", "Helen", "Gregory", "Samantha",
  "Frank", "Katherine", "Alexander", "Christine", "Raymond", "Debra", "Patrick", "Rachel",
  "Jack", "Carolyn", "Dennis", "Janet", "Jerry", "Catherine", "Tyler", "Maria",
  "Aaron", "Heather", "Jose", "Diane", "Adam", "Ruth", "Nathan", "Julie",
  "Henry", "Olivia", "Douglas", "Joyce", "Zachary", "Virginia", "Peter", "Victoria",
  "Kyle", "Kelly", "Noah", "Lauren", "Ethan", "Christina", "Jeremy", "Joan",
  "Walter", "Evelyn", "Christian", "Judith", "Keith", "Megan", "Roger", "Andrea",
  "Terry", "Cheryl", "Gerald", "Hannah", "Harold", "Jacqueline", "Sean", "Martha",
  "Austin", "Gloria", "Carl", "Teresa", "Arthur", "Ann", "Lawrence", "Sara",
  "Dylan", "Madison", "Jesse", "Frances", "Jordan", "Kathryn", "Bryan", "Janice",
  "Billy", "Jean", "Joe", "Abigail", "Bruce", "Alice", "Gabriel", "Julia",
  "Logan", "Judy", "Albert", "Sophia", "Willie", "Grace", "Alan", "Denise",
  "Eugene", "Amber", "Russell", "Doris", "Vincent", "Marilyn", "Philip", "Danielle",
  "Bobby", "Beverly", "Johnny", "Isabella", "Bradley", "Theresa", "Roy", "Diana",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
  "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
  "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
  "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson",
  "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza",
  "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers",
  "Long", "Ross", "Foster", "Jimenez", "Powell", "Jenkins", "Perry", "Russell",
  "Sullivan", "Bell", "Coleman", "Butler", "Henderson", "Barnes", "Gonzales", "Fisher",
  "Vasquez", "Simmons", "Romero", "Jordan", "Patterson", "Alexander", "Hamilton", "Graham",
  "Reynolds", "Griffin", "Wallace", "Moreno", "West", "Cole", "Hayes", "Bryant",
  "Herrera", "Gibson", "Ellis", "Tran", "Medina", "Aguilar", "Stevens", "Murray",
  "Ford", "Castro", "Marshall", "Owens", "Harrison", "Fernandez", "McDonald", "Woods",
  "Washington", "Kennedy", "Wells", "Vargas", "Henry", "Chen", "Freeman", "Webb",
  "Tucker", "Guzman", "Burns", "Crawford", "Olson", "Simpson", "Porter", "Hunter",
  "Gordon", "Mendez", "Silva", "Shaw", "Snyder", "Mason", "Dixon", "Munoz",
  "Hunt", "Hicks", "Holmes", "Palmer", "Wagner", "Black", "Robertson", "Boyd",
  "Rose", "Stone", "Salazar", "Fox", "Warren", "Mills", "Meyer", "Rice",
  "Schmidt", "Garza", "Daniels", "Ferguson", "Nichols", "Stephens", "Soto", "Weaver",
  "Ryan", "Gardner", "Payne", "Grant", "Dunn", "Kelley", "Spencer", "Hawkins",
  "Arnold", "Pierce", "Vazquez", "Hansen", "Peters", "Santos", "Hart", "Bradley",
];

const CITIES = [
  { city: "Albany", state: "NY", zip: "12207" },
  { city: "Schenectady", state: "NY", zip: "12305" },
  { city: "Troy", state: "NY", zip: "12180" },
  { city: "Saratoga Springs", state: "NY", zip: "12866" },
  { city: "Clifton Park", state: "NY", zip: "12065" },
  { city: "Latham", state: "NY", zip: "12110" },
  { city: "Colonie", state: "NY", zip: "12205" },
  { city: "Guilderland", state: "NY", zip: "12084" },
  { city: "Ballston Spa", state: "NY", zip: "12020" },
  { city: "Glens Falls", state: "NY", zip: "12801" },
];

function parseArgs() {
  let count = DEFAULT_COUNT;
  let shopId = DEFAULT_SHOP_ID;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--count=")) count = Number(arg.slice(8)) || DEFAULT_COUNT;
    if (arg.startsWith("--shop=")) shopId = arg.slice(7) || DEFAULT_SHOP_ID;
  }
  return { count, shopId };
}

function formatPhone(n: number): string {
  const area = 518;
  const exchange = 200 + Math.floor(n / 10000);
  const line = n % 10000;
  return `(${area}) ${String(exchange).padStart(3, "0")}-${String(line).padStart(4, "0")}`;
}

function buildCustomer(shopId: string, index: number) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]!;
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!;
  const loc = CITIES[index % CITIES.length]!;
  const phone = formatPhone(10_000 + index);
  const email = `dummy.customer.${String(index + 1).padStart(4, "0")}@loadtest.rp.local`;
  const leadSource = LEAD_SOURCES[index % LEAD_SOURCES.length]!;
  const company = index % 17 === 0 ? `${lastName} Fleet Services` : null;

  return {
    shopId,
    firstName,
    lastName,
    company,
    email,
    phone,
    phoneDigits: phoneDigitsKey(phone),
    address: `${100 + (index % 900)} ${["Main", "Oak", "Maple", "Pine", "Elm"][index % 5]} St`,
    city: loc.city,
    state: loc.state,
    zip: loc.zip,
    tags: [DUMMY_TAG],
    leadSource,
    marketingOptIn: index % 3 === 0,
    notes: index % 25 === 0 ? "Load-test customer — safe to delete." : null,
  };
}

async function main() {
  const { count, shopId } = parseArgs();

  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, name: true } });
  if (!shop) {
    console.error(`Shop not found: ${shopId}. Run db:seed first or pass --shop=<id>.`);
    process.exit(1);
  }

  const removed = await prisma.customer.deleteMany({
    where: { shopId, tags: { has: DUMMY_TAG } },
  });

  console.log(`Shop: ${shop.name} (${shop.id})`);
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} prior "${DUMMY_TAG}" customers.`);
  }

  const started = Date.now();
  let inserted = 0;

  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, count - offset);
    const data = Array.from({ length: batchCount }, (_, i) => buildCustomer(shopId, offset + i));
    const result = await prisma.customer.createMany({ data });
    inserted += result.count;
    process.stdout.write(`\rInserted ${inserted}/${count}…`);
  }

  const total = await prisma.customer.count({ where: { shopId } });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\nDone — inserted ${inserted} dummy customers in ${elapsed}s.`);
  console.log(`Shop now has ${total} customers total.`);
  console.log(`Tag filter: "${DUMMY_TAG}" · sample email: dummy.customer.0001@loadtest.rp.local`);

  console.log("\nSeeding repair scenarios (vehicles, ROs, appointments)…");
  const repairResult = await seedDummyRepairScenario({
    shopId,
    roCount: Math.min(count, 350),
    cleanFirst: true,
  });
  void repairResult;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // Repair scenario uses its own prisma instance when imported
  });
