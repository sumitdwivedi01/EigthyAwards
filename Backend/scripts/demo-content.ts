/**
 * What the demo is made of (docs/DEMO.md): the companies and their applicants, four awards that
 * work differently, and every application with its answers. Pure data; scripts/demo-data.ts sends
 * it through the API. Companies, people and places are made up; emails use .example and
 * demo.test, so nothing can ever reach a real inbox.
 */

export type StateCode = string;

export interface OrgSpec {
  key: string;
  legalName: string;
  pan: string;
  gstin: string | null;
  addressLine: string;
  city: string;
  stateCode: StateCode;
  pincode: string;
  officialEmail: string;
  phone: string;
  type: string;
  website?: string;
}

export interface ApplicantSpec {
  email: string;
  name: string;
  phone: string;
  /** The company they register; a second applicant of the same company joins it instead. */
  org: string;
  joins?: boolean;
}

export type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "SINGLE_CHOICE" | "YES_NO" | "FILE_UPLOAD";

export interface QuestionSpec {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  maxFiles?: number;
  fileTypes?: ("pdf" | "jpg" | "png" | "docx" | "xlsx")[];
}

export interface SectionSpec {
  title: string;
  description: string;
  questions: QuestionSpec[];
}

export interface SheetSectionSpec {
  title: string;
  weight: number;
  indicators: { label: string; type: "SCORE" | "YES_NO"; weight: number; question: string }[];
}

export type AnswerValue = string | number | boolean;

export interface ApplicationSpec {
  applicant: string;
  category: string;
  /** How good the application is, 0 to 1: drives the jurors' marks. */
  strength: number;
  answers: Record<string, AnswerValue>;
  /** File questions: the names of the demo PDFs to upload. */
  files?: Record<string, string[]>;
  /** Left as a draft: no proof, not submitted. */
  draft?: boolean;
  /** A draft that still uploads its proof of employment (only the submit is missing). */
  withProof?: boolean;
}

export interface AwardSpec {
  key: "safety" | "fpo" | "energy" | "design";
  department: string;
  staff: string;
  head: string;
  name: string;
  slug: string;
  domain: string;
  description: string;
  edition: string;
  opensAt: string;
  /** "soon": a few minutes after the script starts, so the award can be judged at once. */
  deadline: "soon" | string;
  feePaise: number;
  blind: boolean;
  maxEntries: number | null;
  categories: { name: string; feePaise: number | null }[];
  juryMin: number;
  juryMax: number;
  sections: SectionSpec[];
  sheet: SheetSectionSpec[];
  applications: ApplicationSpec[];
}

// ── Companies ──

export const ORGS: OrgSpec[] = [
  // Industry
  { key: "acme", legalName: "Acme Steel Ltd", pan: "ABCDE1234F", gstin: "27ABCDE1234F1Z5", addressLine: "12 MIDC Road, Bhosari", city: "Pune", stateCode: "27", pincode: "411026", officialEmail: "office@acmesteel.example", phone: "020 2567 8901", type: "Public Limited Company", website: "https://www.acmesteel.example" },
  { key: "bharat", legalName: "Bharat Cement Works Limited", pan: "AABCB4821K", gstin: "08AABCB4821K1ZQ", addressLine: "Kota Road, Nimbahera", city: "Chittorgarh", stateCode: "08", pincode: "312601", officialEmail: "works@bharatcement.example", phone: "01477 220 410", type: "Public Limited Company" },
  { key: "coastal", legalName: "Coastal Chemicals Limited", pan: "AACCC7315M", gstin: "24AACCC7315M1Z2", addressLine: "Plot 41, GIDC Estate, Ankleshwar", city: "Bharuch", stateCode: "24", pincode: "393002", officialEmail: "info@coastalchem.example", phone: "02646 251 300", type: "Public Limited Company" },
  { key: "deccan", legalName: "Deccan Auto Components Private Limited", pan: "AADCD2290R", gstin: "29AADCD2290R1ZK", addressLine: "88 Bommasandra Industrial Area", city: "Bengaluru", stateCode: "29", pincode: "560099", officialEmail: "contact@deccanauto.example", phone: "080 2783 4400", type: "Private Limited Company", website: "https://www.deccanauto.example" },
  { key: "eastern", legalName: "Eastern Power Equipment Limited", pan: "AAECE6604P", gstin: "19AAECE6604P1Z9", addressLine: "Taratala Industrial Estate, Block B", city: "Kolkata", stateCode: "19", pincode: "700088", officialEmail: "corporate@easternpower.example", phone: "033 2401 7788", type: "Public Limited Company" },
  { key: "narmada", legalName: "Narmada Fertilisers Limited", pan: "AAFCN3317D", gstin: "24AAFCN3317D1ZT", addressLine: "Old Padra Road", city: "Vadodara", stateCode: "24", pincode: "390015", officialEmail: "plant@narmadafert.example", phone: "0265 233 9010", type: "Public Limited Company" },
  { key: "shivalik", legalName: "Shivalik Pharma Private Limited", pan: "AAGCS8841H", gstin: "02AAGCS8841H1ZC", addressLine: "Village Bhatoli Kalan, Baddi", city: "Solan", stateCode: "02", pincode: "173205", officialEmail: "ehs@shivalikpharma.example", phone: "01795 245 600", type: "Private Limited Company", website: "https://www.shivalikpharma.example" },
  { key: "konkan", legalName: "Konkan Paper Mills Limited", pan: "AAHCK5530L", gstin: "27AAHCK5530L1ZF", addressLine: "Lote Parshuram MIDC", city: "Ratnagiri", stateCode: "27", pincode: "415722", officialEmail: "mill@konkanpaper.example", phone: "02356 272 100", type: "Public Limited Company" },
  { key: "vindhya", legalName: "Vindhya Textiles Limited", pan: "AAJCV1928B", gstin: "23AAJCV1928B1ZN", addressLine: "Sanwer Road Industrial Area", city: "Indore", stateCode: "23", pincode: "452015", officialEmail: "mills@vindhyatex.example", phone: "0731 272 5500", type: "Public Limited Company" },
  { key: "godavari", legalName: "Godavari Sugars Limited", pan: "AAKCG4475E", gstin: "37AAKCG4475E1ZW", addressLine: "Dowleswaram Road", city: "Rajahmundry", stateCode: "37", pincode: "533125", officialEmail: "factory@godavarisugars.example", phone: "0883 241 8800", type: "Public Limited Company" },
  { key: "sunrise", legalName: "Sunrise Ceramics", pan: "AAMFS3360G", gstin: "24AAMFS3360G1ZP", addressLine: "8-A National Highway, Lalpar", city: "Morbi", stateCode: "24", pincode: "363642", officialEmail: "sales@sunriseceramics.example", phone: "02822 241 360", type: "Partnership Firm" },
  { key: "pioneer", legalName: "Pioneer Castings Private Limited", pan: "AANCP9902S", gstin: "03AANCP9902S1ZE", addressLine: "Focal Point, Phase 5", city: "Ludhiana", stateCode: "03", pincode: "141010", officialEmail: "foundry@pioneercastings.example", phone: "0161 267 1190", type: "Private Limited Company" },
  { key: "lotus", legalName: "Lotus Home Appliances Private Limited", pan: "AAPCL2217Q", gstin: "06AAPCL2217Q1ZD", addressLine: "Sector 37, Industrial Model Township", city: "Gurugram", stateCode: "06", pincode: "122001", officialEmail: "design@lotushome.example", phone: "0124 437 2200", type: "Private Limited Company", website: "https://www.lotushome.example" },
  { key: "nilgiri", legalName: "Nilgiri Ergonomics LLP", pan: "AAQFN6683C", gstin: "33AAQFN6683C1ZU", addressLine: "Avinashi Road, Peelamedu", city: "Coimbatore", stateCode: "33", pincode: "641004", officialEmail: "hello@nilgiriergo.example", phone: "0422 257 4410", type: "Limited Liability Partnership" },
  { key: "kaveri", legalName: "Kaveri Medical Devices Private Limited", pan: "AARCK7714N", gstin: "29AARCK7714N1ZH", addressLine: "Hebbal Industrial Area", city: "Mysuru", stateCode: "29", pincode: "570016", officialEmail: "info@kaverimed.example", phone: "0821 251 7700", type: "Private Limited Company" },
  { key: "arka", legalName: "Arka Robotics Private Limited", pan: "AASCA3051J", gstin: "36AASCA3051J1ZB", addressLine: "Plot 12, IDA Uppal", city: "Hyderabad", stateCode: "36", pincode: "500039", officialEmail: "team@arkarobotics.example", phone: "040 2720 1515", type: "Private Limited Company", website: "https://www.arkarobotics.example" },
  // Farmer producer organisations
  { key: "sahyadri", legalName: "Sahyadri Farmers Producer Company Limited", pan: "AATCS5126F", gstin: "27AATCS5126F1ZR", addressLine: "Market Yard, Narayangaon", city: "Junnar", stateCode: "27", pincode: "410504", officialEmail: "office@sahyadrifpc.example", phone: "02132 242 818", type: "Farmer Producer Organisation" },
  { key: "vidarbha", legalName: "Vidarbha Cotton Growers Producer Company Limited", pan: "AAUCV8837A", gstin: "27AAUCV8837A1ZX", addressLine: "Arni Road", city: "Yavatmal", stateCode: "27", pincode: "445001", officialEmail: "fpc@vidarbhacotton.example", phone: "07232 244 160", type: "Farmer Producer Organisation" },
  { key: "kutch", legalName: "Kutch Camel Milk Producer Company Limited", pan: "AAVCK2649M", gstin: null, addressLine: "Madhapar Highway", city: "Bhuj", stateCode: "24", pincode: "370020", officialEmail: "milk@kutchcamel.example", phone: "02832 230 455", type: "Farmer Producer Organisation" },
  { key: "mahila", legalName: "Mahila Kisan Agro Producer Company Limited", pan: "AAWCM4410K", gstin: "10AAWCM4410K1ZS", addressLine: "Kanti Road, Brahmpura", city: "Muzaffarpur", stateCode: "10", pincode: "842003", officialEmail: "sangathan@mahilakisan.example", phone: "0621 224 7731", type: "Farmer Producer Organisation" },
  { key: "malnad", legalName: "Malnad Spice Farmers Producer Company Limited", pan: "AAXCM9205D", gstin: "29AAXCM9205D1ZL", addressLine: "BM Road", city: "Sakleshpur", stateCode: "29", pincode: "573134", officialEmail: "spices@malnadfpc.example", phone: "08173 244 512", type: "Farmer Producer Organisation" },
  { key: "bundelkhand", legalName: "Bundelkhand Pulses Producer Company Limited", pan: "AAYCB1764H", gstin: "09AAYCB1764H1ZG", addressLine: "Gwalior Road, Mandi Parisar", city: "Jhansi", stateCode: "09", pincode: "284003", officialEmail: "dal@bundelkhandfpc.example", phone: "0510 233 0721", type: "Farmer Producer Organisation" },
  { key: "nashik", legalName: "Nashik Grape Growers Producer Company Limited", pan: "AAZCN6372P", gstin: "27AAZCN6372P1ZM", addressLine: "Dindori Road, Mhasrul", city: "Nashik", stateCode: "27", pincode: "422004", officialEmail: "export@nashikgrapes.example", phone: "0253 239 4410", type: "Farmer Producer Organisation", website: "https://www.nashikgrapes.example" },
  { key: "thar", legalName: "Thar Organic Producer Company Limited", pan: "ABACT3398E", gstin: null, addressLine: "Station Road", city: "Barmer", stateCode: "08", pincode: "344001", officialEmail: "organic@tharfpc.example", phone: "02982 221 645", type: "Farmer Producer Organisation" },
  { key: "sundarbans", legalName: "Sundarbans Honey Collectors Producer Company Limited", pan: "ABBCS5501R", gstin: "19ABBCS5501R1ZY", addressLine: "Hingalganj Road", city: "Basirhat", stateCode: "19", pincode: "743411", officialEmail: "madhu@sundarbanshoney.example", phone: "03217 265 140", type: "Farmer Producer Organisation" },
  { key: "kashi", legalName: "Kashi Vegetable Growers Producer Company Limited", pan: "ABCCK8126T", gstin: "09ABCCK8126T1ZA", addressLine: "Pahariya Mandi", city: "Varanasi", stateCode: "09", pincode: "221007", officialEmail: "sabzi@kashifpc.example", phone: "0542 258 6612", type: "Farmer Producer Organisation" },
  { key: "himalayan", legalName: "Himalayan Hill Fruits Producer Company Limited", pan: "ABDCH2947N", gstin: "05ABDCH2947N1ZJ", addressLine: "Mall Road", city: "Almora", stateCode: "05", pincode: "263601", officialEmail: "fruits@hillfruitsfpc.example", phone: "05962 230 118", type: "Farmer Producer Organisation" },
  { key: "krishna", legalName: "Krishna Delta Rice Producer Company Limited", pan: "ABECK4483W", gstin: "37ABECK4483W1ZV", addressLine: "Bandar Road", city: "Machilipatnam", stateCode: "37", pincode: "521001", officialEmail: "rice@krishnadelta.example", phone: "08672 225 409", type: "Farmer Producer Organisation" },
];

// ── Applicants: one per company (Anita joins Sahyadri, where Ganesh already started) ──

export const APPLICANTS: ApplicantSpec[] = [
  { email: "applicant.kiran@demo.test", name: "Kiran Desai", phone: "98220 41187", org: "acme" },
  { email: "applicant.rahul@demo.test", name: "Rahul Verma", phone: "94140 22653", org: "bharat" },
  { email: "applicant.deepa@demo.test", name: "Deepa Kulkarni", phone: "98250 73316", org: "coastal" },
  { email: "applicant.suresh@demo.test", name: "Suresh Hegde", phone: "98450 11872", org: "deccan" },
  { email: "applicant.arindam@demo.test", name: "Arindam Sen", phone: "98300 64428", org: "eastern" },
  { email: "applicant.hetal@demo.test", name: "Hetal Shah", phone: "98251 90043", org: "narmada" },
  { email: "applicant.manpreet@demo.test", name: "Manpreet Kaur", phone: "98160 25571", org: "shivalik" },
  { email: "applicant.prakash@demo.test", name: "Prakash Sawant", phone: "94220 58810", org: "konkan" },
  { email: "applicant.ritu@demo.test", name: "Ritu Agrawal", phone: "98260 47702", org: "vindhya" },
  { email: "applicant.venkat@demo.test", name: "Venkat Reddy", phone: "98490 31166", org: "godavari" },
  { email: "applicant.jignesh@demo.test", name: "Jignesh Patel", phone: "98795 20934", org: "sunrise" },
  { email: "applicant.harpreet@demo.test", name: "Harpreet Singh", phone: "98140 66275", org: "pioneer" },
  { email: "applicant.neeraj@demo.test", name: "Neeraj Arora", phone: "98110 58842", org: "lotus" },
  { email: "applicant.lakshmanan@demo.test", name: "Lakshmanan Subramaniam", phone: "94430 12087", org: "nilgiri" },
  { email: "applicant.shruthi@demo.test", name: "Shruthi Rao", phone: "98860 70315", org: "kaveri" },
  { email: "applicant.farah@demo.test", name: "Farah Siddiqui", phone: "98490 85527", org: "arka" },
  { email: "applicant.ganesh@demo.test", name: "Ganesh Pawar", phone: "94230 77461", org: "sahyadri" },
  { email: "applicant.anita@demo.test", name: "Anita Jadhav", phone: "94220 38196", org: "sahyadri", joins: true },
  { email: "applicant.vinod@demo.test", name: "Vinod Thakre", phone: "94225 61740", org: "vidarbha" },
  { email: "applicant.ramesh@demo.test", name: "Ramesh Rabari", phone: "94263 18027", org: "kutch" },
  { email: "applicant.sunaina@demo.test", name: "Sunaina Kumari", phone: "94310 52268", org: "mahila" },
  { email: "applicant.mohan@demo.test", name: "Mohan Gowda", phone: "94481 36605", org: "malnad" },
  { email: "applicant.rajendra@demo.test", name: "Rajendra Yadav", phone: "94150 49983", org: "bundelkhand" },
  { email: "applicant.swati@demo.test", name: "Swati Deshmukh", phone: "98221 70546", org: "nashik" },
  { email: "applicant.bhanwar@demo.test", name: "Bhanwar Lal", phone: "94141 87230", org: "thar" },
  { email: "applicant.mitali@demo.test", name: "Mitali Mondal", phone: "94330 21659", org: "sundarbans" },
  { email: "applicant.ashok@demo.test", name: "Ashok Maurya", phone: "94155 30418", org: "kashi" },
  { email: "applicant.deepak@demo.test", name: "Deepak Bisht", phone: "94120 64391", org: "himalayan" },
  { email: "applicant.srinivas@demo.test", name: "Srinivas Rao", phone: "94402 17763", org: "krishna" },
];

// ── Award A: Safety Excellence, blind, with a fee; judged and published ──

const safety: AwardSpec = {
  key: "safety",
  department: "Safety, Health and Environment",
  staff: "staff.asha@demo.test",
  head: "head.she@demo.test",
  name: "Safety Excellence Award",
  slug: "safety-excellence",
  domain: "Safety",
  description:
    "Recognises manufacturing sites that keep their people safe: visible leadership, training that reaches everyone, and incidents that are investigated and learnt from. Judged blind on the written answers.",
  edition: "2026",
  opensAt: "2026-08-01T09:00:00+05:30",
  deadline: "soon",
  feePaise: 1_000_000,
  blind: true,
  maxEntries: null,
  categories: [{ name: "Manufacturing sites", feePaise: null }],
  juryMin: 2,
  juryMax: 3,
  sections: [
    {
      title: "Safety leadership",
      description: "How the site's management leads on safety. Please don't name your company or its people: this award is judged blind.",
      questions: [
        { id: "lead", type: "LONG_TEXT", label: "How does senior management lead on safety at the site?", help: "For example: site walks, safety meetings, how safety targets are set." },
        { id: "lti", type: "NUMBER", label: "Lost-time injuries in the last 12 months", min: 0, max: 1000 },
        { id: "iso", type: "YES_NO", label: "Is the site certified to ISO 45001?" },
      ],
    },
    {
      title: "Training and people",
      description: "",
      questions: [
        { id: "training", type: "LONG_TEXT", label: "Describe your safety training programme.", help: "Who is trained, how often, and how you check that it worked." },
        { id: "trained", type: "NUMBER", label: "Share of workers trained in the last 12 months (%)", min: 0, max: 100 },
      ],
    },
    {
      title: "Incidents and improvement",
      description: "",
      questions: [
        { id: "investigate", type: "LONG_TEXT", label: "How are incidents and near-misses reported and investigated?" },
        { id: "improvement", type: "LONG_TEXT", label: "Describe one safety improvement from the last year and its measured result." },
      ],
    },
  ],
  sheet: [
    { title: "Safety leadership", weight: 30, indicators: [
      { label: "Senior management's commitment", type: "SCORE", weight: 70, question: "lead" },
      { label: "ISO 45001 certification", type: "YES_NO", weight: 30, question: "iso" },
    ] },
    { title: "Training and people", weight: 30, indicators: [
      { label: "Quality of the training programme", type: "SCORE", weight: 60, question: "training" },
      { label: "Coverage of the workforce", type: "SCORE", weight: 40, question: "trained" },
    ] },
    { title: "Incidents and improvement", weight: 40, indicators: [
      { label: "Reporting and investigation", type: "SCORE", weight: 50, question: "investigate" },
      { label: "Improvement and its result", type: "SCORE", weight: 50, question: "improvement" },
    ] },
  ],
  applications: [
    { applicant: "applicant.manpreet@demo.test", category: "Manufacturing sites", strength: 0.92, answers: {
      lead: "The plant head chairs a 20-minute safety meeting every morning and walks one production block each day with the shift in charge. Every manager's yearly targets include two leading safety indicators, and near-miss reports are read out at the monthly town hall.",
      lti: 0, iso: true,
      training: "Every new joiner, including contract workers, spends two days on induction before entering the floor. Refreshers run every six months, and each module ends with a practical test on the line, not a written quiz. Supervisors are assessed on the results of their teams.",
      trained: 98,
      investigate: "Anyone can report a near-miss on a tablet at each gate, by name or anonymously. Each one gets a reply within 48 hours. Incidents are investigated with a 5-why analysis by a cross-functional team, and the actions are tracked until they close.",
      improvement: "We moved solvent transfer from open drums to a closed pumping system. Spills fell from 14 to 1 in a year, and the solvent smell complaints in the packing hall stopped completely.",
    } },
    { applicant: "applicant.kiran@demo.test", category: "Manufacturing sites", strength: 0.84, answers: {
      lead: "Safety is the first item of every management meeting, and the managing director reviews the safety dashboard weekly. Department heads do a monthly cross-audit of another department's area.",
      lti: 1, iso: true,
      training: "We train all 1,200 workers in hot work, working at height and lock-out tag-out. A training simulator for crane operators was added this year, and contract workers get the same training as our own staff.",
      trained: 92,
      investigate: "Near-misses are logged on the shop floor in a shared register and reviewed every Friday. Serious incidents go to a committee within 24 hours, with a written root-cause report shared with all sites.",
      improvement: "Lock-out tag-out kits at every rolling-mill stand cut maintenance injuries from 6 to 1 this year.",
    } },
    { applicant: "applicant.suresh@demo.test", category: "Manufacturing sites", strength: 0.78, answers: {
      lead: "Our plant manager runs a 'safety hour' every Wednesday where any worker can raise a concern directly. Safety performance is part of every manager's appraisal.",
      lti: 2, iso: true,
      training: "Machine-specific training is given at each press line before an operator works alone. We video short how-to clips in Kannada and English and show them on screens at the canteen.",
      trained: 88,
      investigate: "Workers report near-misses on a printed card dropped in a box at each line; a safety officer collects them daily. Investigations follow a fixed template and actions are reviewed in the monthly safety committee.",
      improvement: "Light curtains on all 42 power presses. Hand injuries fell from 5 to 0 in the following ten months.",
    } },
    { applicant: "applicant.arindam@demo.test", category: "Manufacturing sites", strength: 0.7, answers: {
      lead: "The leadership team sets a yearly safety plan and reviews it every quarter. The works manager visits the shop floor twice a week.",
      lti: 3, iso: false,
      training: "Training is given on joining and repeated every year for electrical safety, which is our biggest risk. We started a buddy system that pairs new electricians with experienced ones for three months.",
      trained: 81,
      investigate: "Incidents are reported to the safety officer, who investigates with the supervisor. Near-miss reporting is still low, and we are working on building trust so that people report more.",
      improvement: "Arc-flash protective suits and a permit system for live panels. There has been no electrical injury in nine months, against three the year before.",
    } },
    { applicant: "applicant.rahul@demo.test", category: "Manufacturing sites", strength: 0.62, answers: {
      lead: "Safety targets are set at the head office and shared with the plant. The plant head chairs the monthly safety committee.",
      lti: 4, iso: true,
      training: "Classroom training is held for all departments each year, and the kiln team gets extra training on hot material handling.",
      trained: 74,
      investigate: "Incidents are recorded in the ERP system and investigated by the safety department. We review the trend every quarter.",
      improvement: "Guard rails along the clinker conveyor walkway. Slips and trips in that area fell from 7 to 3.",
    } },
    { applicant: "applicant.hetal@demo.test", category: "Manufacturing sites", strength: 0.55, answers: {
      lead: "Senior management signs the safety policy every year and attends the annual safety week.",
      lti: 5, iso: false,
      training: "We run a yearly training calendar covering chemical handling, fire fighting and first aid. Attendance has improved this year but shift workers are still hard to reach.",
      trained: 66,
      investigate: "Incidents are investigated by the area in-charge and the safety officer. We have started to record near-misses in a register this year.",
      improvement: "Ammonia leak detectors with alarms at both storage tanks. We had two small leaks this year; both were caught within minutes.",
    } },
    { applicant: "applicant.deepa@demo.test", category: "Manufacturing sites", strength: 0.5, answers: {
      lead: "The plant head reviews safety statistics every month with the department heads.",
      lti: 6, iso: false,
      training: "Training is given to all permanent staff once a year. Contract workers get a safety briefing on their first day.",
      trained: 60,
      investigate: "Major incidents are investigated by a committee. Minor ones are handled by supervisors.",
      improvement: "New eye-wash stations in all three reactor bays.",
    } },
  ],
};

// ── Award B: FPO Excellence, external organiser, free, four categories, limit 500; open now ──

const fpo: AwardSpec = {
  key: "fpo",
  department: "FPO Awards team",
  staff: "staff.ravi@demo.test",
  head: "head.fpo@demo.test",
  name: "FPO Excellence Awards",
  slug: "fpo-excellence",
  domain: "Agriculture and Farmer Producer Organisations",
  description:
    "Celebrates farmer producer organisations that raise their members' incomes: through better prices, shared inputs, processing and technology. Open to FPOs of every size, with a category for women-led FPOs.",
  edition: "2026",
  opensAt: "2026-10-01T09:00:00+05:30",
  deadline: "2026-11-30T23:59:00+05:30",
  feePaise: 0,
  blind: false,
  maxEntries: 500,
  categories: [
    { name: "Small FPO (under 500 members)", feePaise: null },
    { name: "Large FPO (500 members or more)", feePaise: null },
    { name: "Women-led FPO", feePaise: null },
    { name: "Best use of technology", feePaise: null },
  ],
  juryMin: 1,
  juryMax: 1,
  sections: [
    {
      title: "About the FPO",
      description: "Tell us who your members are and what the FPO does.",
      questions: [
        { id: "members", type: "NUMBER", label: "Number of farmer members", min: 10, max: 100000 },
        { id: "women", type: "NUMBER", label: "Share of women members (%)", min: 0, max: 100 },
        { id: "activity", type: "SINGLE_CHOICE", label: "Main activity", options: ["Aggregation and marketing of produce", "Input supply (seeds, fertiliser)", "Processing and value addition", "Exports"] },
        { id: "crops", type: "SHORT_TEXT", label: "Main crops or products" },
        { id: "certificate", type: "FILE_UPLOAD", label: "Certificate of registration", fileTypes: ["pdf", "jpg", "png"], maxFiles: 1 },
      ],
    },
    {
      title: "Impact",
      description: "What changed for your members this year.",
      questions: [
        { id: "income", type: "LONG_TEXT", label: "How did the FPO raise its members' income this year?", help: "Give numbers where you can: prices, costs saved, new buyers." },
        { id: "turnover", type: "NUMBER", label: "Turnover in the last financial year (₹ lakh)", min: 0, max: 100000 },
        { id: "evidence", type: "FILE_UPLOAD", label: "Evidence of impact", help: "Sales records, photos or a short report.", required: false, fileTypes: ["pdf", "jpg", "png", "xlsx"], maxFiles: 3 },
      ],
    },
  ],
  sheet: [
    { title: "Reach and inclusion", weight: 30, indicators: [
      { label: "Membership", type: "SCORE", weight: 50, question: "members" },
      { label: "Women's participation", type: "SCORE", weight: 50, question: "women" },
    ] },
    { title: "Impact", weight: 70, indicators: [
      { label: "Income gain for members", type: "SCORE", weight: 60, question: "income" },
      { label: "Business scale", type: "SCORE", weight: 25, question: "turnover" },
      { label: "Strength of the evidence", type: "SCORE", weight: 15, question: "evidence" },
    ] },
  ],
  applications: [
    { applicant: "applicant.vinod@demo.test", category: "Large FPO (500 members or more)", strength: 0.8, answers: {
      members: 2140, women: 22, activity: "Aggregation and marketing of produce", crops: "Cotton, soybean, pigeon pea",
      income: "We sold 1,900 tonnes of cotton directly to two spinning mills instead of through traders, which raised members' prices by ₹420 a quintal. A shared ginning contract saved another ₹150 a quintal.",
      turnover: 1860,
    }, files: { certificate: ["registration-certificate.pdf"], evidence: ["mill-sales-2025-26.pdf"] } },
    { applicant: "applicant.ramesh@demo.test", category: "Small FPO (under 500 members)", strength: 0.75, answers: {
      members: 310, women: 35, activity: "Processing and value addition", crops: "Camel milk, chocolate and cheese",
      income: "A small chilling plant lets herders sell camel milk twice a day. We now make camel-milk chocolate with a dairy partner, and herders earn ₹65 a litre against ₹25 two years ago.",
      turnover: 240,
    }, files: { certificate: ["registration-certificate.pdf"] } },
    { applicant: "applicant.sunaina@demo.test", category: "Women-led FPO", strength: 0.85, answers: {
      members: 1180, women: 100, activity: "Processing and value addition", crops: "Litchi, honey, makhana",
      income: "Members process litchi into pulp and squash at a common facility instead of selling fresh fruit at harvest prices. Average yearly income per member rose from ₹38,000 to ₹61,000.",
      turnover: 520,
    }, files: { certificate: ["registration-certificate.pdf"], evidence: ["impact-report.pdf"] } },
    { applicant: "applicant.mohan@demo.test", category: "Small FPO (under 500 members)", strength: 0.65, answers: {
      members: 420, women: 18, activity: "Aggregation and marketing of produce", crops: "Cardamom, pepper, coffee",
      income: "Grading cardamom before auction got members 12% higher prices. We also buy fertiliser in bulk and pass on a 9% saving.",
      turnover: 690,
    }, files: { certificate: ["registration-certificate.pdf"] } },
    { applicant: "applicant.rajendra@demo.test", category: "Large FPO (500 members or more)", strength: 0.6, answers: {
      members: 1560, women: 12, activity: "Input supply (seeds, fertiliser)", crops: "Chickpea, lentil, mustard",
      income: "Certified seed from our own seed farm raised chickpea yields by about 18%. We started a small dal mill this year.",
      turnover: 980,
    }, files: { certificate: ["registration-certificate.pdf"] } },
    { applicant: "applicant.swati@demo.test", category: "Best use of technology", strength: 0.9, answers: {
      members: 860, women: 30, activity: "Exports", crops: "Table grapes, raisins",
      income: "Soil-moisture sensors and a WhatsApp advisory cut water use by a quarter. Residue testing and traceability opened two European buyers: export grapes fetched ₹28 more a kilogram.",
      turnover: 4120,
    }, files: { certificate: ["registration-certificate.pdf"], evidence: ["export-records.pdf", "sensor-pilot-results.pdf"] } },
    { applicant: "applicant.bhanwar@demo.test", category: "Small FPO (under 500 members)", strength: 0.55, answers: {
      members: 280, women: 25, activity: "Aggregation and marketing of produce", crops: "Organic cumin, guar, millet",
      income: "Organic certification for 180 members' fields. The first organic cumin crop sold at a 20% premium.",
      turnover: 150,
    }, files: { certificate: ["registration-certificate.pdf"] } },
    { applicant: "applicant.mitali@demo.test", category: "Women-led FPO", strength: 0.7, answers: {
      members: 640, women: 92, activity: "Processing and value addition", crops: "Wild honey, mangrove honey, beeswax",
      income: "A honey processing and testing unit means members' honey meets food-safety standards; city buyers now pay ₹380 a kilogram against ₹150 from local traders.",
      turnover: 310,
    }, files: { certificate: ["registration-certificate.pdf"], evidence: ["honey-lab-reports.pdf"] } },
    // Drafts: Ganesh started Sahyadri's (so his colleague Anita is blocked); two more are half done.
    { applicant: "applicant.ganesh@demo.test", category: "Large FPO (500 members or more)", strength: 0.7, draft: true, answers: {
      members: 1320, women: 28, crops: "Tomato, onion, pomegranate",
    } },
    { applicant: "applicant.ashok@demo.test", category: "Small FPO (under 500 members)", strength: 0.5, draft: true, answers: {
      members: 360, activity: "Aggregation and marketing of produce",
    } },
    { applicant: "applicant.deepak@demo.test", category: "Best use of technology", strength: 0.6, draft: true, withProof: false, answers: {
      members: 540, women: 41, activity: "Processing and value addition", crops: "Apple, apricot, plum",
      income: "Solar dryers and a cold room let members sell dried apricots through the year.",
      turnover: 205,
    }, files: { certificate: ["registration-certificate.pdf"] } },
  ],
};

// ── Award C: Energy Efficiency, two jurors, category fees; closed and ready to judge live ──

const energy: AwardSpec = {
  key: "energy",
  department: "Energy and Climate",
  staff: "staff.imran@demo.test",
  head: "head.energy@demo.test",
  name: "National Energy Efficiency Award",
  slug: "energy-efficiency",
  domain: "Energy",
  description: "For industries that cut the energy they use per unit of output, through projects, management systems and renewable power.",
  edition: "2026",
  opensAt: "2026-09-01T09:00:00+05:30",
  deadline: "soon",
  feePaise: 500_000,
  blind: false,
  maxEntries: null,
  categories: [
    { name: "Large industry", feePaise: null },
    { name: "MSME", feePaise: 100_000 },
  ],
  juryMin: 2,
  juryMax: 2,
  sections: [
    {
      title: "Energy performance",
      description: "Results of the last financial year.",
      questions: [
        { id: "sec", type: "NUMBER", label: "Reduction in specific energy consumption this year (%)", min: 0, max: 100 },
        { id: "projects", type: "LONG_TEXT", label: "Describe your main energy-saving projects and what they saved." },
        { id: "audit", type: "FILE_UPLOAD", label: "Latest energy audit report", fileTypes: ["pdf"], maxFiles: 1 },
      ],
    },
    {
      title: "Energy management",
      description: "",
      questions: [
        { id: "enms", type: "YES_NO", label: "Is the site's energy management system certified to ISO 50001?" },
        { id: "targets", type: "LONG_TEXT", label: "How are energy targets set, tracked and reviewed?" },
        { id: "renewable", type: "NUMBER", label: "Share of electricity from renewable sources (%)", min: 0, max: 100, required: false },
      ],
    },
  ],
  sheet: [
    { title: "Energy performance", weight: 60, indicators: [
      { label: "Reduction achieved", type: "SCORE", weight: 40, question: "sec" },
      { label: "Quality of the projects", type: "SCORE", weight: 60, question: "projects" },
    ] },
    { title: "Energy management", weight: 40, indicators: [
      { label: "ISO 50001 certification", type: "YES_NO", weight: 30, question: "enms" },
      { label: "Target setting and review", type: "SCORE", weight: 50, question: "targets" },
      { label: "Renewable share", type: "SCORE", weight: 20, question: "renewable" },
    ] },
  ],
  applications: [
    { applicant: "applicant.kiran@demo.test", category: "Large industry", strength: 0.8, answers: {
      sec: 9.5, enms: true, renewable: 34,
      projects: "Waste-heat recovery on the reheating furnaces now preheats combustion air, saving 11% of furnace fuel. Variable-speed drives on 40 cooling-water pumps saved 2.1 million kWh a year.",
      targets: "Targets per tonne of steel are set each April from the previous year's best month. An energy cell reviews meter data daily and the board sees the trend every quarter.",
    }, files: { audit: ["energy-audit-2026.pdf"] } },
    { applicant: "applicant.suresh@demo.test", category: "Large industry", strength: 0.7, answers: {
      sec: 7, enms: true, renewable: 48,
      projects: "We replaced 18 old compressors with two centralised screw compressors and fixed 300 air leaks found in an ultrasonic survey: compressed air now uses 27% less power.",
      targets: "Each machine shop has a monthly kWh-per-part target shown on a screen at the line. Misses are discussed in the morning meeting.",
    }, files: { audit: ["energy-audit-2026.pdf"] } },
    { applicant: "applicant.prakash@demo.test", category: "Large industry", strength: 0.6, answers: {
      sec: 6, enms: false, renewable: 52,
      projects: "A new black-liquor evaporator and a condensate return system cut steam use per tonne of paper by 8%.",
      targets: "Targets are set in the annual budget. The utilities manager reports monthly.",
    }, files: { audit: ["energy-audit-2026.pdf"] } },
    { applicant: "applicant.ritu@demo.test", category: "Large industry", strength: 0.65, answers: {
      sec: 6.5, enms: true, renewable: 20,
      projects: "LED lighting across the spinning halls and humidification plants on variable-frequency drives saved 1.4 million kWh.",
      targets: "Department-wise targets are reviewed in a monthly energy meeting chaired by the works director.",
    }, files: { audit: ["energy-audit-2026.pdf"] } },
    { applicant: "applicant.venkat@demo.test", category: "Large industry", strength: 0.55, answers: {
      sec: 5, enms: false, renewable: 70,
      projects: "A new high-pressure boiler lets the cogeneration plant export 6 MW more power to the grid in the crushing season.",
      targets: "Targets for steam per tonne of cane are set before each season.",
    }, files: { audit: ["energy-audit-2026.pdf"] } },
    { applicant: "applicant.jignesh@demo.test", category: "MSME", strength: 0.75, answers: {
      sec: 12, enms: false, renewable: 25,
      projects: "We switched the tunnel kiln from coal gas to natural gas and added a recuperator: fuel per square metre of tile fell by 14%.",
      targets: "The partners review the gas bill against output every month and set the next month's target.",
    }, files: { audit: ["energy-audit-2026.pdf"] } },
    // Started, paid and partly filled, never submitted: Not submitted after the deadline.
    { applicant: "applicant.harpreet@demo.test", category: "MSME", strength: 0.5, draft: true, answers: {
      sec: 4,
      projects: "An induction furnace replaced the old cupola.",
    } },
  ],
};

// ── Award D: Design Excellence, two jurors; scored and waiting for the head's approval ──

const design: AwardSpec = {
  key: "design",
  department: "Design and Innovation",
  staff: "staff.karan@demo.test",
  head: "head.design@demo.test",
  name: "Design Excellence Award",
  slug: "design-excellence",
  domain: "Design",
  description: "Recognises products and processes designed in India that solve a real problem well, for users and for the business.",
  edition: "2026",
  opensAt: "2026-09-15T09:00:00+05:30",
  deadline: "soon",
  feePaise: 0,
  blind: false,
  maxEntries: null,
  categories: [
    { name: "Product design", feePaise: null },
    { name: "Process innovation", feePaise: null },
  ],
  juryMin: 2,
  juryMax: 2,
  sections: [
    {
      title: "The design",
      description: "",
      questions: [
        { id: "product", type: "SHORT_TEXT", label: "Name of the product or process" },
        { id: "problem", type: "LONG_TEXT", label: "What problem does it solve, and for whom?" },
        { id: "drawings", type: "FILE_UPLOAD", label: "Drawings, photos or a short presentation", fileTypes: ["pdf", "jpg", "png"], maxFiles: 3 },
      ],
    },
    {
      title: "Results",
      description: "",
      questions: [
        { id: "results", type: "LONG_TEXT", label: "What changed for users or for the business?" },
        { id: "units", type: "NUMBER", label: "Units sold or sites using it in the last 12 months", min: 0, max: 10000000 },
        { id: "patent", type: "YES_NO", label: "Is the design protected by a patent or a registered design?" },
      ],
    },
  ],
  sheet: [
    { title: "Insight and originality", weight: 40, indicators: [
      { label: "The problem and the insight", type: "SCORE", weight: 70, question: "problem" },
      { label: "Protection of the design", type: "YES_NO", weight: 30, question: "patent" },
    ] },
    { title: "Impact", weight: 60, indicators: [
      { label: "Results for users", type: "SCORE", weight: 70, question: "results" },
      { label: "Scale", type: "SCORE", weight: 30, question: "units" },
    ] },
  ],
  applications: [
    { applicant: "applicant.shruthi@demo.test", category: "Product design", strength: 0.88, answers: {
      product: "Saans neonatal breathing support", patent: true, units: 1400,
      problem: "Small district hospitals can't afford ventilators for premature babies. Saans gives breathing support without mains power or piped oxygen, so it works in an ambulance or during a power cut.",
      results: "Used in 1,400 facilities across 9 states. Hospitals report fewer referrals of newborns to city hospitals, and nurses learn it in one hour.",
    }, files: { drawings: ["product-photos.pdf"] } },
    { applicant: "applicant.lakshmanan@demo.test", category: "Product design", strength: 0.8, answers: {
      product: "Tailor's chair with adjustable lumbar support", patent: true, units: 9200,
      problem: "Garment workers sit 9 hours a day on stools with no back. Our chair adjusts to each worker in seconds and costs less than a day's production lost to back pain.",
      results: "Factories using it report 30% fewer back-pain complaints at their clinics after six months.",
    }, files: { drawings: ["chair-drawings.pdf", "factory-photos.pdf"] } },
    { applicant: "applicant.neeraj@demo.test", category: "Product design", strength: 0.68, answers: {
      product: "Low-water front-loading washing machine", patent: false, units: 26000,
      problem: "Homes in water-scarce cities store water in tanks. The machine reuses rinse water for the next wash's first cycle.",
      results: "Uses 38 litres a wash against 70 for our older model; it became our second best-selling machine.",
    }, files: { drawings: ["design-brief.pdf"] } },
    { applicant: "applicant.farah@demo.test", category: "Process innovation", strength: 0.78, answers: {
      product: "Vision-guided weld inspection cell", patent: true, units: 12,
      problem: "Manual weld inspection on two-wheeler frames missed one bad weld in fifty. A camera cell checks every weld in four seconds.",
      results: "Installed at 12 plants; field returns for weld faults fell by 70% at the first customer.",
    }, files: { drawings: ["cell-layout.pdf"] } },
    { applicant: "applicant.suresh@demo.test", category: "Process innovation", strength: 0.62, answers: {
      product: "Quick die change for 400-tonne presses", patent: false, units: 4,
      problem: "Die changes took 90 minutes, so we ran long batches and held large stocks.",
      results: "Die changes now take 14 minutes; batch sizes and stock fell by half on four press lines.",
    }, files: { drawings: ["smed-study.pdf"] } },
  ],
};

export const AWARDS: AwardSpec[] = [safety, energy, design, fpo];

// ── Judging plans ──

/** Safety: jurors per application (Vikram is never given Eastern Power: a conflict is recorded first). */
export const SAFETY_PLAN = {
  rejectProof: { applicant: "applicant.deepa@demo.test", note: "The photo ID on the profile shows a different company's name. Please upload an ID card or a letter from Coastal Chemicals." },
  conflict: { juror: "jury.vikram@demo.test", org: "eastern", note: "Advised the company on its safety audit in 2025." },
  assignments: {
    "applicant.manpreet@demo.test": ["jury.anil@demo.test", "jury.priya@demo.test", "jury.nandini@demo.test"],
    "applicant.kiran@demo.test": ["jury.anil@demo.test", "jury.priya@demo.test"],
    "applicant.suresh@demo.test": ["jury.priya@demo.test", "jury.vikram@demo.test"],
    "applicant.arindam@demo.test": ["jury.anil@demo.test", "jury.nandini@demo.test"],
    "applicant.rahul@demo.test": ["jury.anil@demo.test", "jury.vikram@demo.test", "jury.priya@demo.test"],
    "applicant.hetal@demo.test": ["jury.vikram@demo.test", "jury.nandini@demo.test"],
  } as Record<string, string[]>,
  correction: { applicant: "applicant.hetal@demo.test", juror: "jury.vikram@demo.test", indicator: "Reporting and investigation", reason: "The juror confirmed by phone that the mark was a typing slip." },
  approvalRemark: "Careful, consistent judging; the correction is explained. Approved.",
  shortlist: 3,
};

/** Design: two jurors each; scored and sent to the head, who approves live. */
export const DESIGN_PLAN = {
  assignments: {
    "applicant.shruthi@demo.test": ["jury.aditi@demo.test", "jury.manoj@demo.test"],
    "applicant.lakshmanan@demo.test": ["jury.aditi@demo.test", "jury.priya@demo.test"],
    "applicant.neeraj@demo.test": ["jury.manoj@demo.test", "jury.priya@demo.test"],
    "applicant.farah@demo.test": ["jury.aditi@demo.test", "jury.manoj@demo.test"],
    "applicant.suresh@demo.test": ["jury.manoj@demo.test", "jury.priya@demo.test"],
  } as Record<string, string[]>,
};

/** Energy: four proofs verified, two left for staff to check live; nothing assigned. */
export const ENERGY_PLAN = {
  verify: ["applicant.kiran@demo.test", "applicant.suresh@demo.test", "applicant.prakash@demo.test", "applicant.ritu@demo.test"],
};

/** FPO (open): a few proofs already checked, one rejected so the applicant can fix it. */
export const FPO_PLAN = {
  verify: ["applicant.vinod@demo.test", "applicant.ramesh@demo.test", "applicant.sunaina@demo.test", "applicant.swati@demo.test"],
  reject: { applicant: "applicant.bhanwar@demo.test", note: "The proof of employment is a visiting card. Please upload a letter on the FPO's letterhead or an ID card, dated in the last three months." },
};

/** What a juror writes, by how good they found the application. */
export const NOTES: Record<"high" | "good" | "fair" | "low", string[]> = {
  high: [
    "An outstanding entry: clear evidence, measured results and a strong culture behind them.",
    "Very convincing. The numbers support every claim, and the approach could be copied by others.",
    "Among the best I have read this year: strong leadership and results that are measured, not assumed.",
  ],
  good: [
    "A solid entry with real results. More detail on how progress is measured would make it stronger.",
    "Good work with clear improvements; the evidence is reasonable but could be more complete.",
    "Well run and improving. A few answers are general where specifics would help.",
  ],
  fair: [
    "Some good steps, but the answers are mostly general and the results are not yet measured.",
    "A fair entry. The improvement shown is real but small, and the system behind it is still young.",
  ],
  low: [
    "The entry describes intentions more than results. Little evidence of a working system yet.",
    "Basic compliance is in place, but there is little here that goes beyond it.",
  ],
};
