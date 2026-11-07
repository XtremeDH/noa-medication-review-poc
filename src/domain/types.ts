export type Severity = 'major' | 'moderate' | 'minor';
export type MedSource = 'record' | 'patient-list' | 'transcript';
export type LabTest = 'creatinine' | 'potassium' | 'sodium' | 'hba1c' | 'inr';
export type InputKey = 'weight' | LabTest;
export type RuleType = 'kidney_dosing' | 'interaction' | 'duplication' | 'inappropriate' | 'missing_treatment';
export type MedStatus = 'taking' | 'stopped' | 'unclear';

export interface Medication {
  id: string;
  name: string;
  ingredient: string | null;
  dose_mg: number | null;
  doses_per_day: number | null;
  frequency: string | null;
  regular: boolean;
  status: MedStatus;
  source: MedSource;
  prescriber?: string;
  since?: string;
  indication?: string;
  confidence?: number;
  evidence?: string;
}

/** Output of the (mocked) LLM extraction step, one per medicine mentioned. */
export interface ExtractedItem {
  name_as_said: string;
  ingredient: string | null;
  dose_mg: number | null;
  doses_per_day: number | null;
  frequency: string | null;
  regular: boolean;
  status: MedStatus;
  evidence: string;
  confidence: number;
}

export interface Condition {
  code: string;
  label: string;
  source: 'record' | 'transcript';
  detail?: string;
  ef?: number;
}

export interface Lab {
  test: LabTest;
  value: number;
  unit: string;
  date: string;
  origin: string;
}

export interface Patient {
  id: string;
  recordId: string;
  name: string;
  age: number;
  sex: 'F' | 'M';
  weight_kg?: number;
  weight_date?: string;
  insurer: string;
  visitDate: string;
  reason: string;
  conditions: Condition[];
  medications: Medication[];
  labs: Lab[];
  allergies: { substance: string; reaction: string }[];
  context: {
    falls_last_12m: number;
    falls_evidence?: string;
    pregnancy: boolean;
    chemotherapy: boolean;
    palliative: boolean;
    anticoag_reason?: string;
  };
  transcript: { speaker: 'Médico' | 'Paciente'; text: string }[];
  extraction: ExtractedItem[];
}

export interface Fact {
  /** Language-neutral identity of the input value, used for the dismissal hash. */
  key: string;
  label: string;
  value: string;
  date?: string;
  origin: string;
  evidence?: string;
}

export interface Criterion {
  label: string;
  expected: string;
  found: string;
  met: boolean;
}
