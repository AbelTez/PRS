/**
 * Demo seed — a realistic slice of the Ethiopian referral network.
 *
 * Facilities are real Ethiopian public facilities (names, tiers, approximate
 * coordinates and public switchboard numbers). Staff, patients, referrals and
 * ratings are synthetic — no real patient data. Contact numbers/addresses are
 * best-effort public information: verify with each facility before a pilot.
 *
 * The network deliberately spans both contexts the system must serve:
 *  - the rural chain: health post → health centre → primary hospital → Ambo General
 *  - the Addis Ababa apex: Tikur Anbessa (Black Lion), St. Paul's, Zewditu, …
 */

const now = () => Date.now();
const minAgo = (m) => new Date(now() - m * 60000).toISOString();
const hAgo = (h) => new Date(now() - h * 3600000).toISOString();
const dAgo = (d) => new Date(now() - d * 86400000).toISOString();

export const SEED_VERSION = 8; // bump to force reseed on deployed browsers

/* ============================================================ FACILITIES */
export const FACILITIES = [
  {
    id: 'f-blacklion', mfrId: 'MFR-ET-14-0001',
    name: 'Tikur Anbessa (Black Lion) Specialised Hospital', nameAm: 'ጥቁር አንበሳ ስፔሻላይዝድ ሆስፒታል',
    type: 'specialised_hospital', tier: 5, ownership: 'public',
    region: 'Addis Ababa', zone: 'Lideta Sub-city', woreda: 'Woreda 08',
    address: 'Zambia Street, near Lideta condominiums', poBox: 'P.O. Box 5657',
    phone: '+251 11 551 1211', latitude: 9.0084, longitude: 38.7469,
    is24h: true, hasAmbulance: true,
    about: 'Ethiopia’s largest tertiary teaching hospital (Addis Ababa University, College of Health Sciences). National apex for neurosurgery, oncology, dialysis and complex referrals.',
  },
  {
    id: 'f-stpauls', mfrId: 'MFR-ET-14-0002',
    name: "St. Paul's Hospital Millennium Medical College", nameAm: 'ቅዱስ ጳውሎስ ሆስፒታል ሚሌኒየም ሕክምና ኮሌጅ',
    type: 'specialised_hospital', tier: 5, ownership: 'public',
    region: 'Addis Ababa', zone: 'Gulele Sub-city', woreda: 'Woreda 09',
    address: 'Swaziland Street, Gulele', poBox: 'P.O. Box 1271',
    phone: '+251 11 275 3454', latitude: 9.0526, longitude: 38.7263,
    is24h: true, hasAmbulance: true,
    about: 'Federal tertiary teaching hospital under the Ministry of Health. National centre for transplant, trauma and high-risk obstetrics.',
  },
  {
    id: 'f-stpeters', mfrId: 'MFR-ET-14-0003',
    name: "St. Peter's Specialised Hospital", nameAm: 'ቅዱስ ጴጥሮስ ስፔሻላይዝድ ሆስፒታል',
    type: 'specialised_hospital', tier: 5, ownership: 'public',
    region: 'Addis Ababa', zone: 'Gulele Sub-city', woreda: 'Woreda 01',
    address: 'Entoto Road, Gulele', poBox: 'P.O. Box 21534',
    phone: '+251 11 111 2691', latitude: 9.0666, longitude: 38.7398,
    is24h: true, hasAmbulance: false,
    about: 'National referral centre for TB, MDR-TB and chest medicine.',
  },
  {
    id: 'f-amanuel', mfrId: 'MFR-ET-14-0004',
    name: 'Amanuel Mental Specialised Hospital', nameAm: 'አማኑኤል የአእምሮ ስፔሻላይዝድ ሆስፒታል',
    type: 'specialised_hospital', tier: 5, ownership: 'public',
    region: 'Addis Ababa', zone: 'Addis Ketema Sub-city', woreda: 'Woreda 03',
    address: 'Off Merkato, Addis Ketema', poBox: 'P.O. Box 1971',
    phone: '+251 11 275 7744', latitude: 9.0330, longitude: 38.7326,
    is24h: true, hasAmbulance: false,
    about: 'The national referral hospital for psychiatry and mental health.',
  },
  {
    id: 'f-alert', mfrId: 'MFR-ET-14-0005',
    name: 'ALERT Comprehensive Specialised Hospital', nameAm: 'አለርት ኮምፕርሄንሲቭ ስፔሻላይዝድ ሆስፒታል',
    type: 'specialised_hospital', tier: 5, ownership: 'public',
    region: 'Addis Ababa', zone: 'Kolfe Keranio Sub-city', woreda: 'Woreda 11',
    address: 'Zenebework, Jimma Road', poBox: 'P.O. Box 165',
    phone: '+251 11 371 1524', latitude: 8.9926, longitude: 38.6879,
    is24h: true, hasAmbulance: true,
    about: 'Referral centre for dermatology, leprosy, reconstructive and orthopaedic surgery.',
  },
  {
    id: 'f-zewditu', mfrId: 'MFR-ET-14-0011',
    name: 'Zewditu Memorial Hospital', nameAm: 'ዘውዲቱ መታሰቢያ ሆስፒታል',
    type: 'general_hospital', tier: 4, ownership: 'public',
    region: 'Addis Ababa', zone: 'Kirkos Sub-city', woreda: 'Woreda 08',
    address: 'Off Kazanchis, Kirkos', poBox: 'P.O. Box 316',
    phone: '+251 11 551 8085', latitude: 9.0146, longitude: 38.7550,
    is24h: true, hasAmbulance: true,
    about: 'City general hospital; leading ART and chronic-care centre for Addis Ababa.',
  },
  {
    id: 'f-yekatit12', mfrId: 'MFR-ET-14-0012',
    name: 'Yekatit 12 Hospital Medical College', nameAm: 'የካቲት 12 ሆስፒታል ሕክምና ኮሌጅ',
    type: 'general_hospital', tier: 4, ownership: 'public',
    region: 'Addis Ababa', zone: 'Arada Sub-city', woreda: 'Woreda 05',
    address: 'Sidist Kilo, Arada', poBox: 'P.O. Box 257',
    phone: '+251 11 155 3065', latitude: 9.0450, longitude: 38.7614,
    is24h: true, hasAmbulance: true,
    about: 'City hospital and medical college; the national burns centre, strong paediatrics and neonatal ICU.',
  },
  {
    id: 'f-menelik', mfrId: 'MFR-ET-14-0013',
    name: 'Menelik II Comprehensive Specialised Hospital', nameAm: 'ዳግማዊ ምኒልክ ሆስፒታል',
    type: 'general_hospital', tier: 4, ownership: 'public',
    region: 'Addis Ababa', zone: 'Arada Sub-city', woreda: 'Woreda 09',
    address: 'Near Ministry of Foreign Affairs, Arada', poBox: 'P.O. Box 5556',
    phone: '+251 11 155 2447', latitude: 9.0397, longitude: 38.7690,
    is24h: true, hasAmbulance: false,
    about: 'Ethiopia’s oldest hospital; national referral centre for ophthalmology.',
  },
  {
    id: 'f-ghandi', mfrId: 'MFR-ET-14-0014',
    name: 'Ghandi Memorial Hospital', nameAm: 'ጋንዲ መታሰቢያ ሆስፒታል',
    type: 'general_hospital', tier: 4, ownership: 'public',
    region: 'Addis Ababa', zone: 'Kirkos Sub-city', woreda: 'Woreda 02',
    address: 'Near Addis Ababa Stadium, Kirkos', poBox: 'P.O. Box 3164',
    phone: '+251 11 551 8065', latitude: 9.0110, longitude: 38.7620,
    is24h: true, hasAmbulance: true,
    about: 'Maternity referral hospital: comprehensive emergency obstetric and newborn care, NICU.',
  },
  {
    id: 'f-ambogeneral', mfrId: 'MFR-ET-04-0201',
    name: 'Ambo General Hospital', nameAm: 'አምቦ ጠቅላላ ሆስፒታል',
    type: 'general_hospital', tier: 4, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Ambo Town',
    address: 'Ambo Town, off the Addis Ababa–Nekemte road', poBox: 'P.O. Box 06',
    phone: '+251 11 236 2291', latitude: 8.9870, longitude: 37.8550,
    is24h: true, hasAmbulance: true,
    about: 'Zonal general hospital serving West Shewa (over 2 million people).',
  },
  {
    id: 'f-guder', mfrId: 'MFR-ET-04-0202',
    name: 'Guder Primary Hospital', nameAm: 'ጉደር የመጀመሪያ ደረጃ ሆስፒታል',
    type: 'primary_hospital', tier: 3, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Toke Kutaye',
    address: 'Guder town centre', poBox: '—',
    phone: '+251 11 345 6789', latitude: 8.9650, longitude: 37.7700,
    is24h: true, hasAmbulance: true,
    about: 'Primary hospital for Toke Kutaye woreda.',
  },
  {
    id: 'f-ginchi', mfrId: 'MFR-ET-04-0203',
    name: 'Ginchi Primary Hospital', nameAm: 'ግንጪ የመጀመሪያ ደረጃ ሆስፒታል',
    type: 'primary_hospital', tier: 3, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Dendi',
    address: 'Ginchi town, on the Addis Ababa–Ambo road', poBox: '—',
    phone: '+251 11 456 7890', latitude: 9.0280, longitude: 38.1500,
    is24h: true, hasAmbulance: false,
    about: 'Primary hospital for Dendi woreda.',
  },
  {
    id: 'f-ambohc', mfrId: 'MFR-ET-04-0301',
    name: 'Ambo Health Centre', nameAm: 'አምቦ ጤና ጣቢያ',
    type: 'health_centre', tier: 2, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Ambo Town',
    address: 'Kebele 01, Ambo', poBox: '—',
    phone: '+251 11 567 8901', latitude: 8.9800, longitude: 37.8600,
    is24h: true, hasAmbulance: false,
    about: 'Urban health centre, PHCU lead for three health posts.',
  },
  {
    id: 'f-guderhc', mfrId: 'MFR-ET-04-0302',
    name: 'Guder Health Centre', nameAm: 'ጉደር ጤና ጣቢያ',
    type: 'health_centre', tier: 2, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Toke Kutaye',
    address: 'Guder 02 kebele', poBox: '—',
    phone: '+251 11 678 9012', latitude: 8.9600, longitude: 37.7750,
    is24h: true, hasAmbulance: false,
    about: 'Health centre for Guder and surrounding kebeles.',
  },
  {
    id: 'f-addisketemahc', mfrId: 'MFR-ET-14-0301',
    name: 'Addis Ketema Health Centre', nameAm: 'አዲስ ከተማ ጤና ጣቢያ',
    type: 'health_centre', tier: 2, ownership: 'public',
    region: 'Addis Ababa', zone: 'Addis Ketema Sub-city', woreda: 'Woreda 06',
    address: 'Near Merkato, Addis Ketema', poBox: '—',
    phone: '+251 11 213 4455', latitude: 9.0355, longitude: 38.7223,
    is24h: false, hasAmbulance: false,
    about: 'High-volume urban health centre serving the Merkato area.',
  },
  {
    id: 'f-kazanchishc', mfrId: 'MFR-ET-14-0302',
    name: 'Kazanchis Health Centre', nameAm: 'ካዛንቺስ ጤና ጣቢያ',
    type: 'health_centre', tier: 2, ownership: 'public',
    region: 'Addis Ababa', zone: 'Kirkos Sub-city', woreda: 'Woreda 07',
    address: 'Kazanchis, Kirkos', poBox: '—',
    phone: '+251 11 515 6677', latitude: 9.0170, longitude: 38.7660,
    is24h: false, hasAmbulance: false,
    about: 'Urban health centre; ANC, EPI, OPD and chronic-disease follow-up.',
  },
  {
    id: 'f-awaro', mfrId: 'MFR-ET-04-0401',
    name: 'Awaro Health Post', nameAm: 'አዋሮ ጤና ኬላ',
    type: 'health_post', tier: 1, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Ambo Town',
    address: 'Awaro kebele', poBox: '—',
    phone: null, latitude: 8.9950, longitude: 37.8800,
    is24h: false, hasAmbulance: false, parentPhcuId: 'f-ambohc',
    about: 'Community health post staffed by health extension workers.',
  },
  {
    id: 'f-gosukora', mfrId: 'MFR-ET-04-0402',
    name: 'Gosu Kora Health Post', nameAm: 'ጎሱ ኮራ ጤና ኬላ',
    type: 'health_post', tier: 1, ownership: 'public',
    region: 'Oromia', zone: 'West Shewa Zone', woreda: 'Toke Kutaye',
    address: 'Gosu Kora kebele', poBox: '—',
    phone: null, latitude: 8.9400, longitude: 37.7400,
    is24h: false, hasAmbulance: false, parentPhcuId: 'f-guderhc',
    about: 'Community health post staffed by health extension workers.',
  },
];

/* ========================================================== CAPABILITIES */
export const CAPABILITIES = [
  ['emergency_24h', '24-hour emergency service', 'emergency'],
  ['resuscitation', 'Resuscitation', 'emergency'],
  ['oxygen_supply', 'Oxygen supply', 'emergency'],
  ['icu_bed', 'ICU bed', 'emergency'],
  ['ventilator', 'Ventilator', 'emergency'],
  ['ambulance_available', 'Ambulance', 'emergency'],
  ['general_surgery', 'General surgery', 'surgical'],
  ['caesarean_section', 'Caesarean section', 'surgical'],
  ['anaesthesia_general', 'General anaesthesia', 'surgical'],
  ['anaesthesia_spinal', 'Spinal anaesthesia', 'surgical'],
  ['orthopaedic_surgery', 'Orthopaedic surgery', 'surgical'],
  ['neurosurgery', 'Neurosurgery', 'surgical'],
  ['burns_care', 'Burns care', 'surgical'],
  ['bemonc', 'Basic emergency obstetric & newborn care', 'obstetric'],
  ['cemonc', 'Comprehensive emergency obstetric & newborn care', 'obstetric'],
  ['neonatal_icu', 'Neonatal ICU', 'obstetric'],
  ['blood_transfusion', 'Blood transfusion', 'obstetric'],
  ['magnesium_sulphate', 'Magnesium sulphate', 'obstetric'],
  ['xray', 'X-ray', 'imaging'],
  ['ultrasound', 'Ultrasound', 'imaging'],
  ['ct_scan', 'CT scan', 'imaging'],
  ['mri', 'MRI', 'imaging'],
  ['ecg', 'ECG', 'imaging'],
  ['basic_lab', 'Basic laboratory', 'laboratory'],
  ['haematology', 'Haematology', 'laboratory'],
  ['biochemistry', 'Biochemistry', 'laboratory'],
  ['blood_bank', 'Blood bank', 'laboratory'],
  ['tb_genexpert', 'TB GeneXpert', 'laboratory'],
  ['histopathology', 'Histopathology', 'laboratory'],
  ['internal_medicine', 'Internal medicine', 'specialist'],
  ['paediatrics', 'Paediatrics', 'specialist'],
  ['obgyn', 'Obstetrics & gynaecology', 'specialist'],
  ['psychiatry', 'Psychiatry', 'specialist'],
  ['ophthalmology', 'Ophthalmology', 'specialist'],
  ['oncology', 'Oncology', 'specialist'],
  ['dialysis', 'Dialysis', 'specialist'],
  ['art_clinic', 'ART clinic', 'programme'],
  ['tb_treatment', 'TB treatment', 'programme'],
  ['malnutrition_otp', 'Outpatient therapeutic programme', 'programme'],
  ['malnutrition_sc', 'Stabilisation centre', 'programme'],
  ['gbv_care', 'GBV care', 'programme'],
].map(([code, name, category]) => ({ code, name, category }));

const ALL_CODES = CAPABILITIES.map((c) => c.code);
const HC_PACKAGE = ['bemonc', 'magnesium_sulphate', 'basic_lab', 'ultrasound', 'oxygen_supply',
  'art_clinic', 'tb_treatment', 'tb_genexpert', 'malnutrition_otp', 'malnutrition_sc',
  'gbv_care', 'emergency_24h'];

function caps(facilityId, codes, { verifiedDaysAgo = 2, verifiedBy = null } = {}) {
  return codes.map((code) => ({
    facilityId, code, status: 'available', note: null,
    verifiedAt: dAgo(verifiedDaysAgo), verifiedBy,
  }));
}

export function seedFacilityCapabilities() {
  const rows = [
    ...caps('f-blacklion', ALL_CODES, { verifiedDaysAgo: 1, verifiedBy: 'Sr Selamawit Bekele (liaison)' }),
    ...caps('f-stpauls', ALL_CODES.filter((c) => c !== 'burns_care'), { verifiedDaysAgo: 2, verifiedBy: 'Sr Meron Tulu (liaison)' }),
    ...caps('f-stpeters', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'icu_bed', 'xray', 'ecg',
      'basic_lab', 'haematology', 'biochemistry', 'tb_genexpert', 'tb_treatment', 'internal_medicine'], { verifiedDaysAgo: 3 }),
    ...caps('f-amanuel', ['psychiatry', 'emergency_24h', 'oxygen_supply', 'basic_lab', 'internal_medicine'], { verifiedDaysAgo: 4 }),
    ...caps('f-alert', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'general_surgery',
      'orthopaedic_surgery', 'anaesthesia_general', 'anaesthesia_spinal', 'xray', 'ultrasound',
      'basic_lab', 'haematology', 'histopathology'], { verifiedDaysAgo: 2 }),
    ...caps('f-zewditu', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'icu_bed', 'general_surgery',
      'caesarean_section', 'anaesthesia_general', 'anaesthesia_spinal', 'bemonc', 'cemonc',
      'blood_transfusion', 'magnesium_sulphate', 'xray', 'ultrasound', 'ecg', 'basic_lab',
      'haematology', 'biochemistry', 'blood_bank', 'internal_medicine', 'paediatrics', 'obgyn',
      'art_clinic', 'tb_treatment', 'gbv_care'], { verifiedDaysAgo: 1, verifiedBy: 'Sr Hiwot Kassa (liaison)' }),
    ...caps('f-yekatit12', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'icu_bed', 'ventilator',
      'general_surgery', 'caesarean_section', 'anaesthesia_general', 'anaesthesia_spinal', 'burns_care',
      'bemonc', 'cemonc', 'neonatal_icu', 'blood_transfusion', 'magnesium_sulphate', 'xray',
      'ultrasound', 'ct_scan', 'ecg', 'basic_lab', 'haematology', 'biochemistry', 'blood_bank',
      'internal_medicine', 'paediatrics', 'obgyn'], { verifiedDaysAgo: 1 }),
    ...caps('f-menelik', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'general_surgery',
      'anaesthesia_general', 'anaesthesia_spinal', 'ophthalmology', 'xray', 'ct_scan', 'basic_lab',
      'haematology', 'internal_medicine'], { verifiedDaysAgo: 5 }),
    ...caps('f-ghandi', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'bemonc', 'cemonc',
      'caesarean_section', 'anaesthesia_general', 'anaesthesia_spinal', 'neonatal_icu',
      'blood_transfusion', 'magnesium_sulphate', 'obgyn', 'ultrasound', 'basic_lab', 'blood_bank'], { verifiedDaysAgo: 1 }),
    ...caps('f-ambogeneral', ALL_CODES.filter((c) =>
      !['oncology', 'dialysis', 'mri', 'neurosurgery', 'histopathology', 'ventilator', 'psychiatry', 'ophthalmology', 'burns_care'].includes(c)),
      { verifiedDaysAgo: 2, verifiedBy: 'Sr Hanna Girma (liaison)' }),
    // Guder: the demo moment — anaesthetist on leave
    ...caps('f-guder', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'ambulance_available',
      'bemonc', 'blood_transfusion', 'magnesium_sulphate', 'basic_lab', 'haematology', 'blood_bank',
      'ultrasound', 'xray', 'paediatrics', 'obgyn', 'internal_medicine'], { verifiedDaysAgo: 1, verifiedBy: 'Sr Bethlehem Tadesse (liaison)' }),
    ...caps('f-ginchi', ['emergency_24h', 'resuscitation', 'oxygen_supply', 'bemonc', 'cemonc',
      'caesarean_section', 'anaesthesia_general', 'anaesthesia_spinal', 'blood_transfusion',
      'magnesium_sulphate', 'general_surgery', 'basic_lab', 'blood_bank', 'ultrasound', 'xray',
      'obgyn', 'paediatrics'], { verifiedDaysAgo: 5 }),
    ...caps('f-ambohc', HC_PACKAGE, { verifiedDaysAgo: 4 }),
    ...caps('f-guderhc', HC_PACKAGE, { verifiedDaysAgo: 4 }),
    ...caps('f-addisketemahc', HC_PACKAGE, { verifiedDaysAgo: 3 }),
    ...caps('f-kazanchishc', HC_PACKAGE, { verifiedDaysAgo: 3 }),
    ...caps('f-awaro', ['malnutrition_otp'], { verifiedDaysAgo: 7 }),
    ...caps('f-gosukora', ['malnutrition_otp'], { verifiedDaysAgo: 7 }),
  ];

  // Guder's anaesthesia outage — visible exclusion reason (the routing moat)
  const guderOut = [
    ['cemonc', 'degraded'], ['caesarean_section', 'unavailable'],
    ['anaesthesia_general', 'unavailable'], ['anaesthesia_spinal', 'unavailable'],
    ['general_surgery', 'degraded'], ['neonatal_icu', 'unavailable'],
  ];
  for (const [code, status] of guderOut) {
    const existing = rows.find((r) => r.facilityId === 'f-guder' && r.code === code);
    const note = ['caesarean_section', 'anaesthesia_general', 'anaesthesia_spinal'].includes(code)
      ? 'No anaesthetist on site since Tuesday — locum expected in 6 days' : null;
    if (existing) { existing.status = status; existing.note = note; }
    else rows.push({ facilityId: 'f-guder', code, status, note, verifiedAt: dAgo(1), verifiedBy: 'Sr Bethlehem Tadesse (liaison)' });
  }

  // Zewditu CT scanner down — another honest exclusion
  rows.push({
    facilityId: 'f-zewditu', code: 'ct_scan', status: 'unavailable',
    note: 'CT scanner under maintenance — engineer scheduled this week',
    verifiedAt: dAgo(1), verifiedBy: 'Sr Hiwot Kassa (liaison)',
  });
  return rows;
}

/* ============================================================== CAPACITY */
export function seedCapacity() {
  const c = (facilityId, wardType, bedsTotal, bedsFree, hoursAgo, reportedBy) => ({
    facilityId, wardType, bedsTotal, bedsFree, reportedAt: hAgo(hoursAgo), reportedBy,
  });
  return [
    c('f-blacklion', 'general', 700, 18, 2, 'Sr Selamawit Bekele'),
    c('f-blacklion', 'maternity', 80, 5, 2, 'Sr Selamawit Bekele'),
    c('f-blacklion', 'icu', 24, 1, 2, 'Sr Selamawit Bekele'),
    c('f-blacklion', 'paediatric', 90, 7, 2, 'Sr Selamawit Bekele'),
    c('f-stpauls', 'general', 400, 26, 1, 'Sr Meron Tulu'),
    c('f-stpauls', 'maternity', 70, 9, 1, 'Sr Meron Tulu'),
    c('f-stpauls', 'icu', 20, 2, 1, 'Sr Meron Tulu'),
    c('f-zewditu', 'general', 200, 14, 3, 'Sr Hiwot Kassa'),
    c('f-zewditu', 'maternity', 40, 6, 3, 'Sr Hiwot Kassa'),
    c('f-yekatit12', 'general', 220, 11, 2, 'Sr Marta Gebre'),
    c('f-yekatit12', 'maternity', 45, 4, 2, 'Sr Marta Gebre'),
    c('f-yekatit12', 'paediatric', 60, 9, 2, 'Sr Marta Gebre'),
    c('f-ghandi', 'maternity', 120, 15, 1, 'Sr Lensa Chala'),
    c('f-menelik', 'general', 150, 20, 6, 'duty liaison'),
    c('f-alert', 'general', 180, 24, 5, 'duty liaison'),
    c('f-stpeters', 'general', 110, 13, 8, 'duty liaison'),
    c('f-amanuel', 'general', 300, 35, 12, 'duty liaison'),
    c('f-ambogeneral', 'general', 150, 31, 1, 'Sr Hanna Girma'),
    c('f-ambogeneral', 'maternity', 40, 9, 1, 'Sr Hanna Girma'),
    c('f-ambogeneral', 'paediatric', 30, 7, 1, 'Sr Hanna Girma'),
    c('f-guder', 'general', 50, 12, 3, 'Sr Bethlehem Tadesse'),
    c('f-guder', 'maternity', 15, 6, 3, 'Sr Bethlehem Tadesse'),
    c('f-ginchi', 'general', 40, 8, 30, 'Sr Rahel Worku'),
    c('f-ginchi', 'maternity', 12, 3, 30, 'Sr Rahel Worku'),
  ];
}

/* =========================================================== REASON CODES */
export const REASON_CODES = [
  { code: 'severe_pre_eclampsia', name: 'Severe pre-eclampsia / eclampsia', nameAm: 'ከባድ የእርግዝና ግፊት', category: 'obstetric', defaultUrgency: 'emergency', minTargetTier: 3,
    requiredCapabilities: ['cemonc', 'caesarean_section', 'anaesthesia_general', 'blood_transfusion', 'magnesium_sulphate'],
    stabilisationItems: ['MgSO4 loading dose given', 'Antihypertensive given', 'IV line established', 'Urinary catheter inserted', 'Left lateral position', 'BP rechecked before transfer'] },
  { code: 'obstructed_labour', name: 'Obstructed / prolonged labour', nameAm: 'የተስተጓጎለ ምጥ', category: 'obstetric', defaultUrgency: 'emergency', minTargetTier: 3,
    requiredCapabilities: ['cemonc', 'caesarean_section', 'anaesthesia_general', 'blood_transfusion'],
    stabilisationItems: ['IV fluids started', 'Bladder emptied', 'Fetal heart rate documented', 'Antibiotics given if indicated'] },
  { code: 'postpartum_haemorrhage', name: 'Postpartum haemorrhage', nameAm: 'ከወሊድ በኋላ ደም መፍሰስ', category: 'obstetric', defaultUrgency: 'emergency', minTargetTier: 3,
    requiredCapabilities: ['cemonc', 'blood_transfusion', 'general_surgery'],
    stabilisationItems: ['Uterine massage performed', 'Oxytocin given', 'Two IV lines established', 'Blood loss estimated'] },
  { code: 'neonatal_sepsis', name: 'Possible serious bacterial infection (neonate)', nameAm: 'የአራስ ኢንፌክሽን', category: 'paediatric', defaultUrgency: 'emergency', minTargetTier: 3,
    requiredCapabilities: ['paediatrics', 'neonatal_icu', 'oxygen_supply'],
    stabilisationItems: ['First dose antibiotic given', 'Kept warm / skin-to-skin', 'Blood glucose checked', 'Feeding supported'] },
  { code: 'severe_pneumonia_child', name: 'Severe pneumonia (under 5)', nameAm: 'ከባድ የሳምባ ምች', category: 'paediatric', defaultUrgency: 'emergency', minTargetTier: 3,
    requiredCapabilities: ['paediatrics', 'oxygen_supply', 'xray'],
    stabilisationItems: ['First dose antibiotic given', 'Oxygen given if available', 'Respiratory rate documented'] },
  { code: 'severe_acute_malnutrition', name: 'Severe acute malnutrition with complications', nameAm: 'ከባድ የምግብ እጥረት', category: 'paediatric', defaultUrgency: 'urgent', minTargetTier: 2,
    requiredCapabilities: ['malnutrition_sc', 'paediatrics'],
    stabilisationItems: ['MUAC measured', 'Appetite test done', 'F-75 started if available', 'Hypoglycaemia treated'] },
  { code: 'major_trauma', name: 'Major trauma', nameAm: 'ከባድ አደጋ', category: 'emergency', defaultUrgency: 'emergency', minTargetTier: 3,
    requiredCapabilities: ['general_surgery', 'anaesthesia_general', 'blood_transfusion', 'xray', 'resuscitation'],
    stabilisationItems: ['Airway secured', 'Bleeding controlled', 'IV access established', 'GCS documented', 'Fracture immobilised'] },
  { code: 'acute_abdomen', name: 'Acute abdomen', nameAm: 'ከባድ የሆድ ህመም', category: 'surgical', defaultUrgency: 'urgent', minTargetTier: 3,
    requiredCapabilities: ['general_surgery', 'anaesthesia_general', 'ultrasound', 'basic_lab'],
    stabilisationItems: ['Nil by mouth', 'IV fluids started', 'Analgesia given', 'Vitals documented'] },
  { code: 'burns_severe', name: 'Severe burns (>15% TBSA or airway)', nameAm: 'ከባድ ቃጠሎ', category: 'surgical', defaultUrgency: 'emergency', minTargetTier: 4,
    requiredCapabilities: ['burns_care', 'resuscitation', 'oxygen_supply'],
    stabilisationItems: ['Airway assessed', 'IV fluids per Parkland started', 'Burns cooled and covered', 'Analgesia given', 'TBSA estimated'] },
  { code: 'suspected_cancer', name: 'Suspected malignancy', nameAm: 'የካንሰር ጥርጣሬ', category: 'oncology', defaultUrgency: 'routine', minTargetTier: 5,
    requiredCapabilities: ['oncology', 'histopathology'],
    stabilisationItems: ['Biopsy taken if capable', 'Previous investigations attached'] },
  { code: 'renal_failure', name: 'Renal failure requiring dialysis', nameAm: 'የኩላሊት ህመም', category: 'specialist', defaultUrgency: 'urgent', minTargetTier: 5,
    requiredCapabilities: ['dialysis', 'internal_medicine', 'biochemistry'],
    stabilisationItems: ['Fluid balance documented', 'Creatinine result attached'] },
  { code: 'tb_diagnostic', name: 'TB diagnostic referral', nameAm: 'የቲቢ ምርመራ', category: 'programme', defaultUrgency: 'routine', minTargetTier: 2,
    requiredCapabilities: ['tb_genexpert'],
    stabilisationItems: ['Sputum sample collected', 'Symptom screen documented'] },
  { code: 'imaging_ct', name: 'CT imaging required', nameAm: 'የሲቲ ምርመራ', category: 'diagnostic', defaultUrgency: 'routine', minTargetTier: 4,
    requiredCapabilities: ['ct_scan'],
    stabilisationItems: ['Clinical question stated', 'Previous imaging attached'] },
  { code: 'mental_health', name: 'Mental health assessment', nameAm: 'የአእምሮ ጤና ምርመራ', category: 'specialist', defaultUrgency: 'routine', minTargetTier: 4,
    requiredCapabilities: ['psychiatry'],
    stabilisationItems: ['Risk assessment documented', 'Current medication listed'] },
  { code: 'eye_emergency', name: 'Eye injury / sudden vision loss', nameAm: 'የዓይን አደጋ', category: 'specialist', defaultUrgency: 'urgent', minTargetTier: 4,
    requiredCapabilities: ['ophthalmology'],
    stabilisationItems: ['Eye shielded (no pressure)', 'Nil by mouth if surgical', 'Visual acuity documented'] },
  { code: 'back_referral_followup', name: 'Back-referral for follow-up care', nameAm: 'ለክትትል ወደ ታች ሪፈራል', category: 'followup', defaultUrgency: 'routine', minTargetTier: 2,
    requiredCapabilities: [],
    stabilisationItems: ['Discharge summary attached', 'Follow-up plan explained to patient'] },
];

/* ================================================================= USERS */
/**
 * Every account is registered to exactly ONE facility by that facility's IT
 * administrator; only `status: 'active'` accounts can act. This is what makes
 * "a Black Lion referral can only come from Black Lion staff" true.
 * Demo password for every account: Password123!
 */
export function seedUsers() {
  const u = (id, username, fullName, role, facilityId, phone, extra = {}) => ({
    id, username, fullName, role, facilityId, phone,
    status: 'active', createdAt: dAgo(120), verifiedAt: dAgo(119),
    verifiedBy: extra.verifiedBy ?? 'Facility IT administrator',
    password: 'Password123!',
    ...extra,
  });
  return [
    /* ---- Tikur Anbessa (Black Lion) */
    u('u-dr-tigist', 'dr.tigist', 'Dr Tigist Alemu', 'doctor', 'f-blacklion', '+251 91 100 0101',
      { title: 'Consultant Obstetrician-Gynaecologist', licenseNumber: 'MOH-MD-10432', department: 'Obstetrics & Gynaecology' }),
    u('u-dr-binyam', 'dr.binyam', 'Dr Binyam Assefa', 'doctor', 'f-blacklion', '+251 91 100 0102',
      { title: 'General Surgeon', licenseNumber: 'MOH-MD-11207', department: 'Surgery' }),
    u('u-liaison-blacklion', 'liaison.blacklion', 'Sr Selamawit Bekele', 'liaison', 'f-blacklion', '+251 91 100 0103',
      { title: 'Referral Liaison Officer', department: 'Referral Office' }),
    u('u-it-blacklion', 'it.blacklion', 'Natnael Tesfaye', 'it_admin', 'f-blacklion', '+251 91 100 0104',
      { title: 'Hospital IT Administrator', department: 'ICT' }),
    // Pending doctor — the IT verification demo
    { id: 'u-dr-yonas', username: 'dr.yonas', fullName: 'Dr Yonas Getachew', role: 'doctor',
      facilityId: 'f-blacklion', phone: '+251 91 100 0105', status: 'pending',
      title: 'Emergency Physician', licenseNumber: 'MOH-MD-13990', department: 'Emergency Medicine',
      createdAt: hAgo(20), verifiedAt: null, verifiedBy: null, password: 'Password123!' },

    /* ---- St. Paul's */
    u('u-dr-mulu', 'dr.mulu', 'Dr Mulu Habte', 'doctor', 'f-stpauls', '+251 91 100 0201',
      { title: 'Trauma Surgeon', licenseNumber: 'MOH-MD-09811', department: 'Surgery' }),
    u('u-liaison-stpauls', 'liaison.stpauls', 'Sr Meron Tulu', 'liaison', 'f-stpauls', '+251 91 100 0202',
      { title: 'Referral Liaison Officer', department: 'Referral Office' }),
    u('u-it-stpauls', 'it.stpauls', 'Eyob Alemayehu', 'it_admin', 'f-stpauls', '+251 91 100 0203',
      { title: 'Hospital IT Administrator', department: 'ICT' }),

    /* ---- Addis city hospitals */
    u('u-dr-samuel', 'dr.samuel', 'Dr Samuel Worku', 'doctor', 'f-zewditu', '+251 91 100 0301',
      { title: 'Internist', licenseNumber: 'MOH-MD-12055', department: 'Internal Medicine' }),
    u('u-liaison-zewditu', 'liaison.zewditu', 'Sr Hiwot Kassa', 'liaison', 'f-zewditu', '+251 91 100 0302',
      { title: 'Referral Liaison Officer', department: 'Referral Office' }),
    u('u-liaison-y12', 'liaison.y12', 'Sr Marta Gebre', 'liaison', 'f-yekatit12', '+251 91 100 0401',
      { title: 'Referral Liaison Officer', department: 'Referral Office' }),
    u('u-liaison-ghandi', 'liaison.ghandi', 'Sr Lensa Chala', 'liaison', 'f-ghandi', '+251 91 100 0501',
      { title: 'Referral Liaison Officer', department: 'Referral Office' }),

    /* ---- West Shewa chain */
    u('u-dr-abdi', 'dr.abdi', 'Dr Abdi Gemechu', 'doctor', 'f-ambogeneral', '+251 91 100 0601',
      { title: 'Medical Director, General Practitioner', licenseNumber: 'MOH-MD-08122', department: 'Medical Directorate' }),
    u('u-liaison-ambo', 'liaison.ambo', 'Sr Hanna Girma', 'liaison', 'f-ambogeneral', '+251 91 100 0602',
      { title: 'Referral Liaison Officer', department: 'Referral Office' }),
    u('u-triage-ambo', 'triage.ambo', 'Nurse Dawit Mekonnen', 'triage', 'f-ambogeneral', '+251 91 100 0603',
      { title: 'Emergency Triage Nurse', department: 'Emergency' }),
    u('u-admin-ambo', 'admin.ambo', 'Ato Girma Wolde', 'facility_admin', 'f-ambogeneral', '+251 91 100 0604',
      { title: 'Hospital Administrator' }),
    u('u-it-ambo', 'it.ambo', 'Kalkidan Mengistu', 'it_admin', 'f-ambogeneral', '+251 91 100 0605',
      { title: 'Hospital IT Administrator', department: 'ICT' }),
    u('u-liaison-guder', 'liaison.guder', 'Sr Bethlehem Tadesse', 'liaison', 'f-guder', '+251 91 100 0701',
      { title: 'Referral Liaison Officer' }),
    u('u-liaison-ginchi', 'liaison.ginchi', 'Sr Rahel Worku', 'liaison', 'f-ginchi', '+251 91 100 0801',
      { title: 'Referral Liaison Officer' }),
    u('u-dr-kebede', 'dr.kebede', 'Dr Kebede Tesfaye', 'doctor', 'f-ambohc', '+251 91 100 0901',
      { title: 'General Practitioner', licenseNumber: 'MOH-MD-14501', department: 'OPD' }),
    u('u-cl-guderhc', 'dr.meseret', 'Dr Meseret Alemu', 'doctor', 'f-guderhc', '+251 91 100 0902',
      { title: 'Health Officer', licenseNumber: 'MOH-HO-22140', department: 'OPD' }),
    u('u-dr-selam', 'dr.selam', 'Dr Selam Fikre', 'doctor', 'f-addisketemahc', '+251 91 100 0903',
      { title: 'General Practitioner', licenseNumber: 'MOH-MD-15320', department: 'OPD' }),
    u('u-dr-dawit', 'dr.dawit', 'Dr Dawit Lemma', 'doctor', 'f-kazanchishc', '+251 91 100 0904',
      { title: 'General Practitioner', licenseNumber: 'MOH-MD-15877', department: 'OPD' }),
    u('u-hew-awaro', 'hew.awaro', 'Almaz Bekele', 'hew', 'f-awaro', '+251 91 100 1001',
      { title: 'Health Extension Worker' }),
    u('u-hew-gosu', 'hew.gosu', 'Tigist Haile', 'hew', 'f-gosukora', '+251 91 100 1002',
      { title: 'Health Extension Worker' }),

    /* ---- oversight & system */
    u('u-woreda-ws', 'woreda.ws', 'W/ro Sara Negash', 'woreda', 'f-ambogeneral', '+251 91 100 1101',
      { title: 'West Shewa Zonal Health Department' }),
    u('u-rhb-aa', 'rhb.aa', 'Ato Fikru Desta', 'region', 'f-blacklion', '+251 91 100 1102',
      { title: 'Addis Ababa Health Bureau — Referral Coordination' }),
    u('u-sysadmin', 'sysadmin', 'System Administrator', 'sysadmin', 'f-blacklion', '+251 91 100 1103',
      { title: 'National platform administrator' }),

    /* ---- patients (portal accounts, created when a referral is registered) */
    u('u-pt-abeba', 'abeba.k', 'Abeba Kassahun', 'patient', null, '+251 91 200 0001', { patientId: 'p-001' }),
    u('u-pt-roba', 'roba.d', 'Roba Dinsa', 'patient', null, '+251 91 200 0002', { patientId: 'p-002' }),
    u('u-pt-hanna', 'hanna.t', 'Hanna Tulu', 'patient', null, '+251 91 200 0003', { patientId: 'p-003' }),
  ];
}

/* =============================================================== PATIENTS */
export function seedPatients() {
  const p = (id, name, nameAm, sex, ageValue, extra = {}) => ({
    id, name, nameAm, sex, ageValue, ageUnit: 'years',
    cbhiMember: false, isPregnant: false, createdAt: dAgo(60), ...extra,
  });
  return [
    p('p-001', 'Abeba Kassahun Wolde', 'አበባ ካሳሁን', 'female', 27,
      { isPregnant: true, cbhiMember: true, phone: '+251 91 200 0001', woreda: 'Ambo Town', region: 'Oromia' }),
    p('p-002', 'Roba Dinsa Gutema', 'ሮባ ዲንሳ', 'male', 41,
      { cbhiMember: true, phone: '+251 91 200 0002', woreda: 'Toke Kutaye', region: 'Oromia' }),
    p('p-003', 'Hanna Tulu Bekele', 'ሃና ቱሉ', 'female', 34,
      { phone: '+251 91 200 0003', woreda: 'Woreda 06', region: 'Addis Ababa' }),
    p('p-004', 'Chaltu Fufa Dibaba', 'ጫልቱ ፉፋ', 'female', 22,
      { isPregnant: true, cbhiMember: true, phone: '+251 91 200 0004', woreda: 'Dendi', region: 'Oromia' }),
    p('p-005', 'Mohammed Jemal Kedir', 'መሐመድ ጀማል', 'male', 58,
      { phone: '+251 91 200 0005', woreda: 'Woreda 07', region: 'Addis Ababa' }),
    p('p-006', 'Bezawit Alemu Teka', 'ቤዛዊት አለሙ', 'female', 4,
      { phone: '+251 91 200 0006', woreda: 'Ambo Town', region: 'Oromia', cbhiMember: true }),
    p('p-007', 'Getahun Merga Olana', 'ጌታሁን መርጋ', 'male', 63,
      { phone: '+251 91 200 0007', woreda: 'Toke Kutaye', region: 'Oromia', cbhiMember: true }),
    p('p-008', 'Selamawit Yohannes', 'ሰላማዊት ዮሐንስ', 'female', 30,
      { phone: '+251 91 200 0008', woreda: 'Woreda 08', region: 'Addis Ababa' }),
  ];
}

/* ============================================================ ATTACHMENTS */
/** Tiny inline SVG placeholders standing in for real DICOM/PDF exports. */
const svgDataUrl = (label, sub) => 'data:image/svg+xml;base64,' + btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
    <rect width="640" height="480" fill="#0b1220"/>
    <circle cx="320" cy="230" r="150" fill="none" stroke="#7dd3fc" stroke-width="3" opacity="0.75"/>
    <ellipse cx="320" cy="235" rx="95" ry="130" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.6"/>
    <text x="320" y="60" fill="#e2e8f0" font-family="monospace" font-size="22" text-anchor="middle">${label}</text>
    <text x="320" y="440" fill="#94a3b8" font-family="monospace" font-size="15" text-anchor="middle">${sub} - demo image, not a clinical record</text>
  </svg>`,
);

export const demoAttachment = (kind) => {
  if (kind === 'xray') return { name: 'chest-xray-AP.svg', type: 'image/svg+xml', size: 1900, dataUrl: svgDataUrl('CHEST X-RAY (AP)', 'Portable, supine') };
  if (kind === 'ct') return { name: 'head-ct-axial.svg', type: 'image/svg+xml', size: 1900, dataUrl: svgDataUrl('HEAD CT - AXIAL', 'Non-contrast') };
  return { name: 'ultrasound-obstetric.svg', type: 'image/svg+xml', size: 1900, dataUrl: svgDataUrl('OBSTETRIC ULTRASOUND', '32w scan') };
};

/* ============================================================== REFERRALS */
let codeCounter = 0;
const CODES = ['ERL-K7PM-42', 'ERL-W3XR-88', 'ERL-N9QT-15', 'ERL-D4FH-63', 'ERL-B8KL-27',
  'ERL-M2VC-91', 'ERL-T6JW-54', 'ERL-P5RD-36', 'ERL-G7NB-72', 'ERL-H4SX-19',
  'ERL-C9MF-85', 'ERL-L3TQ-47', 'ERL-V8WK-23', 'ERL-F6PZ-68', 'ERL-R2DH-31',
  'ERL-X5GJ-79', 'ERL-Q7CM-14', 'ERL-J4LN-56', 'ERL-Z8BT-92', 'ERL-S3VR-38',
  'ERL-E6KP-61', 'ERL-U9FW-25', 'ERL-A2QG-83', 'ERL-Y7HD-49', 'ERL-O4JX-17'];
const nextCode = () => CODES[codeCounter++ % CODES.length];

/**
 * Compact referral builder. `path` is a list of [event, minutesAgo, extra]
 * applied in order from DRAFT; timestamps and status follow from the machine.
 */
function mkReferral(spec) {
  const {
    id, patientId, reason, urgency, originId, originUser, targetId, targetUser,
    diagnosis, daysAgo, path = [], overrideReason = null, suggestionRank = null,
    tierSkipReason = null, clinical = {}, preReferral = {}, attachments = [],
    declineReason = null, declineNote = null, outcome = null, distanceKm = null,
    travelMinutes = null,
  } = spec;

  const createdAt = dAgo(daysAgo);
  const t0 = new Date(createdAt).getTime();
  const at = (offsetMin) => new Date(t0 + offsetMin * 60000).toISOString();

  const r = {
    id, code: nextCode(), chainRootId: id, parentId: null,
    patientId, status: 'DRAFT', urgency, referralType: 'up',
    originFacilityId: originId, targetFacilityId: targetId,
    referringUserId: originUser.id, referringUserName: originUser.fullName,
    referringUserPhone: originUser.phone, referringUserTitle: originUser.title || null,
    referringUserLicense: originUser.licenseNumber || null,
    reasonCode: reason, provisionalDiagnosis: diagnosis,
    suggestionRankOfChosen: suggestionRank, overrideReason, tierSkipReason,
    clinical, preReferral, attachments,
    emergencyOverride: false, emergencyOverrideReason: null,
    lawfulBasis: urgency === 'emergency' ? 'vital_interest' : 'consent',
    distanceKm, estimatedTravelMinutes: travelMinutes,
    bedReserved: false, bedReservationExpiresAt: null, reservedWardType: null,
    receivingClinicianName: null, receivingClinicianPhone: null,
    declineReason: null, declineNote: null, decision: null, decisionAt: null,
    slaDeadlineAt: null, slaBreached: false, escalationLevel: 0,
    departedAt: null, transportMode: null, escortType: null,
    arrivedAt: null, arrivalMethod: null, transitMinutes: null,
    outcome: null, outcomeSubmittedAt: null, outcomeAcknowledgedAt: null,
    createdOffline: false, syncLagMinutes: 0, version: 1,
    createdAt, updatedAt: createdAt,
    transitions: [{ from: null, to: 'DRAFT', event: 'create', actorName: originUser.fullName, at: createdAt }],
  };

  let offset = 0;
  for (const [event, plusMin, extra = {}] of path) {
    offset += plusMin;
    const from = r.status;
    // Trust the seed paths; mirror the effects the API applies.
    const map = {
      submit: 'SUBMITTED', acknowledge: 'ACKNOWLEDGED', accept: 'ACCEPTED',
      decline: 'DECLINED', reroute: 'SUBMITTED', depart: 'IN_TRANSIT',
      arrive: 'ARRIVED', start_care: 'IN_CARE', submit_outcome: 'OUTCOME_RETURNED',
      acknowledge_outcome: 'CLOSED_COMPLETED', sla_breach: 'ESCALATED',
      cancel: 'CLOSED_CANCELLED', close_declined_all: 'CLOSED_DECLINED_ALL',
    };
    r.status = map[event] || r.status;
    r.updatedAt = at(offset);
    const tr = { from, to: r.status, event, actorName: extra.actorName || targetUser?.fullName || originUser.fullName, at: at(offset), note: extra.note || null, reasonCode: extra.reasonCode || null };
    r.transitions.push(tr);

    if (event === 'submit' || event === 'reroute') {
      const sla = { emergency: 5, urgent: 30, routine: 240 }[urgency];
      r.slaDeadlineAt = at(offset + sla);
      if (extra.targetId) { r.targetFacilityId = extra.targetId; r.declineReason = null; r.decision = null; }
    }
    if (event === 'acknowledge') { r.acknowledgedAt = at(offset); }
    if (event === 'accept') {
      r.decision = 'accepted'; r.decisionAt = at(offset);
      r.receivingClinicianName = extra.clinician || targetUser?.fullName || 'Duty clinician';
      r.receivingClinicianPhone = extra.clinicianPhone || targetUser?.phone || null;
      if (extra.bedReserved) { r.bedReserved = true; r.reservedWardType = extra.wardType || 'general'; }
    }
    if (event === 'decline') {
      r.decision = 'declined'; r.decisionAt = at(offset);
      r.declineReason = extra.reasonCode || declineReason || 'no_bed';
      r.declineNote = extra.note || declineNote || null;
      tr.reasonCode = r.declineReason;
    }
    if (event === 'depart') { r.departedAt = at(offset); r.transportMode = extra.transportMode || 'ambulance'; r.escortType = extra.escortType || 'nurse'; }
    if (event === 'arrive') {
      r.arrivedAt = at(offset); r.arrivalMethod = 'code_entry';
      if (r.departedAt) r.transitMinutes = Math.round((new Date(r.arrivedAt) - new Date(r.departedAt)) / 60000);
    }
    if (event === 'submit_outcome') { r.outcome = extra.outcome || outcome; r.outcomeSubmittedAt = at(offset); }
    if (event === 'acknowledge_outcome') { r.outcomeAcknowledgedAt = at(offset); }
    if (event === 'sla_breach') { r.slaBreached = true; r.escalationLevel = 1; }
    r.version += 1;
  }
  return r;
}

export function seedReferrals(users) {
  const U = Object.fromEntries(users.map((x) => [x.id, x]));
  const done = (finalDiagnosis, disposition, treatment, followUp) => ({
    finalDiagnosis, disposition, treatmentProvided: treatment, followUpInstructions: followUp, followUpRequired: !!followUp,
  });

  const rows = [
    /* ---------- the live demo referral: Abeba, severe pre-eclampsia ---------- */
    mkReferral({
      id: 'r-live-001', patientId: 'p-001', reason: 'severe_pre_eclampsia', urgency: 'emergency',
      originId: 'f-ambohc', originUser: U['u-dr-kebede'], targetId: 'f-ambogeneral', targetUser: U['u-liaison-ambo'],
      diagnosis: 'Severe pre-eclampsia at 36 weeks, BP 168/112, proteinuria +3', daysAgo: 0.02,
      suggestionRank: 1, distanceKm: 1.2, travelMinutes: 6,
      clinical: { presentingComplaint: 'Severe headache, blurred vision, epigastric pain', bpSystolic: 168, bpDiastolic: 112, pulse: 104, respRate: 22, temperatureC: 36.9, spo2: 96, gestationalAgeWeeks: 36 },
      preReferral: { stabilisationGiven: ['MgSO4 loading dose given', 'IV line established', 'Left lateral position'], treatmentGiven: 'MgSO4 4g IV loading over 20 min; hydralazine 5mg IV at 14:05' },
      attachments: [{ id: 'att-live-1', ...demoAttachment('us'), uploadedBy: 'Dr Kebede Tesfaye', uploadedAt: minAgo(25) }],
      path: [['submit', 2]],
    }),

    /* ---------- an inbound at Black Lion from Zewditu (needs dialysis) ------- */
    mkReferral({
      id: 'r-live-002', patientId: 'p-005', reason: 'renal_failure', urgency: 'urgent',
      originId: 'f-zewditu', originUser: U['u-dr-samuel'], targetId: 'f-blacklion', targetUser: U['u-liaison-blacklion'],
      diagnosis: 'CKD stage 5, creatinine 9.8 mg/dL, needs urgent dialysis', daysAgo: 0.1,
      suggestionRank: 1, distanceKm: 4.8, travelMinutes: 18,
      clinical: { presentingComplaint: 'Oliguria, generalised oedema, fatigue', bpSystolic: 176, bpDiastolic: 102, pulse: 92, respRate: 20, temperatureC: 36.7, spo2: 95 },
      preReferral: { stabilisationGiven: ['Fluid balance documented', 'Creatinine result attached'], treatmentGiven: 'Fluid restriction; furosemide 80mg IV' },
      attachments: [{ id: 'att-live-2', ...demoAttachment('xray'), uploadedBy: 'Dr Samuel Worku', uploadedAt: hAgo(2) }],
      path: [['submit', 5], ['acknowledge', 20, { actorName: 'Sr Selamawit Bekele' }]],
    }),

    /* ---------- awaiting outcome ack (half-closed loop) ---------------------- */
    mkReferral({
      id: 'r-oc-001', patientId: 'p-004', reason: 'obstructed_labour', urgency: 'emergency',
      originId: 'f-ginchi', originUser: U['u-liaison-ginchi'], targetId: 'f-ambogeneral', targetUser: U['u-liaison-ambo'],
      diagnosis: 'Obstructed labour, cervix fully dilated 3h, fetal distress', daysAgo: 2,
      suggestionRank: 1, distanceKm: 46.2, travelMinutes: 79,
      clinical: { bpSystolic: 118, bpDiastolic: 76, pulse: 110, respRate: 20, temperatureC: 37.4, spo2: 97, gestationalAgeWeeks: 39 },
      preReferral: { stabilisationGiven: ['IV fluids started', 'Bladder emptied', 'Fetal heart rate documented'] },
      path: [
        ['submit', 3], ['accept', 4, { actorName: 'Sr Hanna Girma', clinician: 'Dr Abdi Gemechu', clinicianPhone: '+251 91 100 0601', bedReserved: true, wardType: 'maternity' }],
        ['depart', 12, { actorName: 'Sr Rahel Worku' }], ['arrive', 84, { actorName: 'Sr Hanna Girma' }],
        ['start_care', 9, { actorName: 'Dr Abdi Gemechu' }],
        ['submit_outcome', 360, { actorName: 'Dr Abdi Gemechu', outcome: done('Obstructed labour — emergency caesarean section', 'admitted', 'Emergency LSCS under spinal anaesthesia; live male infant, Apgar 8/9', 'Wound review at Ginchi PH in 7 days; iron/folate for 3 months') }],
      ],
    }),

    /* ---------- completed loops with feedback -------------------------------- */
    mkReferral({
      id: 'r-c-001', patientId: 'p-001', reason: 'severe_pre_eclampsia', urgency: 'emergency',
      originId: 'f-awaro', originUser: U['u-hew-awaro'], targetId: 'f-ambogeneral', targetUser: U['u-liaison-ambo'],
      diagnosis: 'Severe pre-eclampsia at 34 weeks', daysAgo: 21,
      suggestionRank: 1, distanceKm: 3.4, travelMinutes: 12,
      clinical: { bpSystolic: 160, bpDiastolic: 110, pulse: 98, respRate: 20, temperatureC: 36.8, spo2: 97, gestationalAgeWeeks: 34 },
      preReferral: { stabilisationGiven: ['MgSO4 loading dose given', 'IV line established'] },
      path: [
        ['submit', 2], ['accept', 3, { actorName: 'Sr Hanna Girma', clinician: 'Dr Abdi Gemechu', bedReserved: true, wardType: 'maternity' }],
        ['depart', 10], ['arrive', 25, { actorName: 'Sr Hanna Girma' }], ['start_care', 5, { actorName: 'Dr Abdi Gemechu' }],
        ['submit_outcome', 2880, { actorName: 'Dr Abdi Gemechu', outcome: done('Severe pre-eclampsia — stabilised, delivered at 36w', 'discharged_home', 'MgSO4 protocol completed; induced at 36 weeks; mother and baby well', 'BP check at Awaro HP weekly for 6 weeks') }],
        ['acknowledge_outcome', 300, { actorName: 'Almaz Bekele' }],
      ],
    }),
    mkReferral({
      id: 'r-c-002', patientId: 'p-002', reason: 'major_trauma', urgency: 'emergency',
      originId: 'f-guderhc', originUser: U['u-cl-guderhc'], targetId: 'f-ambogeneral', targetUser: U['u-liaison-ambo'],
      diagnosis: 'RTA: open tibial fracture, suspected internal bleeding', daysAgo: 15,
      suggestionRank: 2, overrideReason: 'transport_availability',
      distanceKm: 11.5, travelMinutes: 25,
      clinical: { bpSystolic: 100, bpDiastolic: 64, pulse: 122, respRate: 24, temperatureC: 36.5, spo2: 94 },
      preReferral: { stabilisationGiven: ['Bleeding controlled', 'IV access established', 'Fracture immobilised'] },
      attachments: [{ id: 'att-c2', ...demoAttachment('xray'), uploadedBy: 'Dr Meseret Alemu', uploadedAt: dAgo(15) }],
      path: [
        ['submit', 1], ['accept', 6, { actorName: 'Sr Hanna Girma', clinician: 'Dr Abdi Gemechu', bedReserved: true }],
        ['depart', 8, { transportMode: 'ambulance' }], ['arrive', 31, { actorName: 'Nurse Dawit Mekonnen' }],
        ['start_care', 4, { actorName: 'Dr Abdi Gemechu' }],
        ['submit_outcome', 4320, { actorName: 'Dr Abdi Gemechu', outcome: done('Open tibial fracture — ORIF performed', 'admitted', 'Debridement + external fixation; transfused 2 units', 'Orthopaedic review in 2 weeks; physiotherapy referral') }],
        ['acknowledge_outcome', 600, { actorName: 'Dr Meseret Alemu' }],
      ],
    }),
    mkReferral({
      id: 'r-c-003', patientId: 'p-003', reason: 'imaging_ct', urgency: 'routine',
      originId: 'f-addisketemahc', originUser: U['u-dr-selam'], targetId: 'f-yekatit12', targetUser: U['u-liaison-y12'],
      diagnosis: 'Chronic headache with new focal signs — CT head required', daysAgo: 12,
      suggestionRank: 2, overrideReason: 'known_specialist', distanceKm: 4.5, travelMinutes: 15,
      clinical: { bpSystolic: 128, bpDiastolic: 84, pulse: 76, respRate: 16, temperatureC: 36.6, spo2: 98 },
      preReferral: { stabilisationGiven: ['Clinical question stated'] },
      attachments: [{ id: 'att-c3', ...demoAttachment('ct'), uploadedBy: 'Dr Selam Fikre', uploadedAt: dAgo(12) }],
      path: [
        ['submit', 10], ['acknowledge', 65, { actorName: 'Sr Marta Gebre' }],
        ['accept', 40, { actorName: 'Sr Marta Gebre', clinician: 'Dr Zelalem T.' }],
        ['depart', 1440, { transportMode: 'public' }], ['arrive', 55, { actorName: 'Sr Marta Gebre' }],
        ['submit_outcome', 240, { actorName: 'Dr Zelalem T.', outcome: done('CT head: no space-occupying lesion; migraine work-up', 'back_referred', 'CT performed and reported; started prophylaxis', 'Continue at Addis Ketema HC; return if red-flag symptoms') }],
        ['acknowledge_outcome', 120, { actorName: 'Dr Selam Fikre' }],
      ],
    }),
    mkReferral({
      id: 'r-c-004', patientId: 'p-006', reason: 'severe_pneumonia_child', urgency: 'emergency',
      originId: 'f-ambohc', originUser: U['u-dr-kebede'], targetId: 'f-ambogeneral', targetUser: U['u-liaison-ambo'],
      diagnosis: 'Severe pneumonia, 4-year-old, SpO2 88% on air', daysAgo: 9,
      suggestionRank: 1, distanceKm: 1.2, travelMinutes: 6,
      clinical: { bpSystolic: 96, bpDiastolic: 60, pulse: 148, respRate: 52, temperatureC: 39.1, spo2: 88 },
      preReferral: { stabilisationGiven: ['First dose antibiotic given', 'Oxygen given if available'] },
      path: [
        ['submit', 1], ['accept', 3, { actorName: 'Sr Hanna Girma', clinician: 'Paediatric duty team', bedReserved: true, wardType: 'paediatric' }],
        ['depart', 5], ['arrive', 12, { actorName: 'Nurse Dawit Mekonnen' }], ['start_care', 3, { actorName: 'Dr Abdi Gemechu' }],
        ['submit_outcome', 2160, { actorName: 'Dr Abdi Gemechu', outcome: done('Severe pneumonia — recovered on IV antibiotics + oxygen', 'discharged_home', 'IV ampicillin/gentamicin 5 days, oxygen 2 days', 'Finish oral amoxicillin; review at Ambo HC in 3 days') }],
        ['acknowledge_outcome', 240, { actorName: 'Dr Kebede Tesfaye' }],
      ],
    }),
    mkReferral({
      id: 'r-c-005', patientId: 'p-007', reason: 'suspected_cancer', urgency: 'routine',
      originId: 'f-ambogeneral', originUser: U['u-dr-abdi'], targetId: 'f-blacklion', targetUser: U['u-liaison-blacklion'],
      diagnosis: 'Progressive dysphagia, weight loss — suspected oesophageal malignancy', daysAgo: 25,
      suggestionRank: 1, tierSkipReason: null, distanceKm: 114, travelMinutes: 196,
      clinical: { bpSystolic: 132, bpDiastolic: 80, pulse: 84, respRate: 18, temperatureC: 36.4, spo2: 96 },
      preReferral: { stabilisationGiven: ['Previous investigations attached'] },
      attachments: [{ id: 'att-c5', ...demoAttachment('xray'), uploadedBy: 'Dr Abdi Gemechu', uploadedAt: dAgo(25) }],
      path: [
        ['submit', 30], ['acknowledge', 180, { actorName: 'Sr Selamawit Bekele' }],
        ['accept', 720, { actorName: 'Sr Selamawit Bekele', clinician: 'Oncology clinic — Dr Tewodros M.' }],
        ['depart', 2880, { transportMode: 'public' }], ['arrive', 220, { actorName: 'Sr Selamawit Bekele' }],
        ['start_care', 60, { actorName: 'Oncology clinic' }],
        ['submit_outcome', 10080, { actorName: 'Dr Tewodros M.', outcome: done('Oesophageal SCC confirmed on endoscopic biopsy', 'admitted', 'Endoscopy + biopsy; staging CT; MDT reviewed — chemoradiotherapy planned', 'Oncology follow-up at Tikur Anbessa; nutrition support plan shared') }],
        ['acknowledge_outcome', 1440, { actorName: 'Dr Abdi Gemechu' }],
      ],
    }),
    mkReferral({
      id: 'r-c-006', patientId: 'p-008', reason: 'eye_emergency', urgency: 'urgent',
      originId: 'f-kazanchishc', originUser: U['u-dr-dawit'], targetId: 'f-menelik', targetUser: null,
      diagnosis: 'Penetrating eye injury (metal fragment), right eye', daysAgo: 6,
      suggestionRank: 1, distanceKm: 2.6, travelMinutes: 10,
      clinical: { bpSystolic: 124, bpDiastolic: 78, pulse: 88, respRate: 16, temperatureC: 36.6, spo2: 99 },
      preReferral: { stabilisationGiven: ['Eye shielded (no pressure)', 'Nil by mouth if surgical'] },
      path: [
        ['submit', 2], ['accept', 18, { actorName: 'Menelik II referral desk', clinician: 'Ophthalmology duty team' }],
        ['depart', 15, { transportMode: 'private' }], ['arrive', 22, { actorName: 'Menelik II referral desk' }],
        ['submit_outcome', 1440, { actorName: 'Ophthalmology duty team', outcome: done('Corneal laceration repaired; IOFB removed', 'discharged_home', 'Primary repair under GA; intravitreal antibiotics', 'Ophthalmology review in 5 days; protective shield') }],
        ['acknowledge_outcome', 300, { actorName: 'Dr Dawit Lemma' }],
      ],
    }),
    mkReferral({
      id: 'r-c-007', patientId: 'p-004', reason: 'back_referral_followup', urgency: 'routine',
      originId: 'f-ambogeneral', originUser: U['u-dr-abdi'], targetId: 'f-ginchi', targetUser: U['u-liaison-ginchi'],
      diagnosis: 'Post-caesarean follow-up — back-referral to Ginchi PH', daysAgo: 1,
      suggestionRank: 1, distanceKm: 46.2, travelMinutes: 79,
      clinical: { bpSystolic: 112, bpDiastolic: 72, pulse: 80, respRate: 16, temperatureC: 36.7, spo2: 98 },
      preReferral: { stabilisationGiven: ['Discharge summary attached', 'Follow-up plan explained to patient'] },
      path: [['submit', 20], ['acknowledge', 90, { actorName: 'Sr Rahel Worku' }], ['accept', 30, { actorName: 'Sr Rahel Worku', clinician: 'MCH clinic' }]],
    }),

    /* ---------- declines (the capacity-planning gold mine) ------------------- */
    mkReferral({
      id: 'r-d-001', patientId: 'p-003', reason: 'acute_abdomen', urgency: 'urgent',
      originId: 'f-addisketemahc', originUser: U['u-dr-selam'], targetId: 'f-zewditu', targetUser: U['u-liaison-zewditu'],
      diagnosis: 'Acute appendicitis, guarding RIF', daysAgo: 8,
      suggestionRank: 1, distanceKm: 3.9, travelMinutes: 14,
      clinical: { bpSystolic: 118, bpDiastolic: 76, pulse: 96, respRate: 18, temperatureC: 38.2, spo2: 98 },
      preReferral: { stabilisationGiven: ['Nil by mouth', 'IV fluids started'] },
      path: [
        ['submit', 4], ['decline', 22, { actorName: 'Sr Hiwot Kassa', reasonCode: 'no_bed', note: 'Surgical ward full after mass-casualty admission; try Yekatit 12' }],
        ['reroute', 15, { targetId: 'f-yekatit12', actorName: 'Dr Selam Fikre' }],
        ['accept', 20, { actorName: 'Sr Marta Gebre', clinician: 'Surgical duty team', bedReserved: true }],
        ['depart', 12, { transportMode: 'ambulance' }], ['arrive', 28, { actorName: 'Sr Marta Gebre' }],
        ['start_care', 6, { actorName: 'Surgical duty team' }],
        ['submit_outcome', 1800, { actorName: 'Surgical duty team', outcome: done('Acute appendicitis — appendicectomy', 'discharged_home', 'Open appendicectomy, uneventful recovery', 'Wound review at Addis Ketema HC in 7 days') }],
        ['acknowledge_outcome', 200, { actorName: 'Dr Selam Fikre' }],
      ],
    }),
    mkReferral({
      id: 'r-d-002', patientId: 'p-007', reason: 'renal_failure', urgency: 'urgent',
      originId: 'f-ambogeneral', originUser: U['u-dr-abdi'], targetId: 'f-stpauls', targetUser: U['u-liaison-stpauls'],
      diagnosis: 'AKI on CKD, hyperkalaemia 6.8 — dialysis needed', daysAgo: 18,
      suggestionRank: 2, overrideReason: 'previous_care_there', distanceKm: 109, travelMinutes: 187,
      clinical: { bpSystolic: 168, bpDiastolic: 96, pulse: 88, respRate: 20, temperatureC: 36.5, spo2: 95 },
      preReferral: { stabilisationGiven: ['Fluid balance documented', 'Creatinine result attached'] },
      path: [
        ['submit', 8], ['decline', 45, { actorName: 'Sr Meron Tulu', reasonCode: 'capacity_exceeded', note: 'All dialysis slots taken this week' }],
        ['reroute', 20, { targetId: 'f-blacklion', actorName: 'Dr Abdi Gemechu' }],
        ['accept', 35, { actorName: 'Sr Selamawit Bekele', clinician: 'Nephrology — Dr Lidya A.' }],
        ['depart', 60, { transportMode: 'ambulance' }], ['arrive', 200, { actorName: 'Sr Selamawit Bekele' }],
        ['start_care', 30, { actorName: 'Nephrology unit' }],
        ['submit_outcome', 4320, { actorName: 'Dr Lidya A.', outcome: done('AKI on CKD — dialysed, stabilised', 'back_referred', '3 dialysis sessions; K+ normalised', 'Twice-weekly dialysis; medication list attached') }],
        ['acknowledge_outcome', 720, { actorName: 'Dr Abdi Gemechu' }],
      ],
    }),
    mkReferral({
      id: 'r-d-003', patientId: 'p-005', reason: 'mental_health', urgency: 'routine',
      originId: 'f-kazanchishc', originUser: U['u-dr-dawit'], targetId: 'f-amanuel', targetUser: null,
      diagnosis: 'First-episode psychosis, family requesting admission', daysAgo: 4,
      suggestionRank: 1, distanceKm: 4.1, travelMinutes: 15,
      clinical: { bpSystolic: 122, bpDiastolic: 80, pulse: 84, respRate: 16, temperatureC: 36.8, spo2: 98 },
      preReferral: { stabilisationGiven: ['Risk assessment documented', 'Current medication listed'] },
      path: [
        ['submit', 15], ['decline', 120, { actorName: 'Amanuel referral desk', reasonCode: 'capacity_exceeded', note: 'Admission ward at capacity; outpatient slot offered in 5 days' }],
      ],
    }),

    /* ---------- SLA breach / escalation (live) -------------------------------- */
    mkReferral({
      id: 'r-esc-001', patientId: 'p-006', reason: 'severe_acute_malnutrition', urgency: 'urgent',
      originId: 'f-awaro', originUser: U['u-hew-awaro'], targetId: 'f-ambohc', targetUser: U['u-dr-kebede'],
      diagnosis: 'SAM with complications, MUAC 10.2 cm, refusing feeds', daysAgo: 0.08,
      suggestionRank: 1, distanceKm: 3.4, travelMinutes: 12,
      clinical: { bpSystolic: 90, bpDiastolic: 58, pulse: 132, respRate: 36, temperatureC: 35.8, spo2: 95, muacCm: 10.2 },
      preReferral: { stabilisationGiven: ['MUAC measured', 'Appetite test done'] },
      path: [['submit', 2], ['sla_breach', 35, { actorName: 'system' }]],
    }),
  ];

  return rows;
}

/* =============================================================== FEEDBACK */
export function seedFeedback() {
  const f = (id, referralId, patientId, facilityId, side, rating, comment, d) => ({
    id, referralId, patientId, facilityId, facilityRole: side, rating, comment, createdAt: dAgo(d),
  });
  return [
    f('fb-01', 'r-c-001', 'p-001', 'f-awaro', 'origin', 5, 'Almaz explained everything and arranged the ambulance quickly.', 18),
    f('fb-02', 'r-c-001', 'p-001', 'f-ambogeneral', 'target', 4, 'Care was very good. Waiting at the maternity ward was long.', 18),
    f('fb-03', 'r-c-002', 'p-002', 'f-guderhc', 'origin', 4, 'They stabilised my leg well before transfer.', 11),
    f('fb-04', 'r-c-002', 'p-002', 'f-ambogeneral', 'target', 5, 'Surgery went well and the staff followed up every day.', 11),
    f('fb-05', 'r-c-003', 'p-003', 'f-addisketemahc', 'origin', 5, 'The doctor sent my scans ahead so I did not repeat any test.', 9),
    f('fb-06', 'r-c-003', 'p-003', 'f-yekatit12', 'target', 4, 'CT was done the same day I arrived.', 9),
    f('fb-07', 'r-c-004', 'p-006', 'f-ambohc', 'origin', 5, 'They gave my daughter oxygen and the referral was fast.', 6),
    f('fb-08', 'r-c-004', 'p-006', 'f-ambogeneral', 'target', 5, 'Paediatric ward was excellent, thank you.', 6),
    f('fb-09', 'r-c-005', 'p-007', 'f-blacklion', 'target', 3, 'Very skilled doctors but the queue at oncology took two days.', 12),
    f('fb-10', 'r-c-005', 'p-007', 'f-ambogeneral', 'origin', 4, 'Dr Abdi organised everything and the letter had all my results.', 12),
    f('fb-11', 'r-c-006', 'p-008', 'f-menelik', 'target', 5, 'My eye was operated the same evening. Very grateful.', 4),
    f('fb-12', 'r-d-001', 'p-003', 'f-yekatit12', 'target', 4, 'After the first hospital was full, the second accepted me quickly.', 5),
  ];
}

/* ================================================================= CONFIG */
export const CONFIG = {
  slaMinutes: { emergency: 5, urgent: 30, routine: 240 },
  arrivalGraceHours: { emergency: 6, urgent: 24, routine: 48 },
  bedReservationHours: { emergency: 6, urgent: 12, routine: 24 },
  routingWeights: { distance: 0.35, acceptance: 0.25, beds: 0.25, queue: 0.15 },
  capabilityStaleDays: 30,
  capacityStaleHours: 8,
};

export function buildSeedState() {
  const users = seedUsers();
  return {
    seedVersion: SEED_VERSION,
    seededAt: new Date().toISOString(),
    facilities: FACILITIES,
    capabilities: CAPABILITIES,
    facilityCapabilities: seedFacilityCapabilities(),
    capacity: seedCapacity(),
    reasonCodes: REASON_CODES,
    users,
    patients: seedPatients(),
    referrals: seedReferrals(users),
    feedback: seedFeedback(),
    notifications: [],
    audit: [],
    config: CONFIG,
  };
}
