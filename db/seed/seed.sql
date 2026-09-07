-- Ethio Referral Linkage — pilot seed data
-- Synthetic pilot zone. Facility names/coordinates are illustrative, NOT real MFR data.

BEGIN;

-- ============================================================ ADMIN UNITS
INSERT INTO admin_unit (id, parent_id, level, name_lat, name_am, code) VALUES
 ('11111111-0000-0000-0000-000000000001', NULL, 'region', 'Oromia', 'ኦሮሚያ', 'ET-OR'),
 ('11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'zone',   'West Shewa',   'ምዕራብ ሸዋ', 'ET-OR-WS'),
 ('11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'woreda', 'Ambo Town',    'አምቦ ከተማ', 'ET-OR-WS-AM'),
 ('11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'woreda', 'Toke Kutaye',  'ቶኬ ኩታዬ', 'ET-OR-WS-TK'),
 ('11111111-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'woreda', 'Dendi',        'ደንዲ', 'ET-OR-WS-DN'),
 ('11111111-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'kebele', 'Ambo 01',      'አምቦ 01', 'ET-OR-WS-AM-01'),
 ('11111111-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000004', 'kebele', 'Guder 02',     'ጉደር 02', 'ET-OR-WS-TK-02');

-- ============================================================ CAPABILITIES (Appendix A)
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

-- ============================================================ REASON CODES
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
 ('back_referral_followup','Back-referral for follow-up care','ለክትትል ወደ ታች ሪፈራል','followup','routine',2,
   ARRAY[]::text[],
   ARRAY['Discharge summary attached','Follow-up plan explained to patient']);

-- ============================================================ FACILITIES
-- Tier 5: specialised (referral apex, outside zone)
INSERT INTO facility (id, mfr_id, name_lat, name_am, facility_type, tier, ownership,
  region_id, zone_id, woreda_id, latitude, longitude, phone, is_24h, has_ambulance) VALUES
 ('22222222-0000-0000-0000-000000000001','MFR-ET-000101','Black Lion Specialised Hospital','ጥቁር አንበሳ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  9.011000,38.755000,'+251111234567',TRUE,TRUE),

 ('22222222-0000-0000-0000-000000000002','MFR-ET-000201','Ambo General Hospital','አምቦ ጠቅላላ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  8.987000,37.855000,'+251112345678',TRUE,TRUE),

 ('22222222-0000-0000-0000-000000000003','MFR-ET-000202','Guder Primary Hospital','ጉደር የመጀመሪያ ደረጃ ሆስፒታል','primary_hospital',3,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',
  8.965000,37.770000,'+251113456789',TRUE,TRUE),

 ('22222222-0000-0000-0000-000000000004','MFR-ET-000203','Ginchi Primary Hospital','ግንጪ የመጀመሪያ ደረጃ ሆስፒታል','primary_hospital',3,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005',
  9.028000,38.150000,'+251114567890',TRUE,FALSE),

 ('22222222-0000-0000-0000-000000000005','MFR-ET-000301','Ambo Health Centre','አምቦ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  8.980000,37.860000,'+251115678901',TRUE,FALSE),

 ('22222222-0000-0000-0000-000000000006','MFR-ET-000302','Guder Health Centre','ጉደር ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',
  8.960000,37.775000,'+251116789012',TRUE,FALSE),

 ('22222222-0000-0000-0000-000000000007','MFR-ET-000303','Tulu Bolo Health Centre','ቱሉ ቦሎ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005',
  8.665000,38.215000,'+251117890123',FALSE,FALSE),

 ('22222222-0000-0000-0000-000000000008','MFR-ET-000401','Awaro Health Post','አዋሮ ጤና ኬላ','health_post',1,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003',
  8.995000,37.880000,NULL,FALSE,FALSE),

 ('22222222-0000-0000-0000-000000000009','MFR-ET-000402','Gosu Kora Health Post','ጎሱ ኮራ ጤና ኬላ','health_post',1,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',
  8.940000,37.740000,NULL,FALSE,FALSE),

 ('22222222-0000-0000-0000-00000000000a','MFR-ET-000403','Dano Health Post','ዳኖ ጤና ኬላ','health_post',1,'public',
  '11111111-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000005',
  8.700000,38.190000,NULL,FALSE,FALSE);

UPDATE facility SET parent_phcu_id='22222222-0000-0000-0000-000000000005' WHERE id='22222222-0000-0000-0000-000000000008';
UPDATE facility SET parent_phcu_id='22222222-0000-0000-0000-000000000006' WHERE id='22222222-0000-0000-0000-000000000009';
UPDATE facility SET parent_phcu_id='22222222-0000-0000-0000-000000000007' WHERE id='22222222-0000-0000-0000-00000000000a';

-- ============================================================ CAPABILITY MATRIX
-- Specialised hospital: everything
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000001', code, 'available', now() - INTERVAL '3 days' FROM capability;

-- Ambo General (tier 4): most things, NO oncology/dialysis/mri/neurosurgery/histopathology
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000002', code, 'available', now() - INTERVAL '2 days'
FROM capability WHERE code NOT IN ('oncology','dialysis','mri','neurosurgery','histopathology','ventilator');

-- Guder Primary (tier 3): surgical + obstetric, but ANAESTHETIST ON LEAVE (the demo moment)
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at) VALUES
 ('22222222-0000-0000-0000-000000000003','emergency_24h','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','resuscitation','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','oxygen_supply','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','ambulance_available','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','bemonc','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','cemonc','degraded', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','caesarean_section','unavailable', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','anaesthesia_general','unavailable', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','anaesthesia_spinal','unavailable', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','blood_transfusion','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','magnesium_sulphate','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','general_surgery','degraded', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','basic_lab','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','haematology','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','blood_bank','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','ultrasound','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','xray','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','paediatrics','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','obgyn','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','internal_medicine','available', now() - INTERVAL '1 day'),
 ('22222222-0000-0000-0000-000000000003','neonatal_icu','unavailable', now() - INTERVAL '1 day');

UPDATE facility_capability
   SET blocking_note = 'No anaesthetist on site since Tuesday - locum expected in 6 days'
 WHERE facility_id='22222222-0000-0000-0000-000000000003'
   AND capability_code IN ('anaesthesia_general','anaesthesia_spinal','caesarean_section');

-- Ginchi Primary (tier 3): full surgical/obstetric, further away
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at) VALUES
 ('22222222-0000-0000-0000-000000000004','emergency_24h','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','resuscitation','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','oxygen_supply','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','bemonc','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','cemonc','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','caesarean_section','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','anaesthesia_general','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','anaesthesia_spinal','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','blood_transfusion','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','magnesium_sulphate','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','general_surgery','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','basic_lab','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','blood_bank','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','ultrasound','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','xray','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','obgyn','available', now() - INTERVAL '5 days'),
 ('22222222-0000-0000-0000-000000000004','paediatrics','available', now() - INTERVAL '5 days');

-- Health centres (tier 2): basic package
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT f.id, c.code, 'available', now() - INTERVAL '4 days'
FROM facility f CROSS JOIN capability c
WHERE f.tier = 2
  AND c.code IN ('bemonc','magnesium_sulphate','basic_lab','ultrasound','oxygen_supply',
                 'art_clinic','tb_treatment','tb_genexpert','malnutrition_otp','malnutrition_sc',
                 'gbv_care','emergency_24h');

-- Health posts (tier 1): community package
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT f.id, c.code, 'available', now() - INTERVAL '7 days'
FROM facility f CROSS JOIN capability c
WHERE f.tier = 1 AND c.code IN ('malnutrition_otp');

-- ============================================================ CAPACITY
INSERT INTO facility_capacity (facility_id, ward_type, beds_total, beds_free, reported_at) VALUES
 ('22222222-0000-0000-0000-000000000001','maternity',60,4,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000001','general',300,22,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000001','icu',20,1,        now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000002','maternity',40,9,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000002','general',150,31,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000002','paediatric',30,7, now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000003','maternity',15,6,  now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000003','general',50,12,   now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000004','maternity',12,3,  now() - INTERVAL '30 hours'),
 ('22222222-0000-0000-0000-000000000004','general',40,8,    now() - INTERVAL '30 hours');

-- ============================================================ USERS
-- All passwords are: Password123!
-- bcrypt hash generated with cost 10
INSERT INTO app_user (id, username, password_hash, full_name, role, facility_id, phone) VALUES
 ('33333333-0000-0000-0000-000000000001','hew.awaro',   '$2b$10$PLACEHOLDER','Almaz Bekele',      'hew',            '22222222-0000-0000-0000-000000000008','+251911000001'),
 ('33333333-0000-0000-0000-000000000002','hew.gosu',    '$2b$10$PLACEHOLDER','Tigist Haile',      'hew',            '22222222-0000-0000-0000-000000000009','+251911000002'),
 ('33333333-0000-0000-0000-000000000003','clin.ambohc', '$2b$10$PLACEHOLDER','Dr Kebede Tesfaye', 'clinician',      '22222222-0000-0000-0000-000000000005','+251911000003'),
 ('33333333-0000-0000-0000-000000000004','clin.guderhc','$2b$10$PLACEHOLDER','Sr Meseret Alemu',  'clinician',      '22222222-0000-0000-0000-000000000006','+251911000004'),
 ('33333333-0000-0000-0000-000000000005','liaison.ambo','$2b$10$PLACEHOLDER','Sr Hanna Girma',    'liaison',        '22222222-0000-0000-0000-000000000002','+251911000005'),
 ('33333333-0000-0000-0000-000000000006','liaison.guder','$2b$10$PLACEHOLDER','Sr Bethlehem Tadesse','liaison',     '22222222-0000-0000-0000-000000000003','+251911000006'),
 ('33333333-0000-0000-0000-000000000007','liaison.ginchi','$2b$10$PLACEHOLDER','Sr Rahel Worku',  'liaison',        '22222222-0000-0000-0000-000000000004','+251911000007'),
 ('33333333-0000-0000-0000-000000000008','triage.ambo', '$2b$10$PLACEHOLDER','Nurse Dawit Mekonnen','triage',       '22222222-0000-0000-0000-000000000002','+251911000008'),
 ('33333333-0000-0000-0000-000000000009','admin.ambo',  '$2b$10$PLACEHOLDER','Ato Girma Wolde',   'facility_admin', '22222222-0000-0000-0000-000000000002','+251911000009'),
 ('33333333-0000-0000-0000-00000000000a','woreda.ws',   '$2b$10$PLACEHOLDER','W/ro Sara Negash',  'woreda',         '22222222-0000-0000-0000-000000000002','+251911000010'),
 ('33333333-0000-0000-0000-00000000000b','cbhi.ws',     '$2b$10$PLACEHOLDER','Ato Yonas Assefa',  'cbhi',           '22222222-0000-0000-0000-000000000002','+251911000011'),
 ('33333333-0000-0000-0000-00000000000c','sysadmin',    '$2b$10$PLACEHOLDER','System Administrator','sysadmin',     '22222222-0000-0000-0000-000000000002','+251911000012');

-- ============================================================ CONFIG (BR-20, BR-12 weights)
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
