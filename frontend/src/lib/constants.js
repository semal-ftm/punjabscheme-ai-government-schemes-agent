// Values mirrored from the backend (app/eligibility.py, app/db.py, app/mcp_server/server.py).
// Keep these in sync with the Python source.

export const VERDICTS = {
  ELIGIBLE: "Potentially Eligible",
  NEED_INFO: "More Information Needed",
  NOT_ELIGIBLE: "Not Eligible Based on Known Rules",
};
export const VERDICT_ORDER = [VERDICTS.ELIGIBLE, VERDICTS.NEED_INFO, VERDICTS.NOT_ELIGIBLE];

export const NOT_CONFIRMED = "Not Officially Confirmed";

export const CATEGORIES = [
  { value: "cm_punjab", label: "CM Punjab" },
  { value: "punjab_department", label: "Punjab Departments" },
  { value: "federal", label: "Federal" },
];
export const CATEGORY_LABELS = {
  cm_punjab: "CM Punjab Initiative",
  punjab_department: "Punjab Department",
  federal: "Federal Programme",
};

export const LEVELS = [
  { value: "provincial", label: "Provincial" },
  { value: "federal", label: "Federal" },
];

export const STATUSES = ["Open", "Ongoing", "Upcoming", "Closed", "Suspended", "Unverified"];

export const EDUCATION_LEVELS = [
  "none", "primary", "middle", "matric", "intermediate", "undergraduate", "graduate", "postgraduate",
];

export const PUNJAB_DISTRICTS = [
  "Attock", "Bahawalnagar", "Bahawalpur", "Bhakkar", "Chakwal", "Chiniot", "Dera Ghazi Khan", "Faisalabad",
  "Gujranwala", "Gujrat", "Hafizabad", "Jhang", "Jhelum", "Kasur", "Khanewal", "Khushab", "Kot Addu", "Lahore",
  "Layyah", "Lodhran", "Mandi Bahauddin", "Mianwali", "Multan", "Murree", "Muzaffargarh", "Nankana Sahib",
  "Narowal", "Okara", "Pakpattan", "Rahim Yar Khan", "Rajanpur", "Rawalpindi", "Sahiwal", "Sargodha",
  "Sheikhupura", "Sialkot", "Talagang", "Taunsa", "Toba Tek Singh", "Vehari", "Wazirabad",
];

export const PROVINCES = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad", "Gilgit-Baltistan", "Azad Kashmir"];

const pretty = (v) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Mirror of PROFILE_FIELDS (type, enum values and question). `label`/`hint`/`options` are UI-only.
export const PROFILE_FIELDS = {
  age: { type: "int", label: "Age (years)", question: "What is your age (in years)?", min: 0, max: 120 },
  gender: {
    type: "enum", label: "Gender", question: "What is your gender?",
    values: ["male", "female", "transgender"],
  },
  province: {
    type: "str", label: "Province (domicile)", question: "Which province do you permanently live in (domicile)?",
    hint: "Filled in automatically when you pick a Punjab district.", suggestions: PROVINCES,
  },
  district: {
    type: "str", label: "District", question: "Which district do you live in?", suggestions: PUNJAB_DISTRICTS,
  },
  area_type: { type: "enum", label: "Area type", question: "Do you live in an urban or rural area?", values: ["urban", "rural"] },
  education_level: {
    type: "enum", label: "Education level",
    question: "What is your current or highest education level (e.g. matric, intermediate, university)?",
    values: EDUCATION_LEVELS,
  },
  currently_enrolled: {
    type: "bool", label: "Currently enrolled in school / college / university",
    question: "Are you currently enrolled in a school, college or university?",
  },
  current_semester: {
    type: "int", label: "Current semester (degree students)", question: "Which semester of your degree are you in (e.g. 1, 2, 3)?", min: 1, max: 12,
  },
  institution_type: {
    type: "enum", label: "Institution type", question: "Is your school/college/university public (government) or private?",
    values: ["public", "private"],
  },
  intermediate_marks_percent: {
    type: "float", label: "Intermediate marks (%)", question: "What percentage of marks did you get in Intermediate (FSc/FA/ICS)?",
    min: 0, max: 100,
  },
  received_laptop_before: {
    type: "bool", label: "Received a government laptop before",
    question: "Have you ever received a laptop from any government laptop scheme?",
  },
  has_driving_licence: {
    type: "bool", label: "Has a learner's permit or driving licence",
    question: "Do you hold a valid motorcycle learner's permit or driving licence?",
  },
  marital_status: {
    type: "enum", label: "Marital status", question: "What is your marital status?",
    values: ["single", "married", "widowed", "divorced"],
  },
  monthly_household_income: {
    type: "int", label: "Monthly household income (PKR)",
    question: "Roughly what is your family's total monthly income in PKR?", min: 0,
  },
  employment_type: {
    type: "enum", label: "Employment type (you or main earner)",
    question: "What is your (or the main earner's) type of work?",
    values: ["student", "industrial_worker", "domestic_worker", "farmer", "daily_wage", "self_employed",
      "private_employee", "government_employee", "unemployed", "other"],
  },
  registered_with_pessi: {
    type: "bool", label: "Registered with PESSI",
    question: "Are you (or your parent) a worker registered/secured with PESSI (Punjab Employees Social Security)?",
  },
  registered_industrial_worker: {
    type: "bool", label: "Registered industrial worker (Punjab Workers Welfare Fund)",
    question: "Are you (or your parent) a registered industrial worker (Punjab Workers Welfare Fund)?",
  },
  bisp_beneficiary: {
    type: "bool", label: "BISP beneficiary household",
    question: "Is your household an active BISP (Benazir Kafaalat) beneficiary?",
  },
  owns_plot: { type: "bool", label: "Owns a residential plot or house", question: "Do you own a residential plot or house?" },
  plot_size_marla: {
    type: "float", label: "Plot / house size (marla)", question: "What is the size of your plot/house in marla?", min: 0,
  },
  land_acres: {
    type: "float", label: "Agricultural land owned (acres)", question: "How many acres of agricultural land do you own?", min: 0,
  },
  has_disability: { type: "bool", label: "Has a disability certificate", question: "Do you have a disability certificate?" },
};

export const fieldLabel = (field) => PROFILE_FIELDS[field]?.label || (field ? pretty(field) : "");
export const optionLabel = (value) => (typeof value === "string" ? pretty(value) : String(value));

export const LANGUAGE_LABELS = { en: "English", ur: "Urdu", roman_ur: "Roman Urdu" };

export const EXAMPLE_PROMPTS = [
  "I am a matric student from Lahore. Which schemes can I apply for?",
  "Actually, I'm a university student.",
  "Mujhe ghar banane ke liye qarza chahiye",
  "What documents do I need for BISP Kafaalat?",
  "What changed recently?",
];
