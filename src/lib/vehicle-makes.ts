// Static list of passenger-car makes for the Add-Vehicle drill-down. Bundled
// (not fetched) so the Make column is instant and immune to NHTSA rate limits.
// Models are still fetched on demand per make+year (with a free-text fallback).
export const CAR_MAKES: string[] = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick",
  "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Fisker",
  "Ford", "Genesis", "GMC", "Honda", "Hummer", "Hyundai", "Infiniti", "Jaguar",
  "Jeep", "Kia", "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Lotus",
  "Lucid", "Maserati", "Maybach", "Mazda", "McLaren", "Mercedes-Benz", "Mercury",
  "MINI", "Mitsubishi", "Nissan", "Oldsmobile", "Plymouth", "Polestar",
  "Pontiac", "Porsche", "RAM", "Rivian", "Rolls-Royce", "Saab", "Saturn",
  "Scion", "smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo",
];
