/**
 * ──────────────────────────────────────────────────────────────
 *  labOCRParser.ts
 *  Simulates AI-based OCR parsing for lab reports.
 *
 *  Real-world flow:
 *    1. Camera captures image → Google Vision / Tesseract extracts raw text
 *    2. AI (Gemini / GPT) parses the text into structured data
 *    3. Reference ranges are matched from a medical database
 *    4. Values are auto-flagged as Normal / High / Low
 *
 *  Here we simulate that full pipeline with:
 *    - Type-specific mock OCR text generation
 *    - Dynamic regex-based key-value extraction
 *    - Per-parameter reference range lookup
 *    - Auto-flagging logic
 * ──────────────────────────────────────────────────────────────
 */

export type FlagType = 'Normal' | 'High' | 'Low' | 'Critical' | 'N/A';

export interface ParsedParameter {
  label: string;       // e.g. "Hemoglobin"
  value: string;       // e.g. "14.2"
  unit: string;        // e.g. "g/dL"
  refRange: string;    // e.g. "13.0 – 17.0"
  flag: FlagType;
  numericValue?: number;
}

export interface ParsedReport {
  patientName: string;
  patientAge: string;
  reportDate: string;
  referredBy: string;
  labName: string;
  reportTitle: string;
  category: ReportCategory;
  rawOCRText: string;
  parameters: ParsedParameter[];
  overallStatus: FlagType;
  notes: string;
}

export type ReportCategory =
  | 'CBC'
  | 'Lipid Profile'
  | 'Blood Sugar'
  | 'Liver Function'
  | 'Kidney Function'
  | 'Thyroid'
  | 'Urine'
  | 'HbA1c'
  | 'Imaging'
  | 'ECG'
  | 'Unknown';

// ─────────────────────────────────────────────────────────────
// Reference Ranges Database
// Each entry: [normalMin, normalMax, unit, criticalLow?, criticalHigh?]
// ─────────────────────────────────────────────────────────────
const REFERENCE_RANGES: Record<string, {
  min: number; max: number; unit: string;
  critMin?: number; critMax?: number; refLabel: string;
}> = {
  // CBC
  'hemoglobin':         { min: 13.0, max: 17.0, unit: 'g/dL',     critMin: 7,   critMax: 20,  refLabel: '13.0–17.0' },
  'hgb':                { min: 13.0, max: 17.0, unit: 'g/dL',     critMin: 7,   critMax: 20,  refLabel: '13.0–17.0' },
  'rbc':                { min: 4.5,  max: 5.5,  unit: 'M/cmm',                               refLabel: '4.5–5.5' },
  'wbc':                { min: 4000, max: 11000,unit: '/cmm',      critMin: 2000, critMax: 30000, refLabel: '4000–11000' },
  'platelet':           { min: 150000,max:450000,unit: '/cmm',     critMin: 50000, critMax: 1000000, refLabel: '150000–450000' },
  'plt':                { min: 150000,max:450000,unit: '/cmm',     critMin: 50000,               refLabel: '150000–450000' },
  'hematocrit':         { min: 39,   max: 50,   unit: '%',                                   refLabel: '39–50' },
  'hct':                { min: 39,   max: 50,   unit: '%',                                   refLabel: '39–50' },
  'mcv':                { min: 80,   max: 100,  unit: 'fL',                                  refLabel: '80–100' },
  'mch':                { min: 27,   max: 33,   unit: 'pg',                                  refLabel: '27–33' },
  'mchc':               { min: 32,   max: 36,   unit: 'g/dL',                                refLabel: '32–36' },
  'neutrophils':        { min: 50,   max: 70,   unit: '%',                                   refLabel: '50–70' },
  'lymphocytes':        { min: 20,   max: 40,   unit: '%',                                   refLabel: '20–40' },
  'monocytes':          { min: 2,    max: 8,    unit: '%',                                   refLabel: '2–8' },
  'eosinophils':        { min: 1,    max: 4,    unit: '%',                                   refLabel: '1–4' },
  'basophils':          { min: 0,    max: 1,    unit: '%',                                   refLabel: '0–1' },

  // Lipid
  'total cholesterol':  { min: 0,    max: 200,  unit: 'mg/dL',                               refLabel: '<200' },
  'hdl':                { min: 40,   max: 999,  unit: 'mg/dL',                               refLabel: '>40' },
  'ldl':                { min: 0,    max: 130,  unit: 'mg/dL',                               refLabel: '<130' },
  'triglycerides':      { min: 0,    max: 150,  unit: 'mg/dL',                               refLabel: '<150' },
  'vldl':               { min: 0,    max: 30,   unit: 'mg/dL',                               refLabel: '5–30' },

  // Blood Sugar
  'fasting blood sugar':{ min: 3.9,  max: 6.1,  unit: 'mmol/L',   critMax: 25,              refLabel: '3.9–6.1' },
  'fbs':                { min: 3.9,  max: 6.1,  unit: 'mmol/L',   critMax: 25,              refLabel: '3.9–6.1' },
  'rbs':                { min: 3.9,  max: 7.8,  unit: 'mmol/L',                              refLabel: '3.9–7.8' },
  'hba1c':              { min: 0,    max: 5.7,  unit: '%',                                   refLabel: '<5.7' },
  'insulin':            { min: 2,    max: 25,   unit: 'μIU/mL',                              refLabel: '2–25' },

  // Liver
  'alt':                { min: 0,    max: 40,   unit: 'U/L',      critMax: 1000,             refLabel: '7–40' },
  'ast':                { min: 0,    max: 40,   unit: 'U/L',      critMax: 1000,             refLabel: '10–40' },
  'alp':                { min: 44,   max: 147,  unit: 'U/L',                                 refLabel: '44–147' },
  'bilirubin total':    { min: 0,    max: 1.2,  unit: 'mg/dL',    critMax: 15,               refLabel: '0.2–1.2' },
  'bilirubin direct':   { min: 0,    max: 0.3,  unit: 'mg/dL',                               refLabel: '0–0.3' },
  'albumin':            { min: 3.5,  max: 5.0,  unit: 'g/dL',                                refLabel: '3.5–5.0' },
  'total protein':      { min: 6.0,  max: 8.3,  unit: 'g/dL',                                refLabel: '6.0–8.3' },

  // Kidney
  'creatinine':         { min: 0.7,  max: 1.2,  unit: 'mg/dL',    critMax: 10,              refLabel: '0.7–1.2' },
  'urea':               { min: 7,    max: 20,   unit: 'mg/dL',                               refLabel: '7–20' },
  'bun':                { min: 7,    max: 20,   unit: 'mg/dL',                               refLabel: '7–20' },
  'uric acid':          { min: 3.5,  max: 7.2,  unit: 'mg/dL',                               refLabel: '3.5–7.2' },
  'gfr':                { min: 60,   max: 999,  unit: 'mL/min',                              refLabel: '>60' },
  'sodium':             { min: 135,  max: 145,  unit: 'mEq/L',    critMin: 120, critMax: 160, refLabel: '135–145' },
  'potassium':          { min: 3.5,  max: 5.0,  unit: 'mEq/L',    critMin: 2.5, critMax: 6.5, refLabel: '3.5–5.0' },
  'chloride':           { min: 98,   max: 106,  unit: 'mEq/L',                               refLabel: '98–106' },

  // Thyroid
  'tsh':                { min: 0.4,  max: 4.0,  unit: 'mIU/L',                               refLabel: '0.4–4.0' },
  't3':                 { min: 80,   max: 200,  unit: 'ng/dL',                               refLabel: '80–200' },
  't4':                 { min: 5.1,  max: 14.1, unit: 'μg/dL',                               refLabel: '5.1–14.1' },
  'free t3':            { min: 2.3,  max: 4.2,  unit: 'pg/mL',                               refLabel: '2.3–4.2' },
  'free t4':            { min: 0.89, max: 1.76, unit: 'ng/dL',                               refLabel: '0.89–1.76' },

  // Urine
  'urine ph':           { min: 4.5,  max: 8.0,  unit: '',                                    refLabel: '4.5–8.0' },
  'specific gravity':   { min: 1.005,max: 1.030,unit: '',                                    refLabel: '1.005–1.030' },
  'urine glucose':      { min: 0,    max: 0,    unit: 'mg/dL',                               refLabel: 'Nil' },
  'urine protein':      { min: 0,    max: 0,    unit: 'mg/dL',                               refLabel: 'Nil' },
  'rbc (urine)':        { min: 0,    max: 3,    unit: '/hpf',                                refLabel: '0–3' },
  'wbc (urine)':        { min: 0,    max: 5,    unit: '/hpf',                                refLabel: '0–5' },

  // Iron Studies
  'serum iron':         { min: 60,   max: 170,  unit: 'μg/dL',                               refLabel: '60–170' },
  'ferritin':           { min: 12,   max: 300,  unit: 'ng/mL',                               refLabel: '12–300' },
  'tibc':               { min: 250,  max: 370,  unit: 'μg/dL',                               refLabel: '250–370' },

  // CRP / ESR
  'crp':                { min: 0,    max: 6,    unit: 'mg/L',                                refLabel: '<6' },
  'esr':                { min: 0,    max: 20,   unit: 'mm/hr',                               refLabel: '0–20' },

  // Vitamins
  'vitamin d':          { min: 30,   max: 100,  unit: 'ng/mL',                               refLabel: '30–100' },
  'vitamin b12':        { min: 200,  max: 900,  unit: 'pg/mL',                               refLabel: '200–900' },
  'folate':             { min: 3,    max: 17,   unit: 'ng/mL',                               refLabel: '3–17' },
};

// ─────────────────────────────────────────────────────────────
// Detect category from raw text
// ─────────────────────────────────────────────────────────────
export function detectCategory(rawText: string): ReportCategory {
  const t = rawText.toLowerCase();
  if (t.includes('complete blood count') || t.includes('cbc') || t.includes('hemoglobin') || t.includes('platelet')) return 'CBC';
  if (t.includes('lipid') || t.includes('cholesterol') || t.includes('hdl') || t.includes('ldl')) return 'Lipid Profile';
  if (t.includes('hba1c') || t.includes('glycated')) return 'HbA1c';
  if (t.includes('blood sugar') || t.includes('glucose') || t.includes('fbs') || t.includes('rbs')) return 'Blood Sugar';
  if (t.includes('liver') || t.includes('alt') || t.includes('ast') || t.includes('bilirubin') || t.includes('sgpt')) return 'Liver Function';
  if (t.includes('kidney') || t.includes('creatinine') || t.includes('urea') || t.includes('bun') || t.includes('gfr')) return 'Kidney Function';
  if (t.includes('thyroid') || t.includes('tsh') || t.includes('t3') || t.includes('t4')) return 'Thyroid';
  if (t.includes('urine') || t.includes('urinalysis')) return 'Urine';
  if (t.includes('x-ray') || t.includes('mri') || t.includes('ct scan') || t.includes('ultrasound')) return 'Imaging';
  if (t.includes('ecg') || t.includes('ekg') || t.includes('electrocardiogram')) return 'ECG';
  return 'Unknown';
}

// ─────────────────────────────────────────────────────────────
// Auto-flag a value given a parameter label
// ─────────────────────────────────────────────────────────────
export function autoFlag(label: string, numericValue: number): FlagType {
  const key = label.toLowerCase().trim();

  // Find matching reference
  const ref = REFERENCE_RANGES[key] ?? Object.entries(REFERENCE_RANGES).find(([k]) => key.includes(k) || k.includes(key))?.[1];

  if (!ref) return 'Normal'; // unknown param → assume normal

  if (ref.critMin !== undefined && numericValue < ref.critMin) return 'Critical';
  if (ref.critMax !== undefined && numericValue > ref.critMax) return 'Critical';
  if (numericValue < ref.min) return 'Low';
  if (numericValue > ref.max) return 'High';
  return 'Normal';
}

// ─────────────────────────────────────────────────────────────
// Dynamic OCR text parser
// Extracts key-value pairs from raw OCR text using patterns like:
//   "Hemoglobin: 14.2 g/dL"
//   "Hemoglobin    14.2    13.0-17.0"
//   "HGB | 14.2 | g/dL | 13.0-17.0"
// ─────────────────────────────────────────────────────────────
export function parseOCRText(rawText: string, category: ReportCategory): ParsedParameter[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const parameters: ParsedParameter[] = [];

  // Patterns to extract: label + numeric value + optional unit
  const patterns = [
    // "Label: 14.2 g/dL"   or   "Label: 14.2"
    /^([A-Za-z][A-Za-z0-9\s\(\)\-\/]+?)\s*[:]\s*([\d.]+)\s*([A-Za-z\/μ%]*)/,
    // "Label    14.2    unit"  (tab/space separated table)
    /^([A-Za-z][A-Za-z0-9\s\(\)\-\/]{2,}?)\s{2,}([\d.]+)\s+([A-Za-z\/μ%]*)/,
    // "Label | 14.2 | unit"  (pipe separated)
    /^([A-Za-z][A-Za-z0-9\s\(\)\-\/]+?)\s*\|\s*([\d.]+)\s*\|\s*([A-Za-z\/μ%]*)/,
  ];

  for (const line of lines) {
    // Skip header/footer lines
    if (line.length < 4) continue;
    if (/^(patient|name|date|doctor|hospital|lab|report|age|sex|ref|sample|specimen|collected|reported)/i.test(line)) continue;
    if (/^[=\-*_]{3,}/.test(line)) continue;

    let matched = false;
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m) {
        const label       = m[1].trim();
        const rawVal      = m[2].trim();
        const unit        = m[3]?.trim() ?? '';
        const numericVal  = parseFloat(rawVal);

        if (isNaN(numericVal) || label.length < 2) continue;
        if (parameters.find(p => p.label.toLowerCase() === label.toLowerCase())) continue; // dedupe

        const refKey = label.toLowerCase();
        const ref    = REFERENCE_RANGES[refKey]
          ?? Object.entries(REFERENCE_RANGES).find(([k]) => refKey.includes(k) || k.includes(refKey))?.[1];

        const flag     = autoFlag(label, numericVal);
        const refRange = ref ? ref.refLabel : '—';
        const finalUnit = unit || ref?.unit || '';

        parameters.push({ label, value: rawVal, unit: finalUnit, refRange, flag, numericValue: numericVal });
        matched = true;
        break;
      }
    }
  }

  // If nothing was parsed (e.g. Imaging/ECG), return a single narrative entry
  if (parameters.length === 0 && (category === 'Imaging' || category === 'ECG' || category === 'Unknown')) {
    parameters.push({
      label: 'Report Type',
      value: category === 'Imaging' ? 'Radiological' : category,
      unit: '', refRange: '—', flag: 'N/A',
    });
    parameters.push({
      label: 'Impression',
      value: 'See scanned image / OCR text for details',
      unit: '', refRange: '—', flag: 'N/A',
    });
  }

  return parameters;
}

// ─────────────────────────────────────────────────────────────
// Compute overall status
// ─────────────────────────────────────────────────────────────
export function computeOverallStatus(params: ParsedParameter[]): FlagType {
  if (params.some(p => p.flag === 'Critical')) return 'Critical';
  if (params.some(p => p.flag === 'High'))     return 'High';
  if (params.some(p => p.flag === 'Low'))      return 'Low';
  return 'Normal';
}

// ─────────────────────────────────────────────────────────────
// Master entry point — simulates full AI OCR pipeline
// reportType: the user-selected type (or detected from scan)
// ─────────────────────────────────────────────────────────────
export function simulateOCRScan(reportType: string, patientName: string = 'John Doe'): ParsedReport {
  const mockData = MOCK_OCR_BY_TYPE[reportType] ?? MOCK_OCR_BY_TYPE['Blood Test'];
  const raw      = mockData.rawText.replace('{PATIENT}', patientName).replace('{DATE}', getTodayStr());
  const category = detectCategory(raw);
  const params   = parseOCRText(raw, category);
  const overall  = computeOverallStatus(params);

  return {
    patientName,
    patientAge:   '65 years / Male',
    reportDate:   getTodayStr(),
    referredBy:   mockData.referredBy,
    labName:      mockData.labName,
    reportTitle:  mockData.title,
    category,
    rawOCRText:   raw,
    parameters:   params,
    overallStatus: overall,
    notes:        overall === 'Normal' ? 'All values within normal range.' : 'Some values are outside the normal range. Please consult your doctor.',
  };
}

function getTodayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// Mock OCR texts — one per report type
// These simulate what Google Vision / Tesseract would return
// ─────────────────────────────────────────────────────────────
const MOCK_OCR_BY_TYPE: Record<string, { title: string; labName: string; referredBy: string; rawText: string }> = {
  'Blood Test': {
    title: 'Complete Blood Count (CBC)',
    labName: 'Popular Diagnostic Centre',
    referredBy: 'Dr. Sarah Johnson',
    rawText:
`POPULAR DIAGNOSTIC CENTRE LTD.
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Sarah Johnson
Specimen: Whole Blood

COMPLETE BLOOD COUNT (CBC)
Hemoglobin: 13.2 g/dL
RBC: 4.6 M/cmm
WBC: 9800 /cmm
Platelet: 148000 /cmm
Hematocrit: 40 %
MCV: 82 fL
MCH: 28 pg
MCHC: 33 g/dL
Neutrophils: 72 %
Lymphocytes: 22 %
Monocytes: 4 %
Eosinophils: 2 %
Basophils: 0 %

Note: Platelet count is slightly below normal range.
Reported By: Dr. Hematologist`,
  },
  'Lipid Profile': {
    title: 'Lipid Profile',
    labName: 'Ibn Sina Diagnostic',
    referredBy: 'Dr. Michael Brown',
    rawText:
`IBN SINA DIAGNOSTIC & IMAGING CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Michael Brown

LIPID PROFILE (Fasting)
Total Cholesterol: 248 mg/dL
HDL: 35 mg/dL
LDL: 175 mg/dL
Triglycerides: 190 mg/dL
VLDL: 38 mg/dL

Note: LDL and total cholesterol are significantly elevated. Dietary changes and medication review recommended.
Reported By: Dr. Lipid Specialist`,
  },
  'Blood Sugar': {
    title: 'Blood Glucose (Fasting)',
    labName: 'Medinova Diagnostic',
    referredBy: 'Dr. Emily Davis',
    rawText:
`MEDINOVA DIAGNOSTIC CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Emily Davis

BLOOD GLUCOSE (FASTING)
Fasting Blood Sugar: 7.2 mmol/L
RBS: 9.8 mmol/L

Note: FBS is above normal. Diabetes management review recommended.
Reported By: Dr. Pathologist`,
  },
  'Urine Test': {
    title: 'Urine Routine & Microscopy',
    labName: 'Lab Aid',
    referredBy: 'Dr. James Wilson',
    rawText:
`LAB AID DIAGNOSTIC SERVICES
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. James Wilson

URINE ROUTINE EXAMINATION
Urine pH: 6.5
Specific Gravity: 1.015
Urine Glucose: 0 mg/dL
Urine Protein: 0 mg/dL
RBC (Urine): 2 /hpf
WBC (Urine): 4 /hpf

MICROSCOPY
Casts: Nil
Crystals: Nil
Bacteria: Nil

Result: Normal
Reported By: Dr. Pathologist`,
  },
  'X-Ray': {
    title: 'Chest X-Ray (PA View)',
    labName: 'City Hospital Radiology',
    referredBy: 'Dr. Cardiologist',
    rawText:
`CITY HOSPITAL RADIOLOGY DEPT.
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Cardiologist

CHEST X-RAY (PA VIEW)
Findings:
- Heart size appears normal (CTR < 0.5)
- Lung fields are clear bilaterally
- No pleural effusion seen
- Costophrenic angles are sharp
- Bony thorax is intact
- No active pulmonary lesion

Impression: Normal chest X-ray.
No significant cardiopulmonary abnormality detected.

Reported By: Dr. Radiologist`,
  },
  'MRI': {
    title: 'MRI Brain (Without Contrast)',
    labName: 'Dhaka Medical Imaging',
    referredBy: 'Dr. Neurologist',
    rawText:
`DHAKA MEDICAL IMAGING CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Neurologist

MRI BRAIN WITHOUT CONTRAST
Technique: Standard brain MRI protocol (T1, T2, FLAIR, DWI)

Findings:
- Brain parenchyma shows normal signal intensity
- No infarct, hemorrhage or mass lesion
- Ventricles appear normal in size
- Sulci and gyri appear normal for age
- No midline shift
- Cerebellum and brainstem appear normal

Impression: Normal MRI of the brain.
No acute intracranial abnormality detected.

Reported By: Dr. Radiologist`,
  },
  'ECG': {
    title: 'Electrocardiogram (ECG/EKG)',
    labName: 'Cardiology Department',
    referredBy: 'Dr. Cardiologist',
    rawText:
`CARDIOLOGY DEPARTMENT - ECG REPORT
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Cardiologist

ELECTROCARDIOGRAM (12-Lead ECG)
Heart Rate: 78 bpm
Rhythm: Normal sinus rhythm
PR Interval: 160 ms (Normal: 120-200ms)
QRS Duration: 88 ms (Normal: <120ms)
QTc Interval: 420 ms (Normal: <450ms)
Axis: Normal (+45°)

Findings:
- Normal sinus rhythm
- No ST elevation or depression
- T waves are upright in lateral leads
- No bundle branch block

Impression: Normal ECG. No acute ischemic changes.
Reported By: Dr. Cardiologist`,
  },
  'Thyroid': {
    title: 'Thyroid Function Tests (TFT)',
    labName: 'Endocrine Lab',
    referredBy: 'Dr. Endocrinologist',
    rawText:
`ENDOCRINE DIAGNOSTIC LAB
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Endocrinologist

THYROID FUNCTION TEST (TFT)
TSH: 6.8 mIU/L
Free T3: 3.1 pg/mL
Free T4: 0.75 ng/dL
T3: 90 ng/dL
T4: 6.2 μg/dL

Note: TSH is elevated and Free T4 is below normal. Hypothyroidism is suspected. Clinical correlation recommended.
Reported By: Dr. Endocrine Specialist`,
  },
  'HbA1c': {
    title: 'Glycated Hemoglobin (HbA1c)',
    labName: 'Diabetes Care Lab',
    referredBy: 'Dr. Diabetologist',
    rawText:
`DIABETES CARE DIAGNOSTIC
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Diabetologist

GLYCATED HEMOGLOBIN (HbA1c)
HbA1c: 8.2 %
Estimated Average Glucose: 10.1 mmol/L
Fasting Blood Sugar: 8.1 mmol/L
Insulin: 18 μIU/mL

Note: HbA1c > 7.0% indicates poor glycemic control. Medication and diet review strongly recommended.
Reported By: Dr. Biochemist`,
  },
  'Liver Function': {
    title: 'Liver Function Test (LFT)',
    labName: 'Gastro Diagnostic',
    referredBy: 'Dr. Gastroenterologist',
    rawText:
`GASTRO DIAGNOSTIC CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Gastroenterologist

LIVER FUNCTION TEST (LFT)
ALT: 52 U/L
AST: 48 U/L
ALP: 165 U/L
Bilirubin Total: 1.8 mg/dL
Bilirubin Direct: 0.5 mg/dL
Albumin: 3.2 g/dL
Total Protein: 5.8 g/dL

Note: ALT, AST and ALP are mildly elevated. Bilirubin is above normal. Liver disease cannot be ruled out. Follow-up advised.
Reported By: Dr. Pathologist`,
  },
  'Kidney Function': {
    title: 'Kidney Function Test (KFT)',
    labName: 'Nephro Diagnostic',
    referredBy: 'Dr. Nephrologist',
    rawText:
`NEPHRO DIAGNOSTIC CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Nephrologist

KIDNEY FUNCTION TEST (KFT)
Creatinine: 1.6 mg/dL
Urea: 28 mg/dL
BUN: 26 mg/dL
Uric Acid: 7.8 mg/dL
Sodium: 138 mEq/L
Potassium: 4.2 mEq/L
Chloride: 101 mEq/L
GFR: 48 mL/min

Note: Creatinine and Uric Acid are elevated. GFR is below 60, indicating mild to moderate CKD. Nephrology consultation recommended.
Reported By: Dr. Nephrologist`,
  },
  'CT Scan': {
    title: 'CT Scan Abdomen (With Contrast)',
    labName: 'Advanced Imaging Centre',
    referredBy: 'Dr. Surgeon',
    rawText:
`ADVANCED IMAGING CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Surgeon

CT ABDOMEN (WITH CONTRAST)
Liver: Normal size and attenuation. No focal lesion.
Gallbladder: Normal. No calculi.
Pancreas: Normal.
Spleen: Normal size.
Kidneys: Bilateral kidneys normal in size. No hydronephrosis or calculus.
Bowel: Normal. No obstruction or perforation.
Lymph Nodes: No enlarged lymph nodes.
Peritoneum: No free fluid.

Impression: Normal CT scan of the abdomen. No significant abnormality detected.
Reported By: Dr. Radiologist`,
  },
  'Other': {
    title: 'General Lab Report',
    labName: 'General Diagnostic',
    referredBy: 'Dr. Physician',
    rawText:
`GENERAL DIAGNOSTIC CENTRE
Patient: {PATIENT}    Age/Sex: 65 Yrs / Male
Date: {DATE}     Ref.Dr: Dr. Physician

GENERAL INVESTIGATION
CRP: 12 mg/L
ESR: 28 mm/hr
Vitamin D: 18 ng/mL
Vitamin B12: 185 pg/mL
Serum Iron: 55 μg/dL
Ferritin: 8 ng/mL

Note: CRP and ESR are elevated suggesting inflammation. Vitamin D, B12, Iron and Ferritin are low. Supplementation recommended.
Reported By: Dr. General Pathologist`,
  },
};
