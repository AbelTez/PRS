-- ============================================================================
-- Ethio Referral Linkage — pilot seed
--
-- One coherent dataset for the CURRENT system: every role, every lifecycle
-- status, reception assignments, attachments and patient feedback.
--
--   * Facilities are real Ethiopian public institutions (names, tiers,
--     approximate coordinates, publicly listed switchboards). Verify contact
--     details with each facility before a pilot.
--   * Every person, patient, referral, rating and clinical detail is
--     SYNTHETIC. No real patient data is present or implied.
--
-- Conventions
--   admin units  11111111-…   facilities 22222222-…   users 33333333-…
--   patients     55555555-…   referrals  66666666-…
--
-- Scheduler stability: the background clocks (SLA breach, reservation lapse,
-- arrival grace, lost-to-follow-up) run on the live system, so seeded rows
-- carry deadlines that keep them in the status they are meant to demonstrate —
-- e.g. a SUBMITTED referral has its SLA deadline in the FUTURE, an IN_TRANSIT
-- one has an expected arrival in the future. Change those with care.
-- ============================================================================

BEGIN;

-- ============================================================ ADMIN GEOGRAPHY
INSERT INTO admin_unit (id, parent_id, level, name_lat, name_am, code) VALUES
 ('11111111-0000-0000-0000-000000000001', NULL, 'region', 'Oromia', 'ኦሮሚያ', 'ET-OR'),
 ('11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'zone',   'West Shewa',  'ምዕራብ ሸዋ', 'ET-OR-WS'),
 ('11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'woreda', 'Ambo Town',   'አምቦ ከተማ', 'ET-OR-WS-AM'),
 ('11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'woreda', 'Toke Kutaye', 'ቶኬ ኩታዬ', 'ET-OR-WS-TK'),
 ('11111111-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'woreda', 'Dendi',       'ደንዲ', 'ET-OR-WS-DN'),
 ('11111111-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'kebele', 'Ambo 01',     'አምቦ 01', 'ET-OR-WS-AM-01'),
 ('11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000004', 'kebele', 'Guder 02',    'ጉደር 02', 'ET-OR-WS-TK-02'),
 ('11111111-0000-0000-0000-000000000010', NULL, 'region', 'Addis Ababa', 'አዲስ አበባ', 'ET-AA'),
 ('11111111-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000010', 'zone', 'Gulele Sub-city',       'ጉለሌ ክፍለ ከተማ', 'ET-AA-GU'),
 ('11111111-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000010', 'zone', 'Kirkos Sub-city',       'ቂርቆስ ክፍለ ከተማ', 'ET-AA-KK'),
 ('11111111-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000010', 'zone', 'Arada Sub-city',        'አራዳ ክፍለ ከተማ', 'ET-AA-AR'),
 ('11111111-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000010', 'zone', 'Addis Ketema Sub-city', 'አዲስ ከተማ ክፍለ ከተማ', 'ET-AA-AK'),
 ('11111111-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000010', 'zone', 'Lideta Sub-city',       'ልደታ ክፍለ ከተማ', 'ET-AA-LD');

-- ============================================================== CAPABILITIES
INSERT INTO capability (code, name_lat, name_am, category, tier_min) VALUES
 ('emergency_24h','24-hour emergency service','24 ሰዓት የድንገተኛ አገልግሎት','emergency',2),
 ('resuscitation','Resuscitation','ማነቃቂያ','emergency',2),
 ('oxygen_supply','Oxygen supply','ኦክስጅን','emergency',2),
 ('icu_bed','ICU bed','የፅኑ ህሙማን አልጋ','emergency',4),
 ('ventilator','Ventilator','ቬንትሌተር','emergency',4),
 ('ambulance_available','Ambulance','አምቡላንስ','emergency',2),
 ('general_surgery','General surgery','አጠቃላይ ቀዶ ጥገና','surgical',3),
 ('caesarean_section','Caesarean section','ቀዶ ጥገና ወሊድ','surgical',3),
 ('anaesthesia_general','General anaesthesia','አጠቃላይ ማደንዘዣ','surgical',3),
 ('anaesthesia_spinal','Spinal anaesthesia','ስፓይናል ማደንዘዣ','surgical',3),
 ('orthopaedic_surgery','Orthopaedic surgery','የአጥንት ቀዶ ጥገና','surgical',4),
 ('neurosurgery','Neurosurgery','የነርቭ ቀዶ ጥገና','surgical',5),
 ('burns_care','Burns care','የቃጠሎ ህክምና','surgical',4),
 ('bemonc','Basic emergency obstetric & newborn care','መሰረታዊ የድንገተኛ ወሊድ እንክብካቤ','obstetric',2),
 ('cemonc','Comprehensive emergency obstetric & newborn care','ሁሉን አቀፍ የድንገተኛ ወሊድ እንክብካቤ','obstetric',3),
 ('neonatal_icu','Neonatal ICU','የአራስ ፅኑ ህክምና','obstetric',4),
 ('blood_transfusion','Blood transfusion','የደም ልገሳ','obstetric',3),
 ('magnesium_sulphate','Magnesium sulphate','ማግኒዥየም ሰልፌት','obstetric',2),
 ('xray','X-ray','ኤክስሬይ','imaging',3),
 ('ultrasound','Ultrasound','አልትራሳውንድ','imaging',2),
 ('ct_scan','CT scan','ሲቲ ስካን','imaging',4),
 ('mri','MRI','ኤምአርአይ','imaging',5),
 ('ecg','ECG','ኢሲጂ','imaging',3),
 ('basic_lab','Basic laboratory','መሰረታዊ ላቦራቶሪ','laboratory',2),
 ('haematology','Haematology','የደም ምርመራ','laboratory',3),
 ('biochemistry','Biochemistry','ባዮኬሚስትሪ','laboratory',3),
 ('blood_bank','Blood bank','የደም ባንክ','laboratory',3),
 ('tb_genexpert','TB GeneXpert','የቲቢ ጅንኤክስፐርት','laboratory',2),
 ('histopathology','Histopathology','ሂስቶፓቶሎጂ','laboratory',5),
 ('internal_medicine','Internal medicine','የውስጥ ደዌ','specialist',3),
 ('paediatrics','Paediatrics','የህፃናት ህክምና','specialist',3),
 ('obgyn','Obstetrics & gynaecology','የማህፀንና ፅንስ','specialist',3),
 ('psychiatry','Psychiatry','የአእምሮ ህክምና','specialist',4),
 ('ophthalmology','Ophthalmology','የዓይን ህክምና','specialist',4),
 ('oncology','Oncology','የካንሰር ህክምና','specialist',5),
 ('dialysis','Dialysis','ዲያሊሲስ','specialist',5),
 ('art_clinic','ART clinic','የኤች አይ ቪ ህክምና','programme',2),
 ('tb_treatment','TB treatment','የቲቢ ህክምና','programme',2),
 ('malnutrition_otp','Outpatient therapeutic programme','የተመላላሽ ስርዓተ ምግብ','programme',1),
 ('malnutrition_sc','Stabilisation centre','ማረጋጊያ ማዕከል','programme',2),
 ('gbv_care','GBV care','የፆታዊ ጥቃት እንክብካቤ','programme',2);

-- =============================================================== REASON CODES
INSERT INTO reason_code (code, name_lat, name_am, category, default_urgency, min_target_tier, required_capabilities, stabilisation_items) VALUES
 ('severe_pre_eclampsia','Severe pre-eclampsia / eclampsia','ከባድ የእርግዝና ግፊት','obstetric','emergency',3,
   ARRAY['cemonc','caesarean_section','anaesthesia_general','blood_transfusion','magnesium_sulphate'],
   ARRAY['MgSO4 loading dose given','Antihypertensive given','IV line established','Urinary catheter inserted','Left lateral position','BP rechecked before transfer']),
 ('obstructed_labour','Obstructed / prolonged labour','የተስተጓጎለ ምጥ','obstetric','emergency',3,
   ARRAY['cemonc','caesarean_section','anaesthesia_general','blood_transfusion'],
   ARRAY['IV fluids started','Bladder emptied','Fetal heart rate documented','Antibiotics given if indicated']),
 ('postpartum_haemorrhage','Postpartum haemorrhage','ከወሊድ በኋላ ደም መፍሰስ','obstetric','emergency',3,
   ARRAY['cemonc','blood_transfusion','general_surgery'],
   ARRAY['Uterine massage performed','Oxytocin given','Two IV lines established','Blood loss estimated']),
 ('neonatal_sepsis','Possible serious bacterial infection (neonate)','የአራስ ኢንፌክሽን','paediatric','emergency',3,
   ARRAY['paediatrics','neonatal_icu','oxygen_supply'],
   ARRAY['First dose antibiotic given','Kept warm / skin-to-skin','Blood glucose checked','Feeding supported']),
 ('severe_pneumonia_child','Severe pneumonia (under 5)','ከባድ የሳምባ ምች','paediatric','emergency',3,
   ARRAY['paediatrics','oxygen_supply','xray'],
   ARRAY['First dose antibiotic given','Oxygen given if available','Respiratory rate documented']),
 ('severe_acute_malnutrition','Severe acute malnutrition with complications','ከባድ የምግብ እጥረት','paediatric','urgent',2,
   ARRAY['malnutrition_sc','paediatrics'],
   ARRAY['MUAC measured','Appetite test done','F-75 started if available','Hypoglycaemia treated']),
 ('major_trauma','Major trauma','ከባድ አደጋ','emergency','emergency',3,
   ARRAY['general_surgery','anaesthesia_general','blood_transfusion','xray','resuscitation'],
   ARRAY['Airway secured','Bleeding controlled','IV access established','GCS documented','Fracture immobilised']),
 ('acute_abdomen','Acute abdomen','ከባድ የሆድ ህመም','surgical','urgent',3,
   ARRAY['general_surgery','anaesthesia_general','ultrasound','basic_lab'],
   ARRAY['Nil by mouth','IV fluids started','Analgesia given','Vitals documented']),
 ('burns_severe','Severe burns (>15% TBSA or airway)','ከባድ ቃጠሎ','surgical','emergency',4,
   ARRAY['burns_care','resuscitation','oxygen_supply'],
   ARRAY['Airway assessed','IV fluids per Parkland started','Burns cooled and covered','Analgesia given','TBSA estimated']),
 ('suspected_cancer','Suspected malignancy','የካንሰር ጥርጣሬ','oncology','routine',5,
   ARRAY['oncology','histopathology'],
   ARRAY['Biopsy taken if capable','Previous investigations attached']),
 ('renal_failure','Renal failure requiring dialysis','የኩላሊት ህመም','specialist','urgent',5,
   ARRAY['dialysis','internal_medicine','biochemistry'],
   ARRAY['Fluid balance documented','Creatinine result attached']),
 ('tb_diagnostic','TB diagnostic referral','የቲቢ ምርመራ','programme','routine',2,
   ARRAY['tb_genexpert'],
   ARRAY['Sputum sample collected','Symptom screen documented']),
 ('imaging_ct','CT imaging required','የሲቲ ምርመራ','diagnostic','routine',4,
   ARRAY['ct_scan'],
   ARRAY['Clinical question stated','Previous imaging attached']),
 ('mental_health','Mental health assessment','የአእምሮ ጤና ምርመራ','specialist','routine',4,
   ARRAY['psychiatry'],
   ARRAY['Risk assessment documented','Current medication listed']),
 ('eye_emergency','Eye injury / sudden vision loss','የዓይን አደጋ','specialist','urgent',4,
   ARRAY['ophthalmology'],
   ARRAY['Eye shielded (no pressure)','Nil by mouth if surgical','Visual acuity documented']),
 ('back_referral_followup','Back-referral for follow-up care','ለክትትል ወደ ታች ሪፈራል','followup','routine',2,
   ARRAY[]::text[],
   ARRAY['Discharge summary attached','Follow-up plan explained to patient']);

-- ================================================================ FACILITIES
INSERT INTO facility (id, mfr_id, name_lat, name_am, facility_type, tier, ownership,
  region_id, zone_id, woreda_id, latitude, longitude, phone, is_24h, has_ambulance,
  address_line, po_box) VALUES
 -- Addis Ababa apex and city hospitals
 ('22222222-0000-0000-0000-000000000001','MFR-ET-14-0001','Black Lion Specialised Hospital','ጥቁር አንበሳ ስፔሻላይዝድ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000015',NULL,9.011000,38.755000,'+251115511211',TRUE,TRUE,
  'Zambia Street, Lideta','P.O. Box 5657'),
 ('22222222-0000-0000-0000-000000000011','MFR-ET-14-0002','St. Paul''s Hospital Millennium Medical College','ቅዱስ ጳውሎስ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000011',NULL,9.052600,38.726300,'+251112753454',TRUE,TRUE,
  'Swaziland Street, Gulele','P.O. Box 1271'),
 ('22222222-0000-0000-0000-000000000016','MFR-ET-14-0003','St. Peter''s Specialised Hospital','ቅዱስ ጴጥሮስ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000011',NULL,9.066600,38.739800,'+251111112691',TRUE,FALSE,
  'Entoto Road, Gulele','P.O. Box 21534'),
 ('22222222-0000-0000-0000-000000000017','MFR-ET-14-0004','Amanuel Mental Specialised Hospital','አማኑኤል የአእምሮ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000014',NULL,9.033000,38.732600,'+251112757744',TRUE,FALSE,
  'Off Merkato, Addis Ketema','P.O. Box 1971'),
 ('22222222-0000-0000-0000-000000000012','MFR-ET-14-0011','Zewditu Memorial Hospital','ዘውዲቱ መታሰቢያ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000012',NULL,9.014600,38.755000,'+251115518085',TRUE,TRUE,
  'Off Kazanchis, Kirkos','P.O. Box 316'),
 ('22222222-0000-0000-0000-000000000013','MFR-ET-14-0012','Yekatit 12 Hospital Medical College','የካቲት 12 ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000013',NULL,9.045000,38.761400,'+251111553065',TRUE,TRUE,
  'Sidist Kilo, Arada','P.O. Box 257'),
 ('22222222-0000-0000-0000-000000000014','MFR-ET-14-0013','Ghandi Memorial Hospital','ጋንዲ መታሰቢያ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000012',NULL,9.011000,38.762000,'+251115518065',TRUE,TRUE,
  'Near Addis Ababa Stadium, Kirkos','P.O. Box 3164'),
 ('22222222-0000-0000-0000-000000000015','MFR-ET-14-0014','Menelik II Comprehensive Specialised Hospital','ዳግማዊ ምኒልክ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000013',NULL,9.039700,38.769000,'+251111552447',TRUE,FALSE,
  'Near Ministry of Foreign Affairs, Arada','P.O. Box 5556'),
 ('22222222-0000-0000-0000-000000000018','MFR-ET-14-0301','Addis Ketema Health Centre','አዲስ ከተማ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000014',NULL,9.035500,38.722300,'+251112134455',FALSE,FALSE,
  'Near Merkato, Addis Ketema',NULL),
 ('22222222-0000-0000-0000-000000000019','MFR-ET-14-0302','Kazanchis Health Centre','ካዛንቺስ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000012',NULL,9.017000,38.766000,'+251115156677',FALSE,FALSE,
  'Kazanchis, Kirkos',NULL),
 -- West Shewa referral chain (Oromia)
 ('22222222-0000-0000-0000-000000000002','MFR-ET-04-0201','Ambo General Hospital','አምቦ ጠቅላላ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  8.987000,37.855000,'+251112362291',TRUE,TRUE,'Ambo Town, off the Addis Ababa–Nekemte road','P.O. Box 06'),
 ('22222222-0000-0000-0000-000000000003','MFR-ET-04-0202','Guder Primary Hospital','ጉደር የመጀመሪያ ደረጃ ሆስፒታል','primary_hospital',3,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',
  8.965000,37.770000,'+251113456789',TRUE,TRUE,'Guder town centre',NULL),
 ('22222222-0000-0000-0000-000000000004','MFR-ET-04-0203','Ginchi Primary Hospital','ግንጪ የመጀመሪያ ደረጃ ሆስፒታል','primary_hospital',3,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005',
  9.028000,38.150000,'+251114567890',TRUE,FALSE,'Ginchi town, Addis Ababa–Ambo road',NULL),
 ('22222222-0000-0000-0000-000000000005','MFR-ET-04-0301','Ambo Health Centre','አምቦ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  8.980000,37.860000,'+251115678901',TRUE,FALSE,'Kebele 01, Ambo',NULL),
 ('22222222-0000-0000-0000-000000000006','MFR-ET-04-0302','Guder Health Centre','ጉደር ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',
  8.960000,37.775000,'+251116789012',TRUE,FALSE,'Guder 02 kebele',NULL),
 ('22222222-0000-0000-0000-000000000007','MFR-ET-04-0303','Tulu Bolo Health Centre','ቱሉ ቦሎ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005',
  8.665000,38.215000,'+251117890123',FALSE,FALSE,'Tulu Bolo town',NULL),
 ('22222222-0000-0000-0000-000000000008','MFR-ET-04-0401','Awaro Health Post','አዋሮ ጤና ኬላ','health_post',1,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  8.995000,37.880000,NULL,FALSE,FALSE,'Awaro kebele',NULL),
 ('22222222-0000-0000-0000-000000000009','MFR-ET-04-0402','Gosu Kora Health Post','ጎሱ ኮራ ጤና ኬላ','health_post',1,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',
  8.940000,37.740000,NULL,FALSE,FALSE,'Gosu Kora kebele',NULL),
 ('22222222-0000-0000-0000-00000000000a','MFR-ET-04-0403','Dano Health Post','ዳኖ ጤና ኬላ','health_post',1,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005',
  8.700000,38.190000,NULL,FALSE,FALSE,'Dano kebele',NULL);

-- Health posts report to their primary health care unit.
UPDATE facility SET parent_phcu_id='22222222-0000-0000-0000-000000000005' WHERE id='22222222-0000-0000-0000-000000000008';
UPDATE facility SET parent_phcu_id='22222222-0000-0000-0000-000000000006' WHERE id='22222222-0000-0000-0000-000000000009';
UPDATE facility SET parent_phcu_id='22222222-0000-0000-0000-000000000007' WHERE id='22222222-0000-0000-0000-00000000000a';

-- ========================================================= CAPABILITY MATRIX
-- Apex hospitals
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000001', code, 'available', now() - INTERVAL '1 day' FROM capability;

INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000011', code, 'available', now() - INTERVAL '2 days'
FROM capability WHERE code <> 'burns_care';

INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000016', code, 'available', now() - INTERVAL '3 days'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','icu_bed','xray','ecg',
  'basic_lab','haematology','biochemistry','tb_genexpert','tb_treatment','internal_medicine');

INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000017', code, 'available', now() - INTERVAL '4 days'
FROM capability WHERE code IN ('psychiatry','emergency_24h','oxygen_supply','basic_lab','internal_medicine');

-- Addis general hospitals
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000012', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','icu_bed','general_surgery',
  'caesarean_section','anaesthesia_general','anaesthesia_spinal','bemonc','cemonc','blood_transfusion',
  'magnesium_sulphate','xray','ultrasound','ecg','basic_lab','haematology','biochemistry','blood_bank',
  'internal_medicine','paediatrics','obgyn','art_clinic','tb_treatment','gbv_care');
INSERT INTO facility_capability (facility_id, capability_code, status, blocking_note, verified_at) VALUES
 ('22222222-0000-0000-0000-000000000012','ct_scan','unavailable',
  'CT scanner under maintenance — engineer scheduled this week', now() - INTERVAL '1 day');

INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000013', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','icu_bed','ventilator',
  'general_surgery','caesarean_section','anaesthesia_general','anaesthesia_spinal','burns_care','bemonc',
  'cemonc','neonatal_icu','blood_transfusion','magnesium_sulphate','xray','ultrasound','ct_scan','ecg',
  'basic_lab','haematology','biochemistry','blood_bank','internal_medicine','paediatrics','obgyn');

INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000014', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','bemonc','cemonc',
  'caesarean_section','anaesthesia_general','anaesthesia_spinal','neonatal_icu','blood_transfusion',
  'magnesium_sulphate','obgyn','ultrasound','basic_lab','blood_bank');

INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000015', code, 'available', now() - INTERVAL '5 days'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','general_surgery',
  'anaesthesia_general','anaesthesia_spinal','ophthalmology','xray','ct_scan','basic_lab','haematology',
  'internal_medicine');

-- Ambo General: zonal hospital, no apex-only services
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000002', code, 'available', now() - INTERVAL '2 days'
FROM capability WHERE code NOT IN ('oncology','dialysis','mri','neurosurgery','histopathology',
  'ventilator','psychiatry','ophthalmology','burns_care');

-- Guder Primary: THE routing demonstration — anaesthetist away, so caesarean
-- and general anaesthesia are unavailable with a reason the clinician can read.
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000003', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','ambulance_available',
  'bemonc','blood_transfusion','magnesium_sulphate','basic_lab','haematology','blood_bank','ultrasound',
  'xray','paediatrics','obgyn','internal_medicine','tb_genexpert','tb_treatment');
INSERT INTO facility_capability (facility_id, capability_code, status, blocking_note, verified_at) VALUES
 ('22222222-0000-0000-0000-000000000003','caesarean_section','unavailable','No anaesthetist on site since Tuesday — locum expected in 6 days', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','anaesthesia_general','unavailable','No anaesthetist on site since Tuesday — locum expected in 6 days', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','anaesthesia_spinal','unavailable','No anaesthetist on site since Tuesday — locum expected in 6 days', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','cemonc','degraded',NULL, now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','general_surgery','degraded',NULL, now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','neonatal_icu','unavailable',NULL, now() - INTERVAL '1 day');

-- Ginchi Primary: full surgical/obstetric package, further away
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000004', code, 'available', now() - INTERVAL '5 days'
FROM capability WHERE code IN ('emergency_24h','resuscitation','oxygen_supply','bemonc','cemonc',
  'caesarean_section','anaesthesia_general','anaesthesia_spinal','blood_transfusion','magnesium_sulphate',
  'general_surgery','basic_lab','blood_bank','ultrasound','xray','obgyn','paediatrics','malnutrition_sc');

-- Health centres: the standard package
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT f.id, c.code, 'available', now() - INTERVAL '4 days'
FROM facility f CROSS JOIN capability c
WHERE f.tier = 2
  AND c.code IN ('bemonc','magnesium_sulphate','basic_lab','ultrasound','oxygen_supply','art_clinic',
                 'tb_treatment','tb_genexpert','malnutrition_otp','malnutrition_sc','gbv_care','emergency_24h');

-- Health posts: the community package
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT f.id, 'malnutrition_otp', 'available', now() - INTERVAL '7 days'
FROM facility f WHERE f.tier = 1;

-- ==================================================================== BEDS
INSERT INTO facility_capacity (facility_id, ward_type, beds_total, beds_free, reported_at) VALUES
 ('22222222-0000-0000-0000-000000000001','general',700,18, now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000001','maternity',80,5,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000001','icu',24,1,        now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000001','paediatric',90,7, now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000011','general',400,26,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000011','maternity',70,9,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000011','icu',20,2,        now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000016','general',110,13,  now() - INTERVAL '8 hours'),
 ('22222222-0000-0000-0000-000000000017','general',300,35,  now() - INTERVAL '12 hours'),
 ('22222222-0000-0000-0000-000000000012','general',200,14,  now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000012','maternity',40,6,  now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000013','general',220,11,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000013','maternity',45,4,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000013','paediatric',60,9, now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000014','maternity',120,15,now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000015','general',150,20,  now() - INTERVAL '6 hours'),
 ('22222222-0000-0000-0000-000000000002','general',150,31,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000002','maternity',40,9,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000002','paediatric',30,7, now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000003','general',50,12,   now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000003','maternity',15,6,  now() - INTERVAL '3 hours'),
 -- deliberately stale: routing shows a warning on figures older than 8 hours
 ('22222222-0000-0000-0000-000000000004','general',40,8,    now() - INTERVAL '30 hours'),
 ('22222222-0000-0000-0000-000000000004','maternity',12,3,  now() - INTERVAL '30 hours');

-- ==================================================================== USERS
-- Password hashes are replaced by scripts/seed.js after this file loads.
-- Three or more accounts for every role in the system.
INSERT INTO app_user (id, username, password_hash, full_name, role, facility_id, phone,
  title, department, license_number, status, verified_at) VALUES
 -- health extension workers (tier-1 community)
 ('33333333-0000-0000-0000-000000000001','hew.awaro','$2b$10$PLACEHOLDER','Almaz Bekele','hew','22222222-0000-0000-0000-000000000008','+251911000001','Health Extension Worker',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000002','hew.gosu','$2b$10$PLACEHOLDER','Tigist Haile','hew','22222222-0000-0000-0000-000000000009','+251911000002','Health Extension Worker',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000003','hew.dano','$2b$10$PLACEHOLDER','Birtukan Negera','hew','22222222-0000-0000-0000-00000000000a','+251911000003','Health Extension Worker',NULL,NULL,'active', now() - INTERVAL '120 days'),
 -- health-centre clinicians
 ('33333333-0000-0000-0000-000000000004','clin.ambohc','$2b$10$PLACEHOLDER','Dr Kebede Tesfaye','clinician','22222222-0000-0000-0000-000000000005','+251911000004','General Practitioner','OPD','MOH-MD-14501','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000005','clin.guderhc','$2b$10$PLACEHOLDER','Dr Meseret Alemu','clinician','22222222-0000-0000-0000-000000000006','+251911000005','Health Officer','OPD','MOH-HO-22140','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000006','clin.tulubolo','$2b$10$PLACEHOLDER','Dr Fikadu Regassa','clinician','22222222-0000-0000-0000-000000000007','+251911000006','Health Officer','OPD','MOH-HO-22815','active', now() - INTERVAL '120 days'),
 -- doctors: the clinicians reception assigns cases to
 ('33333333-0000-0000-0000-000000000007','dr.abdi','$2b$10$PLACEHOLDER','Dr Abdi Gemechu','doctor','22222222-0000-0000-0000-000000000002','+251911000007','Medical Director, General Practitioner','Medical Directorate','MOH-MD-08122','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000008','dr.hanna','$2b$10$PLACEHOLDER','Dr Hanna Wolde','doctor','22222222-0000-0000-0000-000000000002','+251911000008','Paediatrician','Paediatrics','MOH-MD-09540','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000009','dr.bekele','$2b$10$PLACEHOLDER','Dr Bekele Chala','doctor','22222222-0000-0000-0000-000000000002','+251911000009','General Surgeon','Surgery','MOH-MD-10188','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000000a','dr.tigist','$2b$10$PLACEHOLDER','Dr Tigist Alemu','doctor','22222222-0000-0000-0000-000000000001','+251911000010','Consultant Obstetrician-Gynaecologist','Obstetrics & Gynaecology','MOH-MD-10432','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000000b','dr.lidya','$2b$10$PLACEHOLDER','Dr Lidya Alemayehu','doctor','22222222-0000-0000-0000-000000000001','+251911000011','Nephrologist','Internal Medicine','MOH-MD-11760','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000000c','dr.tewodros','$2b$10$PLACEHOLDER','Dr Tewodros Mekonnen','doctor','22222222-0000-0000-0000-000000000001','+251911000012','Oncologist','Oncology','MOH-MD-11004','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000000d','dr.samuel','$2b$10$PLACEHOLDER','Dr Samuel Worku','doctor','22222222-0000-0000-0000-000000000012','+251911000013','Internist','Internal Medicine','MOH-MD-12055','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000000e','dr.mulu','$2b$10$PLACEHOLDER','Dr Mulu Habte','doctor','22222222-0000-0000-0000-000000000011','+251911000014','Trauma Surgeon','Surgery','MOH-MD-09811','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000000f','dr.selam','$2b$10$PLACEHOLDER','Dr Selam Fikre','doctor','22222222-0000-0000-0000-000000000018','+251911000015','General Practitioner','OPD','MOH-MD-15320','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000010','dr.dawit','$2b$10$PLACEHOLDER','Dr Dawit Lemma','doctor','22222222-0000-0000-0000-000000000019','+251911000016','General Practitioner','OPD','MOH-MD-15877','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000011','dr.marta','$2b$10$PLACEHOLDER','Dr Marta Girma','doctor','22222222-0000-0000-0000-000000000013','+251911000017','Burns & Paediatric Surgeon','Burns Unit','MOH-MD-10933','active', now() - INTERVAL '120 days'),
 -- awaiting IT verification: cannot sign in until Black Lion IT activates it
 ('33333333-0000-0000-0000-000000000012','dr.yonas','$2b$10$PLACEHOLDER','Dr Yonas Getachew','doctor','22222222-0000-0000-0000-000000000001','+251911000018','Emergency Physician','Emergency Medicine','MOH-MD-13990','pending', NULL),
 -- referral liaisons: the reception desk of each receiving hospital
 ('33333333-0000-0000-0000-000000000013','liaison.ambo','$2b$10$PLACEHOLDER','Sr Hanna Girma','liaison','22222222-0000-0000-0000-000000000002','+251911000019','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000014','liaison.guder','$2b$10$PLACEHOLDER','Sr Bethlehem Tadesse','liaison','22222222-0000-0000-0000-000000000003','+251911000020','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000015','liaison.ginchi','$2b$10$PLACEHOLDER','Sr Rahel Worku','liaison','22222222-0000-0000-0000-000000000004','+251911000021','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000016','liaison.blacklion','$2b$10$PLACEHOLDER','Sr Selamawit Bekele','liaison','22222222-0000-0000-0000-000000000001','+251911000022','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000017','liaison.stpauls','$2b$10$PLACEHOLDER','Sr Meron Tulu','liaison','22222222-0000-0000-0000-000000000011','+251911000023','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000018','liaison.zewditu','$2b$10$PLACEHOLDER','Sr Hiwot Kassa','liaison','22222222-0000-0000-0000-000000000012','+251911000024','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000019','liaison.y12','$2b$10$PLACEHOLDER','Sr Marta Gebre','liaison','22222222-0000-0000-0000-000000000013','+251911000025','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000001a','liaison.ghandi','$2b$10$PLACEHOLDER','Sr Lensa Chala','liaison','22222222-0000-0000-0000-000000000014','+251911000026','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000001b','liaison.menelik','$2b$10$PLACEHOLDER','Sr Yodit Assefa','liaison','22222222-0000-0000-0000-000000000015','+251911000027','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000001c','liaison.amanuel','$2b$10$PLACEHOLDER','Sr Genet Molla','liaison','22222222-0000-0000-0000-000000000017','+251911000028','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000001d','liaison.stpeters','$2b$10$PLACEHOLDER','Sr Aster Kebede','liaison','22222222-0000-0000-0000-000000000016','+251911000029','Referral Liaison Officer','Referral Office',NULL,'active', now() - INTERVAL '120 days'),
 -- triage nurses: confirm arrivals at the door
 ('33333333-0000-0000-0000-00000000001e','triage.ambo','$2b$10$PLACEHOLDER','Nurse Dawit Mekonnen','triage','22222222-0000-0000-0000-000000000002','+251911000030','Emergency Triage Nurse','Emergency',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000001f','triage.blacklion','$2b$10$PLACEHOLDER','Nurse Sara Tesfaye','triage','22222222-0000-0000-0000-000000000001','+251911000031','Emergency Triage Nurse','Emergency',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000020','triage.zewditu','$2b$10$PLACEHOLDER','Nurse Yonas Girma','triage','22222222-0000-0000-0000-000000000012','+251911000032','Emergency Triage Nurse','Emergency',NULL,'active', now() - INTERVAL '120 days'),
 -- specialists
 ('33333333-0000-0000-0000-000000000021','spec.neuro','$2b$10$PLACEHOLDER','Dr Getachew Bekele','specialist','22222222-0000-0000-0000-000000000001','+251911000033','Consultant Neurosurgeon','Neurosurgery','MOH-MD-07455','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000022','spec.psych','$2b$10$PLACEHOLDER','Dr Rahel Desta','specialist','22222222-0000-0000-0000-000000000017','+251911000034','Consultant Psychiatrist','Psychiatry','MOH-MD-08977','active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000023','spec.eye','$2b$10$PLACEHOLDER','Dr Solomon Abera','specialist','22222222-0000-0000-0000-000000000015','+251911000035','Consultant Ophthalmologist','Ophthalmology','MOH-MD-09120','active', now() - INTERVAL '120 days'),
 -- facility administrators
 ('33333333-0000-0000-0000-000000000024','admin.ambo','$2b$10$PLACEHOLDER','Ato Girma Wolde','facility_admin','22222222-0000-0000-0000-000000000002','+251911000036','Hospital Administrator',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000025','admin.blacklion','$2b$10$PLACEHOLDER','W/ro Tsehay Amare','facility_admin','22222222-0000-0000-0000-000000000001','+251911000037','Hospital Administrator',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000026','admin.zewditu','$2b$10$PLACEHOLDER','Ato Henok Tadesse','facility_admin','22222222-0000-0000-0000-000000000012','+251911000038','Hospital Administrator',NULL,NULL,'active', now() - INTERVAL '120 days'),
 -- hospital IT administrators: register and verify their own facility's staff,
 -- and hold the facility's analytics and patient feedback
 ('33333333-0000-0000-0000-000000000027','it.ambo','$2b$10$PLACEHOLDER','Kalkidan Mengistu','it_admin','22222222-0000-0000-0000-000000000002','+251911000039','Hospital IT Administrator','ICT',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000028','it.blacklion','$2b$10$PLACEHOLDER','Natnael Tesfaye','it_admin','22222222-0000-0000-0000-000000000001','+251911000040','Hospital IT Administrator','ICT',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000029','it.stpauls','$2b$10$PLACEHOLDER','Eyob Alemayehu','it_admin','22222222-0000-0000-0000-000000000011','+251911000041','Hospital IT Administrator','ICT',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000002a','it.zewditu','$2b$10$PLACEHOLDER','Mahlet Girma','it_admin','22222222-0000-0000-0000-000000000012','+251911000042','Hospital IT Administrator','ICT',NULL,'active', now() - INTERVAL '120 days'),
 -- woreda health offices
 ('33333333-0000-0000-0000-00000000002b','woreda.ws','$2b$10$PLACEHOLDER','W/ro Sara Negash','woreda','22222222-0000-0000-0000-000000000002','+251911000043','West Shewa Zonal Health Department',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000002c','woreda.tokekutaye','$2b$10$PLACEHOLDER','Ato Tolosa Gutema','woreda','22222222-0000-0000-0000-000000000003','+251911000044','Toke Kutaye Woreda Health Office',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000002d','woreda.dendi','$2b$10$PLACEHOLDER','W/ro Chaltu Nemera','woreda','22222222-0000-0000-0000-000000000004','+251911000045','Dendi Woreda Health Office',NULL,NULL,'active', now() - INTERVAL '120 days'),
 -- regional health bureaus
 ('33333333-0000-0000-0000-00000000002e','rhb.oromia','$2b$10$PLACEHOLDER','Ato Dereje Fufa','region','22222222-0000-0000-0000-000000000002','+251911000046','Oromia Health Bureau — Referral Coordination',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-00000000002f','rhb.aa','$2b$10$PLACEHOLDER','Ato Fikru Desta','region','22222222-0000-0000-0000-000000000001','+251911000047','Addis Ababa Health Bureau — Referral Coordination',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000030','rhb.quality','$2b$10$PLACEHOLDER','W/ro Meaza Alemu','region','22222222-0000-0000-0000-000000000011','+251911000048','Regional Quality Improvement Unit',NULL,NULL,'active', now() - INTERVAL '120 days'),
 -- federal ministry of health
 ('33333333-0000-0000-0000-000000000031','moh.referral','$2b$10$PLACEHOLDER','Ato Yohannes Bekele','moh','22222222-0000-0000-0000-000000000001','+251911000049','FMOH — Referral System Directorate',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000032','moh.quality','$2b$10$PLACEHOLDER','Dr Senait Haile','moh','22222222-0000-0000-0000-000000000011','+251911000050','FMOH — Quality & Safety',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000033','moh.data','$2b$10$PLACEHOLDER','Ato Biruk Tesfa','moh','22222222-0000-0000-0000-000000000012','+251911000051','FMOH — Health Information (DHIS2)',NULL,NULL,'active', now() - INTERVAL '120 days'),
 -- community-based health insurance claims officers
 ('33333333-0000-0000-0000-000000000034','cbhi.ws','$2b$10$PLACEHOLDER','Ato Yonas Assefa','cbhi','22222222-0000-0000-0000-000000000002','+251911000052','CBHI Claims Officer — West Shewa',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000035','cbhi.aa','$2b$10$PLACEHOLDER','W/ro Hirut Mamo','cbhi','22222222-0000-0000-0000-000000000012','+251911000053','CBHI Claims Officer — Addis Ababa',NULL,NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000036','cbhi.oromia','$2b$10$PLACEHOLDER','Ato Gemechu Diriba','cbhi','22222222-0000-0000-0000-000000000003','+251911000054','CBHI Claims Officer — Oromia',NULL,NULL,'active', now() - INTERVAL '120 days'),
 -- platform administrators
 ('33333333-0000-0000-0000-000000000037','sysadmin','$2b$10$PLACEHOLDER','System Administrator','sysadmin','22222222-0000-0000-0000-000000000001','+251911000055','National Platform Administrator','ICT',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000038','sysadmin.ops','$2b$10$PLACEHOLDER','Ato Nahom Girma','sysadmin','22222222-0000-0000-0000-000000000001','+251911000056','Platform Operations','ICT',NULL,'active', now() - INTERVAL '120 days'),
 ('33333333-0000-0000-0000-000000000039','sysadmin.support','$2b$10$PLACEHOLDER','W/rt Eden Solomon','sysadmin','22222222-0000-0000-0000-000000000011','+251911000057','Platform Support','ICT',NULL,'active', now() - INTERVAL '120 days');

-- ================================================================= PATIENTS
INSERT INTO patient (id, given_name_lat, given_name_am, fathers_name_lat, grandfathers_name_lat,
  name_search, sex, age_value, age_unit, phone_primary_enc, phone_owner_relation,
  region_id, woreda_id, cbhi_member, is_pregnant) VALUES
 ('55555555-0000-0000-0000-000000000001','Abeba','አበባ','Kassahun','Wolde','Abeba Kassahun Wolde','female',27,'years', convert_to('+251912000001','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',TRUE,TRUE),
 ('55555555-0000-0000-0000-000000000002','Roba','ሮባ','Dinsa','Gutema','Roba Dinsa Gutema','male',41,'years', convert_to('+251912000002','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004',TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000003','Hanna','ሃና','Tulu','Bekele','Hanna Tulu Bekele','female',34,'years', convert_to('+251912000003','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,FALSE,FALSE),
 ('55555555-0000-0000-0000-000000000004','Getahun','ጌታሁን','Merga','Olana','Getahun Merga Olana','male',63,'years', convert_to('+251912000004','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004',TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000005','Chaltu','ጫልቱ','Fufa','Dibaba','Chaltu Fufa Dibaba','female',22,'years', convert_to('+251912000005','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005',TRUE,TRUE),
 ('55555555-0000-0000-0000-000000000006','Meaza','ሜዛ','Tadesse','Alemu','Meaza Tadesse Alemu','female',29,'years', convert_to('+251912000006','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',TRUE,TRUE),
 ('55555555-0000-0000-0000-000000000007','Mohammed','መሐመድ','Jemal','Kedir','Mohammed Jemal Kedir','male',58,'years', convert_to('+251912000007','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,FALSE,FALSE),
 ('55555555-0000-0000-0000-000000000008','Bezawit','ቤዛዊት','Alemu','Teka','Bezawit Alemu Teka','female',4,'years', convert_to('+251912000008','UTF8'),'mother','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000009','Selamawit','ሰላማዊት','Yohannes','Girma','Selamawit Yohannes Girma','female',30,'years', convert_to('+251912000009','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,FALSE,FALSE),
 ('55555555-0000-0000-0000-00000000000a','Dawit','ዳዊት','Haile','Mariam','Dawit Haile Mariam','male',12,'days', convert_to('+251912000010','UTF8'),'mother','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004',TRUE,FALSE),
 ('55555555-0000-0000-0000-00000000000b','Tolosa','ቶሎሳ','Regassa','Bulti','Tolosa Regassa Bulti','male',37,'years', convert_to('+251912000011','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005',FALSE,FALSE),
 ('55555555-0000-0000-0000-00000000000c','Bontu','ቦንቱ','Lemma','Deressa','Bontu Lemma Deressa','female',3,'years', convert_to('+251912000012','UTF8'),'mother','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005',TRUE,FALSE),
 ('55555555-0000-0000-0000-00000000000d','Yohannes','ዮሐንስ','Terefe','Abera','Yohannes Terefe Abera','male',49,'years', convert_to('+251912000013','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,FALSE,FALSE),
 ('55555555-0000-0000-0000-00000000000e','Tirunesh','ጥሩነሽ','Bekele','Duguma','Tirunesh Bekele Duguma','female',25,'years', convert_to('+251912000014','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004',TRUE,TRUE),
 ('55555555-0000-0000-0000-00000000000f','Kebede','ከበደ','Nigatu','Assefa','Kebede Nigatu Assefa','male',71,'years', convert_to('+251912000015','UTF8'),'son','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',FALSE,FALSE),
 ('55555555-0000-0000-0000-000000000010','Aster','አስቴር','Mulugeta','Kinde','Aster Mulugeta Kinde','female',33,'years', convert_to('+251912000016','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000011','Girma','ግርማ','Tadele','Worku','Girma Tadele Worku','male',45,'years', convert_to('+251912000017','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',FALSE,FALSE),
 ('55555555-0000-0000-0000-000000000012','Genet','ገነት','Abera','Tesfaye','Genet Abera Tesfaye','female',19,'years', convert_to('+251912000018','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004',TRUE,TRUE),
 ('55555555-0000-0000-0000-000000000013','Solomon','ሰለሞን','Getachew','Berhe','Solomon Getachew Berhe','male',52,'years', convert_to('+251912000019','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,FALSE,FALSE),
 ('55555555-0000-0000-0000-000000000014','Rahel','ራሔል','Desta','Mekuria','Rahel Desta Mekuria','female',28,'years', convert_to('+251912000020','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005',TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000015','Hailu','ኃይሉ','Wolde','Senbeta','Hailu Wolde Senbeta','male',66,'years', convert_to('+251912000021','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',FALSE,FALSE),
 ('55555555-0000-0000-0000-000000000016','Zewditu','ዘውዲቱ','Assefa','Kebede','Zewditu Assefa Kebede','female',40,'years', convert_to('+251912000022','UTF8'),'self','11111111-0000-0000-0000-000000000010',NULL,TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000017','Lemma','ለማ','Firdisa','Negash','Lemma Firdisa Negash','male',8,'years', convert_to('+251912000023','UTF8'),'father','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000005',TRUE,FALSE),
 ('55555555-0000-0000-0000-000000000018','Konjit','ኮንጅት','Alemayehu','Tola','Konjit Alemayehu Tola','female',31,'years', convert_to('+251912000024','UTF8'),'self','11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000004',TRUE,TRUE);

-- Patient portal accounts (a patient signs in to track and rate their referral)
INSERT INTO app_user (id, username, password_hash, full_name, role, facility_id, phone, patient_id, status, verified_at) VALUES
 ('33333333-0000-0000-0000-00000000003a','abeba.k','$2b$10$PLACEHOLDER','Abeba Kassahun','patient',NULL,'+251912000001','55555555-0000-0000-0000-000000000001','active', now() - INTERVAL '30 days'),
 ('33333333-0000-0000-0000-00000000003b','roba.d','$2b$10$PLACEHOLDER','Roba Dinsa','patient',NULL,'+251912000002','55555555-0000-0000-0000-000000000002','active', now() - INTERVAL '30 days'),
 ('33333333-0000-0000-0000-00000000003c','hanna.t','$2b$10$PLACEHOLDER','Hanna Tulu','patient',NULL,'+251912000003','55555555-0000-0000-0000-000000000003','active', now() - INTERVAL '30 days'),
 ('33333333-0000-0000-0000-00000000003d','getahun.m','$2b$10$PLACEHOLDER','Getahun Merga','patient',NULL,'+251912000004','55555555-0000-0000-0000-000000000004','active', now() - INTERVAL '30 days'),
 ('33333333-0000-0000-0000-00000000003e','chaltu.f','$2b$10$PLACEHOLDER','Chaltu Fufa','patient',NULL,'+251912000005','55555555-0000-0000-0000-000000000005','active', now() - INTERVAL '25 days'),
 ('33333333-0000-0000-0000-00000000003f','meaza.t','$2b$10$PLACEHOLDER','Meaza Tadesse','patient',NULL,'+251912000006','55555555-0000-0000-0000-000000000006','active', now() - INTERVAL '20 days');

-- ================================================================ REFERRALS
-- At least one referral in every lifecycle status. Facility/clinician names are
-- snapshotted onto the row (a facility may later be renamed or reclassified;
-- historical referrals must still read correctly), and the pre-referral
-- checklist is derived from the reason code so the two never drift apart.
INSERT INTO referral (
  id, referral_code, chain_root_id, parent_referral_id, patient_id, status, urgency, referral_type,
  origin_facility_id, origin_facility_tier, origin_facility_name,
  referring_user_id, referring_user_name, referring_user_phone,
  target_facility_id, target_facility_tier, target_facility_name,
  reason_code, provisional_diagnosis, required_capabilities, clinical, pre_referral,
  suggestion_rank_of_chosen, override_reason, tier_skip_reason, distance_km, estimated_travel_minutes,
  lawful_basis, consent_captured_at, synced_at, created_at, updated_at)
SELECT
  v.id::uuid, v.code, COALESCE(v.root::uuid, v.id::uuid), v.parent::uuid, v.patient::uuid,
  v.status, v.urgency,
  CASE WHEN tf.tier > og.tier THEN 'up' WHEN tf.tier < og.tier THEN 'down' ELSE 'lateral' END,
  og.id, og.tier, og.name_lat,
  ru.id, ru.full_name, ru.phone,
  tf.id, tf.tier, tf.name_lat,
  v.reason, v.dx, rc.required_capabilities, v.clinical::jsonb,
  jsonb_build_object('stabilisationGiven', to_jsonb(rc.stabilisation_items[1:2])),
  v.rank, v.override, v.tier_skip,
  round((|/(power(og.latitude - tf.latitude, 2) + power(og.longitude - tf.longitude, 2)) * 111)::numeric, 1),
  round(((|/(power(og.latitude - tf.latitude, 2) + power(og.longitude - tf.longitude, 2)) * 111) / 35 * 60)::numeric)::int,
  CASE WHEN v.urgency = 'emergency' THEN 'vital_interest' ELSE 'consent' END,
  CASE WHEN v.urgency = 'emergency' THEN NULL ELSE now() - v.ago END,
  now() - v.ago, now() - v.ago, now() - v.ago
FROM (VALUES
 -- id                                    code            root  parent patient                                status                    urgency      origin  target  referring_user  reason                       diagnosis                                                              clinical                                                                                                          rank override                  tier_skip                                    ago
 ('66666666-0000-0000-0000-000000000001','ERL-DRFT-014',NULL,NULL,'55555555-0000-0000-0000-000000000006','DRAFT',                  'emergency','05','02','04','severe_pre_eclampsia',     'Severe pre-eclampsia at 36 weeks, BP 168/112',                        '{"bpSystolic":168,"bpDiastolic":112,"pulse":104,"respRate":22,"temperatureC":36.9,"spo2":96,"gestationalAgeWeeks":36}',1,NULL,                     'intermediate_facility_lacks_capability', INTERVAL '25 minutes'),
 ('66666666-0000-0000-0000-000000000002','ERL-SUBM-207',NULL,NULL,'55555555-0000-0000-0000-000000000018','SUBMITTED',              'emergency','05','02','04','obstructed_labour',        'Obstructed labour, cervix fully dilated 3 h, fetal distress',          '{"bpSystolic":118,"bpDiastolic":76,"pulse":110,"respRate":20,"temperatureC":37.4,"gestationalAgeWeeks":39}',           1,NULL,                     'intermediate_facility_lacks_capability', INTERVAL '3 minutes'),
 ('66666666-0000-0000-0000-000000000003','ERL-ESCL-773',NULL,NULL,'55555555-0000-0000-0000-00000000000a','ESCALATED',              'emergency','09','02','02','neonatal_sepsis',          'Neonate 12 days, poor feeding, temperature instability',               '{"pulse":168,"respRate":68,"temperatureC":35.4,"spo2":91}',                                                            1,NULL,                     'emergency_life_threatening',             INTERVAL '38 minutes'),
 ('66666666-0000-0000-0000-000000000004','ERL-ACKD-231',NULL,NULL,'55555555-0000-0000-0000-000000000003','ACKNOWLEDGED',           'urgent',   '18','12','0f','acute_abdomen',            'Acute appendicitis, guarding right iliac fossa',                       '{"bpSystolic":118,"bpDiastolic":76,"pulse":96,"respRate":18,"temperatureC":38.2,"spo2":98}',                           1,NULL,                     NULL,                                     INTERVAL '2 hours'),
 ('66666666-0000-0000-0000-000000000005','ERL-INFO-885',NULL,NULL,'55555555-0000-0000-0000-000000000007','INFO_REQUESTED',         'routine',  '19','13','10','imaging_ct',               'Chronic headache with new focal neurological signs — CT head required','{"bpSystolic":128,"bpDiastolic":84,"pulse":76,"respRate":16,"temperatureC":36.6,"spo2":98}',                           1,NULL,                     NULL,                                     INTERVAL '5 hours'),
 ('66666666-0000-0000-0000-000000000006','ERL-ACPT-318',NULL,NULL,'55555555-0000-0000-0000-000000000012','ACCEPTED',               'emergency','06','02','05','postpartum_haemorrhage',   'Postpartum haemorrhage, estimated blood loss 900 ml',                  '{"bpSystolic":92,"bpDiastolic":58,"pulse":124,"respRate":24,"temperatureC":36.4,"spo2":95}',                           1,NULL,                     'emergency_life_threatening',             INTERVAL '55 minutes'),
 ('66666666-0000-0000-0000-000000000007','ERL-LAPS-642',NULL,NULL,'55555555-0000-0000-0000-00000000000b','ACCEPTED_LAPSED',        'urgent',   '07','04','06','acute_abdomen',            'Acute abdomen, suspected perforated ulcer',                            '{"bpSystolic":106,"bpDiastolic":68,"pulse":108,"respRate":22,"temperatureC":38.6,"spo2":96}',                          1,NULL,                     NULL,                                     INTERVAL '2 days'),
 ('66666666-0000-0000-0000-000000000008','ERL-DECL-159',NULL,NULL,'55555555-0000-0000-0000-000000000003','DECLINED',               'urgent',   '18','12','0f','acute_abdomen',            'Acute appendicitis, worsening peritonism',                             '{"bpSystolic":114,"bpDiastolic":72,"pulse":104,"respRate":20,"temperatureC":38.4,"spo2":97}',                          1,NULL,                     NULL,                                     INTERVAL '8 days'),
 ('66666666-0000-0000-0000-000000000009','ERL-REDI-426',NULL,NULL,'55555555-0000-0000-0000-00000000000d','REDIRECTED',             'urgent',   '04','02','15','renal_failure',            'AKI on CKD, creatinine 8.4 mg/dL, hyperkalaemia',                      '{"bpSystolic":172,"bpDiastolic":98,"pulse":88,"respRate":20,"temperatureC":36.5,"spo2":96}',                           1,NULL,                     NULL,                                     INTERVAL '3 days'),
 ('66666666-0000-0000-0000-00000000000a','ERL-TRAN-561',NULL,NULL,'55555555-0000-0000-0000-000000000008','IN_TRANSIT',             'emergency','08','02','01','severe_pneumonia_child',   'Severe pneumonia, 4-year-old, SpO2 88% on air',                        '{"bpSystolic":96,"bpDiastolic":60,"pulse":148,"respRate":52,"temperatureC":39.1,"spo2":88}',                           1,NULL,                     'emergency_life_threatening',             INTERVAL '35 minutes'),
 ('66666666-0000-0000-0000-00000000000b','ERL-ARRV-193',NULL,NULL,'55555555-0000-0000-0000-000000000002','ARRIVED',                'emergency','06','02','05','major_trauma',             'Road traffic accident: open tibial fracture, query internal bleeding', '{"bpSystolic":100,"bpDiastolic":64,"pulse":122,"respRate":24,"temperatureC":36.5,"spo2":94}',                          1,NULL,                     'emergency_life_threatening',             INTERVAL '5 hours'),
 ('66666666-0000-0000-0000-00000000000c','ERL-NOAR-737',NULL,NULL,'55555555-0000-0000-0000-00000000000c','NOT_ARRIVED',            'urgent',   '0a','04','03','severe_acute_malnutrition','Severe acute malnutrition, MUAC 10.4 cm, refusing feeds',              '{"bpSystolic":88,"bpDiastolic":56,"pulse":130,"respRate":38,"temperatureC":35.9,"spo2":95,"muacCm":10.4}',             1,NULL,                     NULL,                                     INTERVAL '2 days'),
 ('66666666-0000-0000-0000-00000000000d','ERL-CARE-904',NULL,NULL,'55555555-0000-0000-0000-000000000006','IN_CARE',                'emergency','05','02','04','severe_pre_eclampsia',     'Severe pre-eclampsia at 35 weeks, BP 172/114',                         '{"bpSystolic":172,"bpDiastolic":114,"pulse":102,"respRate":22,"temperatureC":36.9,"spo2":97,"gestationalAgeWeeks":35}',1,NULL,                     'emergency_life_threatening',             INTERVAL '1 day'),
 ('66666666-0000-0000-0000-00000000000e','ERL-OUTC-275',NULL,NULL,'55555555-0000-0000-0000-000000000005','OUTCOME_RETURNED',       'emergency','04','02','15','obstructed_labour',        'Obstructed labour, fetal distress',                                   '{"bpSystolic":118,"bpDiastolic":76,"pulse":110,"respRate":20,"temperatureC":37.4,"gestationalAgeWeeks":39}',           1,NULL,                     NULL,                                     INTERVAL '2 days'),
 ('66666666-0000-0000-0000-00000000000f','ERL-ONWD-380',NULL,NULL,'55555555-0000-0000-0000-000000000004','REFERRED_ONWARD',        'routine',  '02','01','07','suspected_cancer',         'Progressive dysphagia and weight loss — suspected oesophageal cancer', '{"bpSystolic":132,"bpDiastolic":80,"pulse":84,"respRate":18,"temperatureC":36.4,"spo2":96}',                           1,NULL,                     NULL,                                     INTERVAL '6 days'),
 ('66666666-0000-0000-0000-000000000010','ERL-K7PM-42', NULL,NULL,'55555555-0000-0000-0000-000000000001','CLOSED_COMPLETED',       'emergency','08','02','01','severe_pre_eclampsia',     'Severe pre-eclampsia at 34 weeks',                                    '{"bpSystolic":160,"bpDiastolic":110,"pulse":98,"respRate":20,"temperatureC":36.8,"spo2":97,"gestationalAgeWeeks":34}', 1,NULL,                     'emergency_life_threatening',             INTERVAL '21 days'),
 ('66666666-0000-0000-0000-000000000011','ERL-W3XR-88', NULL,NULL,'55555555-0000-0000-0000-000000000002','CLOSED_COMPLETED',       'emergency','06','02','05','major_trauma',             'Road traffic accident: open tibial fracture',                          '{"bpSystolic":100,"bpDiastolic":64,"pulse":122,"respRate":24,"temperatureC":36.5,"spo2":94}',                          2,'transport_availability',  'emergency_life_threatening',             INTERVAL '15 days'),
 ('66666666-0000-0000-0000-000000000012','ERL-D4FH-63', NULL,NULL,'55555555-0000-0000-0000-000000000004','CLOSED_COMPLETED',       'routine',  '02','01','07','suspected_cancer',         'Progressive dysphagia, weight loss — suspected oesophageal malignancy','{"bpSystolic":132,"bpDiastolic":80,"pulse":84,"respRate":18,"temperatureC":36.4,"spo2":96}',                           2,'previous_care_there',     NULL,                                     INTERVAL '25 days'),
 ('66666666-0000-0000-0000-000000000013','ERL-CNAR-518',NULL,NULL,'55555555-0000-0000-0000-000000000011','CLOSED_NOT_ARRIVED',     'routine',  '09','03','02','tb_diagnostic',            'Chronic cough 4 weeks, night sweats — GeneXpert required',             '{"bpSystolic":118,"bpDiastolic":74,"pulse":88,"respRate":20,"temperatureC":37.6,"spo2":96}',                           1,NULL,                     NULL,                                     INTERVAL '40 days'),
 ('66666666-0000-0000-0000-000000000014','ERL-CDEC-661',NULL,NULL,'55555555-0000-0000-0000-000000000007','CLOSED_DECLINED_ALL',    'routine',  '19','17','10','mental_health',            'First-episode psychosis, family requesting admission',                 '{"bpSystolic":122,"bpDiastolic":80,"pulse":84,"respRate":16,"temperatureC":36.8,"spo2":98}',                           1,NULL,                     NULL,                                     INTERVAL '12 days'),
 ('66666666-0000-0000-0000-000000000015','ERL-CCAN-042',NULL,NULL,'55555555-0000-0000-0000-000000000014','CLOSED_CANCELLED',       'urgent',   '05','02','04','acute_abdomen',            'Acute abdomen — symptoms resolved, patient reassessed locally',        '{"bpSystolic":120,"bpDiastolic":78,"pulse":92,"respRate":18,"temperatureC":37.8,"spo2":98}',                           1,NULL,                     NULL,                                     INTERVAL '9 days'),
 ('66666666-0000-0000-0000-000000000016','ERL-CDEA-829',NULL,NULL,'55555555-0000-0000-0000-00000000000f','CLOSED_DECEASED',        'emergency','08','02','01','major_trauma',             'Fall from height, severe head injury, GCS 6',                          '{"bpSystolic":88,"bpDiastolic":52,"pulse":132,"respRate":28,"temperatureC":35.8,"spo2":89}',                           1,NULL,                     'emergency_life_threatening',             INTERVAL '18 days'),
 ('66666666-0000-0000-0000-000000000017','ERL-CLTF-296',NULL,NULL,'55555555-0000-0000-0000-000000000017','CLOSED_LOST_TO_FOLLOWUP','urgent',   '0a','04','03','severe_acute_malnutrition','Severe acute malnutrition with oedema',                                '{"bpSystolic":90,"bpDiastolic":58,"pulse":126,"respRate":34,"temperatureC":36.1,"spo2":96,"muacCm":10.8}',             1,NULL,                     NULL,                                     INTERVAL '45 days'),
 -- the child spawned by the redirect above: same chain, new destination
 ('66666666-0000-0000-0000-000000000018','ERL-REDC-437','66666666-0000-0000-0000-000000000009','66666666-0000-0000-0000-000000000009','55555555-0000-0000-0000-00000000000d','SUBMITTED','urgent','02','01','13','renal_failure','AKI on CKD — redirected for dialysis','{"bpSystolic":172,"bpDiastolic":98,"pulse":88,"respRate":20,"temperatureC":36.5,"spo2":96}',1,NULL,NULL, INTERVAL '3 days'),
 -- further closed loops, so the analytics have something to say
 ('66666666-0000-0000-0000-000000000019','ERL-CMPL-114',NULL,NULL,'55555555-0000-0000-0000-000000000010','CLOSED_COMPLETED',       'routine',  '18','13','0f','imaging_ct',               'Persistent headache — CT head requested',                              '{"bpSystolic":126,"bpDiastolic":82,"pulse":78,"respRate":16,"temperatureC":36.5,"spo2":99}',                           1,NULL,                     NULL,                                     INTERVAL '12 days'),
 ('66666666-0000-0000-0000-00000000001a','ERL-CMPL-925',NULL,NULL,'55555555-0000-0000-0000-000000000013','CLOSED_COMPLETED',       'urgent',   '19','15','10','eye_emergency',            'Penetrating eye injury (metal fragment), right eye',                   '{"bpSystolic":124,"bpDiastolic":78,"pulse":88,"respRate":16,"temperatureC":36.6,"spo2":99}',                           1,NULL,                     NULL,                                     INTERVAL '6 days'),
 ('66666666-0000-0000-0000-00000000001b','ERL-CMPL-356',NULL,NULL,'55555555-0000-0000-0000-000000000016','CLOSED_COMPLETED',       'emergency','06','04','05','obstructed_labour',        'Obstructed labour, previous caesarean scar',                           '{"bpSystolic":122,"bpDiastolic":78,"pulse":104,"respRate":20,"temperatureC":37.2,"gestationalAgeWeeks":40}',           1,NULL,                     'emergency_life_threatening',             INTERVAL '30 days'),
 ('66666666-0000-0000-0000-00000000001c','ERL-DECL-702',NULL,NULL,'55555555-0000-0000-0000-000000000015','DECLINED',               'urgent',   '07','02','06','renal_failure',            'Chronic kidney disease, needs dialysis assessment',                    '{"bpSystolic":168,"bpDiastolic":94,"pulse":86,"respRate":18,"temperatureC":36.6,"spo2":97}',                           1,NULL,                     NULL,                                     INTERVAL '4 days')
) AS v(id, code, root, parent, patient, status, urgency, origin, target, ruser, reason, dx, clinical, rank, override, tier_skip, ago)
JOIN facility og ON og.id = ('22222222-0000-0000-0000-0000000000' || v.origin)::uuid
JOIN facility tf ON tf.id = ('22222222-0000-0000-0000-0000000000' || v.target)::uuid
JOIN app_user ru ON ru.id = ('33333333-0000-0000-0000-0000000000' || v.ruser)::uuid
JOIN reason_code rc ON rc.code = v.reason;

-- ------------------------------------------------------- response deadlines
-- Referrals still awaiting a response keep their SLA deadline in the FUTURE so
-- the background clock does not immediately escalate them; the escalated one
-- is already marked breached and is therefore stable.
UPDATE referral SET sla_deadline_at = now() + INTERVAL '4 minutes'
 WHERE status = 'SUBMITTED' AND urgency = 'emergency';
UPDATE referral SET sla_deadline_at = now() + INTERVAL '22 minutes'
 WHERE status IN ('SUBMITTED','ACKNOWLEDGED','INFO_REQUESTED') AND urgency = 'urgent';
UPDATE referral SET sla_deadline_at = now() + INTERVAL '3 hours'
 WHERE status IN ('SUBMITTED','ACKNOWLEDGED','INFO_REQUESTED') AND urgency = 'routine';
UPDATE referral SET sla_deadline_at = created_at + INTERVAL '5 minutes',
                    sla_breached = TRUE, escalation_level = 1
 WHERE status = 'ESCALATED';
UPDATE referral SET acknowledged_at = created_at + INTERVAL '9 minutes',
                    acknowledged_by = '33333333-0000-0000-0000-000000000018'
 WHERE status IN ('ACKNOWLEDGED','INFO_REQUESTED');

-- ------------------------------------------------------------- decisions
UPDATE referral SET decision = 'declined', decision_at = created_at + INTERVAL '26 minutes',
       decision_by = '33333333-0000-0000-0000-000000000018',
       decline_reason = 'no_bed',
       decline_note = 'Surgical ward full after a mass-casualty admission; try Yekatit 12'
 WHERE id = '66666666-0000-0000-0000-000000000008';
UPDATE referral SET decision = 'declined', decision_at = created_at + INTERVAL '41 minutes',
       decision_by = '33333333-0000-0000-0000-000000000013',
       decline_reason = 'no_specialist',
       decline_note = 'No nephrology service here — refer to a tier-5 hospital'
 WHERE id = '66666666-0000-0000-0000-00000000001c';
UPDATE referral SET decision = 'declined', decision_at = created_at + INTERVAL '2 hours',
       decision_by = '33333333-0000-0000-0000-00000000001c',
       decline_reason = 'capacity_exceeded',
       decline_note = 'Admission ward at capacity; outpatient slot offered in 5 days'
 WHERE id = '66666666-0000-0000-0000-000000000014';
UPDATE referral SET decision = 'redirected', decision_at = created_at + INTERVAL '35 minutes',
       decision_by = '33333333-0000-0000-0000-000000000013',
       redirect_target_facility_id = '22222222-0000-0000-0000-000000000001',
       decline_note = 'Redirected to Black Lion as ERL-REDC-437 — no dialysis service here'
 WHERE id = '66666666-0000-0000-0000-000000000009';

-- --------------------------------------------- acceptance, reception & beds
-- Accepted referrals name the receiving clinician AND carry the reception
-- assignment: who at the receiving hospital is responsible for this patient.
UPDATE referral r SET
  decision = 'accepted',
  decision_at = r.created_at + INTERVAL '6 minutes',
  decision_by = a.liaison_id,
  receiving_clinician_name = a.doctor_name,
  receiving_clinician_phone = a.doctor_phone,
  assigned_doctor_id = a.doctor_id,
  assigned_doctor_name = a.doctor_name,
  assigned_at = r.created_at + INTERVAL '8 minutes',
  assigned_by = a.liaison_id,
  assigned_by_name = a.liaison_name,
  assignment_note = a.note
FROM (
  SELECT ref.id AS referral_id, d.id AS doctor_id, d.full_name AS doctor_name, d.phone AS doctor_phone,
         l.id AS liaison_id, l.full_name AS liaison_name, x.note
  FROM (VALUES
    ('66666666-0000-0000-0000-000000000006','07','13','On call for obstetrics tonight'),
    ('66666666-0000-0000-0000-000000000007','09','15','Surgical take today'),
    ('66666666-0000-0000-0000-00000000000a','08','13','Paediatric emergency — oxygen bay prepared'),
    ('66666666-0000-0000-0000-00000000000b','09','13','Trauma call'),
    ('66666666-0000-0000-0000-00000000000d','07','13','Obstetric emergency, theatre alerted'),
    ('66666666-0000-0000-0000-00000000000e','07','13','Theatre team ready'),
    ('66666666-0000-0000-0000-00000000000f','0c','16','Oncology multidisciplinary team'),
    ('66666666-0000-0000-0000-000000000010','07','13','Obstetric emergency'),
    ('66666666-0000-0000-0000-000000000011','09','13','Trauma call'),
    ('66666666-0000-0000-0000-000000000012','0c','16','Upper GI clinic'),
    ('66666666-0000-0000-0000-000000000016','09','13','Trauma call — resuscitation bay'),
    ('66666666-0000-0000-0000-000000000019','11','19','CT list today'),
    ('66666666-0000-0000-0000-00000000001a','23','1b','Ophthalmology on call'),
    ('66666666-0000-0000-0000-00000000001b','07','15','Obstetric theatre'),
    ('66666666-0000-0000-0000-00000000000c','07','15','Awaiting arrival'),
    ('66666666-0000-0000-0000-000000000017','07','15','Nutrition stabilisation centre'),
    ('66666666-0000-0000-0000-000000000013','07','14','TB clinic')
  ) AS x(referral_id, doctor, liaison, note)
  JOIN referral ref ON ref.id = x.referral_id::uuid
  JOIN app_user d ON d.id = ('33333333-0000-0000-0000-0000000000' || x.doctor)::uuid
  JOIN app_user l ON l.id = ('33333333-0000-0000-0000-0000000000' || x.liaison)::uuid
) AS a
WHERE r.id = a.referral_id;

-- A bed is only held for referrals that have not yet been admitted; the
-- reservation expiry stays in the future so the clock does not lapse it.
UPDATE referral SET bed_reserved = TRUE, reserved_ward_type = 'maternity',
       bed_reservation_expires_at = now() + INTERVAL '4 hours'
 WHERE id = '66666666-0000-0000-0000-000000000006';
UPDATE referral SET bed_reserved = TRUE, reserved_ward_type = 'paediatric',
       bed_reservation_expires_at = now() + INTERVAL '5 hours'
 WHERE id = '66666666-0000-0000-0000-00000000000a';
-- lapsed: the reservation ran out before the patient travelled
UPDATE referral SET bed_reserved = FALSE, reserved_ward_type = NULL,
       bed_reservation_expires_at = created_at + INTERVAL '12 hours'
 WHERE id = '66666666-0000-0000-0000-000000000007';

-- --------------------------------------------------------- transit & arrival
UPDATE referral SET departed_at = created_at + INTERVAL '18 minutes',
       transport_mode = 'ambulance', escort_type = 'hew',
       expected_arrival_at = now() + INTERVAL '2 hours'
 WHERE id = '66666666-0000-0000-0000-00000000000a';
UPDATE referral SET departed_at = created_at + INTERVAL '20 minutes',
       transport_mode = 'ambulance', escort_type = 'nurse',
       arrived_at = created_at + INTERVAL '51 minutes', transit_minutes = 31,
       arrival_method = 'code_entry', arrival_confirmed_by = '33333333-0000-0000-0000-00000000001e'
 WHERE id IN ('66666666-0000-0000-0000-00000000000b','66666666-0000-0000-0000-000000000011');
UPDATE referral SET departed_at = created_at + INTERVAL '15 minutes',
       transport_mode = 'ambulance', escort_type = 'nurse',
       arrived_at = created_at + INTERVAL '40 minutes', transit_minutes = 25,
       arrival_method = 'qr_scan', arrival_confirmed_by = '33333333-0000-0000-0000-00000000001e'
 WHERE id IN ('66666666-0000-0000-0000-00000000000d','66666666-0000-0000-0000-000000000010',
              '66666666-0000-0000-0000-000000000016');
UPDATE referral SET departed_at = created_at + INTERVAL '30 minutes',
       transport_mode = 'public', escort_type = 'family',
       arrived_at = created_at + INTERVAL '4 hours', transit_minutes = 210,
       arrival_method = 'attestation', arrival_confirmed_by = '33333333-0000-0000-0000-00000000001f'
 WHERE id IN ('66666666-0000-0000-0000-00000000000e','66666666-0000-0000-0000-00000000000f',
              '66666666-0000-0000-0000-000000000012','66666666-0000-0000-0000-000000000019',
              '66666666-0000-0000-0000-00000000001a','66666666-0000-0000-0000-00000000001b');
-- departed but never arrived (the grace period has already expired)
UPDATE referral SET departed_at = created_at + INTERVAL '40 minutes',
       transport_mode = 'public', escort_type = 'none',
       expected_arrival_at = created_at + INTERVAL '24 hours'
 WHERE id IN ('66666666-0000-0000-0000-00000000000c','66666666-0000-0000-0000-000000000013',
              '66666666-0000-0000-0000-000000000017');

-- ------------------------------------------------------------------ outcomes
UPDATE referral SET outcome = v.outcome::jsonb,
       outcome_submitted_at = created_at + v.after,
       outcome_submitted_by = ('33333333-0000-0000-0000-0000000000' || v.doctor)::uuid
FROM (VALUES
 ('66666666-0000-0000-0000-00000000000e','07', INTERVAL '8 hours',  '{"finalDiagnosis":"Obstructed labour — emergency caesarean section","disposition":"admitted","treatmentProvided":"Emergency LSCS under spinal anaesthesia; live male infant, Apgar 8/9","followUpInstructions":"Wound review at Ginchi Primary Hospital in 7 days; iron and folate for 3 months","followUpRequired":true}'),
 ('66666666-0000-0000-0000-00000000000f','0c', INTERVAL '4 days',   '{"finalDiagnosis":"Oesophageal carcinoma — staging complete, referred to radiotherapy","disposition":"referred_onward","treatmentProvided":"Endoscopy, biopsy and staging CT; multidisciplinary team review","followUpInstructions":"Radiotherapy planning appointment; nutrition support started","followUpRequired":true}'),
 ('66666666-0000-0000-0000-000000000010','07', INTERVAL '2 days',   '{"finalDiagnosis":"Severe pre-eclampsia — stabilised, delivered at 36 weeks","disposition":"discharged_home","treatmentProvided":"MgSO4 protocol completed; induced at 36 weeks; mother and baby well","followUpInstructions":"Blood pressure check at Awaro Health Post weekly for 6 weeks","followUpRequired":true}'),
 ('66666666-0000-0000-0000-000000000011','09', INTERVAL '3 days',   '{"finalDiagnosis":"Open tibial fracture — external fixation","disposition":"admitted","treatmentProvided":"Debridement and external fixation; two units transfused","followUpInstructions":"Orthopaedic review in 2 weeks; physiotherapy referral","followUpRequired":true}'),
 ('66666666-0000-0000-0000-000000000012','0c', INTERVAL '11 days',  '{"finalDiagnosis":"Oesophageal squamous cell carcinoma confirmed on biopsy","disposition":"admitted","treatmentProvided":"Endoscopy and biopsy; staging CT; chemoradiotherapy planned","followUpInstructions":"Oncology follow-up at Black Lion; nutrition support plan shared","followUpRequired":true}'),
 ('66666666-0000-0000-0000-000000000016','09', INTERVAL '6 hours',  '{"finalDiagnosis":"Severe traumatic brain injury","disposition":"died","treatmentProvided":"Resuscitation and neurosurgical review; died despite maximal support","followUpInstructions":"Bereavement support offered to the family","followUpRequired":false}'),
 ('66666666-0000-0000-0000-000000000019','11', INTERVAL '1 day',    '{"finalDiagnosis":"CT head normal — migraine with aura","disposition":"back_referred","treatmentProvided":"CT performed and reported; prophylaxis started","followUpInstructions":"Continue follow-up at Addis Ketema Health Centre; return if red-flag symptoms","followUpRequired":true}'),
 ('66666666-0000-0000-0000-00000000001a','23', INTERVAL '1 day',    '{"finalDiagnosis":"Corneal laceration repaired; intraocular foreign body removed","disposition":"discharged_home","treatmentProvided":"Primary repair under general anaesthesia; intravitreal antibiotics","followUpInstructions":"Ophthalmology review in 5 days; protective shield at night","followUpRequired":true}'),
 ('66666666-0000-0000-0000-00000000001b','07', INTERVAL '2 days',   '{"finalDiagnosis":"Obstructed labour — caesarean section, healthy infant","disposition":"discharged_home","treatmentProvided":"Emergency caesarean section; uneventful recovery","followUpInstructions":"Postnatal review at Guder Health Centre in 6 weeks","followUpRequired":true}')
) AS v(id, doctor, after, outcome)
WHERE referral.id = v.id::uuid;

UPDATE referral SET outcome_acknowledged_at = outcome_submitted_at + INTERVAL '6 hours',
       outcome_acknowledged_by = referring_user_id
 WHERE status = 'CLOSED_COMPLETED';

-- ============================================================== STATE TRAILS
-- Every referral carries the audit trail that produced its current status.
-- The path is derived from the status itself (as `event:resulting_status`
-- pairs) so a trail can never contradict the row it belongs to, and the
-- assignment step is inserted where reception actually acted.
DO $$
DECLARE
  r          RECORD;
  path       TEXT[];
  step       TEXT;
  parts      TEXT[];
  prev       TEXT;
  idx        INT;
  span       INTERVAL;
  actor      TEXT;
  reception  TEXT;
BEGIN
  FOR r IN SELECT * FROM referral ORDER BY created_at LOOP
    path := CASE r.status
      WHEN 'DRAFT'                   THEN ARRAY['create:DRAFT']
      WHEN 'SUBMITTED'               THEN ARRAY['create:DRAFT','submit:SUBMITTED']
      WHEN 'ESCALATED'               THEN ARRAY['create:DRAFT','submit:SUBMITTED','sla_breach:ESCALATED']
      WHEN 'ACKNOWLEDGED'            THEN ARRAY['create:DRAFT','submit:SUBMITTED','acknowledge:ACKNOWLEDGED']
      WHEN 'INFO_REQUESTED'          THEN ARRAY['create:DRAFT','submit:SUBMITTED','acknowledge:ACKNOWLEDGED','request_info:INFO_REQUESTED']
      WHEN 'ACCEPTED'                THEN ARRAY['create:DRAFT','submit:SUBMITTED','acknowledge:ACKNOWLEDGED','accept:ACCEPTED']
      WHEN 'ACCEPTED_LAPSED'         THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','reservation_lapse:ACCEPTED_LAPSED']
      WHEN 'DECLINED'                THEN ARRAY['create:DRAFT','submit:SUBMITTED','acknowledge:ACKNOWLEDGED','decline:DECLINED']
      WHEN 'REDIRECTED'              THEN ARRAY['create:DRAFT','submit:SUBMITTED','acknowledge:ACKNOWLEDGED','redirect:REDIRECTED']
      WHEN 'IN_TRANSIT'              THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT']
      WHEN 'ARRIVED'                 THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','arrive:ARRIVED']
      WHEN 'NOT_ARRIVED'             THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','grace_expiry:NOT_ARRIVED']
      WHEN 'IN_CARE'                 THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','arrive:ARRIVED','start_care:IN_CARE']
      WHEN 'OUTCOME_RETURNED'        THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','arrive:ARRIVED','start_care:IN_CARE','submit_outcome:OUTCOME_RETURNED']
      WHEN 'REFERRED_ONWARD'         THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','arrive:ARRIVED','start_care:IN_CARE','refer_onward:REFERRED_ONWARD']
      WHEN 'CLOSED_COMPLETED'        THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','arrive:ARRIVED','start_care:IN_CARE','submit_outcome:OUTCOME_RETURNED','acknowledge_outcome:CLOSED_COMPLETED']
      WHEN 'CLOSED_NOT_ARRIVED'      THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','grace_expiry:NOT_ARRIVED','grace_expiry:CLOSED_NOT_ARRIVED']
      WHEN 'CLOSED_DECLINED_ALL'     THEN ARRAY['create:DRAFT','submit:SUBMITTED','acknowledge:ACKNOWLEDGED','decline:DECLINED','close_declined_all:CLOSED_DECLINED_ALL']
      WHEN 'CLOSED_CANCELLED'        THEN ARRAY['create:DRAFT','submit:SUBMITTED','cancel:CLOSED_CANCELLED']
      WHEN 'CLOSED_DECEASED'         THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','arrive:ARRIVED','record_death:CLOSED_DECEASED']
      WHEN 'CLOSED_LOST_TO_FOLLOWUP' THEN ARRAY['create:DRAFT','submit:SUBMITTED','accept:ACCEPTED','depart:IN_TRANSIT','grace_expiry:NOT_ARRIVED','lost_timeout:CLOSED_LOST_TO_FOLLOWUP']
      ELSE ARRAY['create:DRAFT']
    END;

    -- who staffs the receiving desk for this referral
    SELECT full_name INTO reception FROM app_user
      WHERE facility_id = r.target_facility_id AND role = 'liaison' AND status = 'active' LIMIT 1;
    reception := COALESCE(reception, 'Receiving team');

    span := GREATEST(r.updated_at - r.created_at, INTERVAL '20 minutes') / GREATEST(array_length(path, 1), 1);
    prev := NULL;
    idx  := 0;

    FOREACH step IN ARRAY path LOOP
      idx := idx + 1;
      parts := string_to_array(step, ':');
      actor := CASE
        WHEN parts[1] IN ('sla_breach','grace_expiry','lost_timeout','reservation_lapse') THEN 'system'
        WHEN parts[1] IN ('create','submit','depart','cancel','acknowledge_outcome','close_declined_all','supply_info','reroute')
          THEN r.referring_user_name
        WHEN parts[1] IN ('submit_outcome','start_care','refer_onward','record_death')
          THEN COALESCE(r.assigned_doctor_name, reception)
        ELSE reception
      END;

      INSERT INTO referral_transition
        (referral_id, from_status, to_status, event, actor_user_name, actor_facility_id, reason_code, note, occurred_at)
      VALUES (
        r.id, prev, parts[2], parts[1], actor,
        CASE WHEN parts[1] IN ('create','submit','depart','cancel','acknowledge_outcome','close_declined_all','reroute')
             THEN r.origin_facility_id ELSE r.target_facility_id END,
        CASE WHEN parts[1] = 'decline' THEN r.decline_reason ELSE NULL END,
        CASE WHEN parts[1] = 'decline' THEN r.decline_note
             WHEN parts[1] = 'redirect' THEN r.decline_note
             WHEN parts[1] = 'accept' AND r.bed_reserved
               THEN 'Bed reserved (' || COALESCE(r.reserved_ward_type, 'general') || ')'
             ELSE NULL END,
        r.created_at + span * (idx - 1)
      );

      -- reception forwards the case to a named clinician right after acceptance
      IF parts[1] = 'accept' AND r.assigned_doctor_id IS NOT NULL THEN
        INSERT INTO referral_transition
          (referral_id, from_status, to_status, event, actor_user_name, actor_facility_id, note, occurred_at)
        VALUES (r.id, parts[2], parts[2], 'assign', r.assigned_by_name, r.target_facility_id,
                'Assigned to ' || r.assigned_doctor_name
                  || COALESCE(' — ' || r.assignment_note, ''),
                r.created_at + span * (idx - 1) + INTERVAL '2 minutes');
      END IF;

      prev := parts[2];
    END LOOP;
  END LOOP;
END $$;

-- ============================================================== ATTACHMENTS
-- Imaging and documents travel with the referral so the receiving team never
-- repeats a test. Placeholder pixels stand in for the real DICOM/PDF exports.
INSERT INTO referral_attachment (referral_id, kind, object_key, sha256, size_bytes, mime_type,
  uploaded_by, file_name, content)
SELECT v.referral::uuid, v.kind,
       'db://' || v.referral || '/' || v.name,
       encode(digest(decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64'), 'sha256'), 'hex'),
       68, 'image/png',
       r.referring_user_id, v.name,
       decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64')
FROM (VALUES
 ('66666666-0000-0000-0000-000000000002','imaging', 'obstetric-ultrasound-39w.png'),
 ('66666666-0000-0000-0000-00000000000a','imaging', 'chest-xray-ap.png'),
 ('66666666-0000-0000-0000-00000000000b','imaging', 'tibia-xray-lateral.png'),
 ('66666666-0000-0000-0000-00000000000d','imaging', 'obstetric-ultrasound-35w.png'),
 ('66666666-0000-0000-0000-00000000000f','document','endoscopy-report.png'),
 ('66666666-0000-0000-0000-000000000005','imaging', 'previous-ct-head.png'),
 ('66666666-0000-0000-0000-000000000012','document','biopsy-histopathology.png'),
 ('66666666-0000-0000-0000-000000000019','imaging', 'ct-head-axial.png')
) AS v(referral, kind, name)
JOIN referral r ON r.id = v.referral::uuid;

-- ================================================================= FEEDBACK
-- Patients rate the facility that referred them and the one that treated them,
-- once the loop is closed. Visible only to that facility's IT/quality admin.
INSERT INTO referral_feedback (referral_id, patient_id, facility_id, facility_role, rating, comment, created_at)
SELECT r.id, r.patient_id,
       CASE v.side WHEN 'origin' THEN r.origin_facility_id ELSE r.target_facility_id END,
       v.side, v.rating, v.comment, r.outcome_acknowledged_at + INTERVAL '1 day'
FROM (VALUES
 ('66666666-0000-0000-0000-000000000010','origin',5,'Almaz explained everything and arranged the transfer quickly.'),
 ('66666666-0000-0000-0000-000000000010','target',4,'Care was very good. Waiting at the maternity ward was long.'),
 ('66666666-0000-0000-0000-000000000011','origin',4,'They stabilised my leg well before the transfer.'),
 ('66666666-0000-0000-0000-000000000011','target',5,'Surgery went well and the staff followed up every day.'),
 ('66666666-0000-0000-0000-000000000012','origin',4,'Dr Abdi organised everything and the letter had all my results.'),
 ('66666666-0000-0000-0000-000000000012','target',3,'Very skilled doctors but the queue at oncology took two days.'),
 ('66666666-0000-0000-0000-000000000019','origin',5,'The doctor sent my scans ahead so I did not repeat any test.'),
 ('66666666-0000-0000-0000-000000000019','target',4,'The CT was done the same day I arrived.'),
 ('66666666-0000-0000-0000-00000000001a','target',5,'My eye was operated the same evening. Very grateful.'),
 ('66666666-0000-0000-0000-00000000001a','origin',4,'They shielded my eye and sent me straight away.'),
 ('66666666-0000-0000-0000-00000000001b','target',2,'The midwives were kind but I waited a long time before the operation.'),
 ('66666666-0000-0000-0000-00000000001b','origin',4,'The health centre staff stayed with me until the ambulance came.')
) AS v(referral, side, rating, comment)
JOIN referral r ON r.id = v.referral::uuid;

-- ============================================================ NOTIFICATIONS
-- The dispatcher logs to this table (SMS goes to a real aggregator in
-- production). A few recent messages so the pilot has a visible trail.
INSERT INTO notification (channel, recipient, template, body, referral_id, status, sent_at)
SELECT v.channel, v.recipient, v.template, v.body, v.referral::uuid, 'sent', now() - v.ago
FROM (VALUES
 ('sms','+251911000019','new_referral',        '[EMERGENCY] New referral ERL-SUBM-207 from Ambo Health Centre. Dx: Obstructed labour. Respond within 5 min.','66666666-0000-0000-0000-000000000002', INTERVAL '3 minutes'),
 ('sms','+251911000019','sla_escalation',      'SLA breached for ERL-ESCL-773 — escalated at Ambo General Hospital.','66666666-0000-0000-0000-000000000003', INTERVAL '30 minutes'),
 ('in_app','+251911000008','referral_assigned','[EMERGENCY] Referral ERL-TRAN-561 from Awaro Health Post has been assigned to you by Sr Hanna Girma.','66666666-0000-0000-0000-00000000000a', INTERVAL '25 minutes'),
 ('sms','+251912000018','referral_accepted',   'Your referral ERL-ACPT-318 is ACCEPTED at Ambo General Hospital. Show this code on arrival.','66666666-0000-0000-0000-000000000006', INTERVAL '45 minutes'),
 ('sms','+251911000015','emergency_declined',  'URGENT: referral ERL-DECL-702 DECLINED by Ambo General Hospital (no_specialist). Reroute immediately.','66666666-0000-0000-0000-00000000001c', INTERVAL '4 days'),
 ('in_app','22222222-0000-0000-0000-000000000008','patient_arrived','Patient for referral ERL-ARRV-193 has ARRIVED at Ambo General Hospital.','66666666-0000-0000-0000-00000000000b', INTERVAL '4 hours'),
 ('sms','+251911000001','not_arrived',         'Referral ERL-NOAR-737 has NOT ARRIVED at Ginchi Primary Hospital. Please trace the patient.','66666666-0000-0000-0000-00000000000c', INTERVAL '1 day'),
 ('in_app','22222222-0000-0000-0000-000000000004','outcome_returned','Outcome returned for ERL-OUTC-275. Please acknowledge to close the loop.','66666666-0000-0000-0000-00000000000e', INTERVAL '1 day')
) AS v(channel, recipient, template, body, referral, ago);

-- ==================================================================== CONFIG
INSERT INTO config (key, value, scope) VALUES
 ('sla_minutes', '{"emergency":5,"urgent":30,"routine":240}', 'global'),
 ('arrival_grace_hours', '{"emergency":6,"urgent":24,"routine":48}', 'global'),
 ('bed_reservation_hours', '{"emergency":6,"urgent":12,"routine":24}', 'global'),
 ('routing_weights', '{"distance":0.35,"acceptance":0.25,"beds":0.25,"queue":0.15}', 'global'),
 ('capability_stale_days', '30', 'global'),
 ('capacity_stale_hours', '8', 'global'),
 ('lost_to_followup_days', '30', 'global'),
 ('outcome_due_hours', '72', 'global');

COMMIT;
