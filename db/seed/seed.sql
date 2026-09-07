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

-- ############################################################################
-- Pilot feature build seed — Addis Ababa apex network, professional roles,
-- patient portal accounts, referral history and patient feedback.
-- Facilities are real Ethiopian institutions (addresses/phones best-effort
-- public data — verify before pilot). All people and clinical data synthetic.
-- ############################################################################
BEGIN;

-- ============================================================ ADMIN UNITS (Addis)
INSERT INTO admin_unit (id, parent_id, level, name_lat, name_am, code) VALUES
 ('11111111-0000-0000-0000-000000000010', NULL, 'region', 'Addis Ababa', 'አዲስ አበባ', 'ET-AA'),
 ('11111111-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000010', 'zone', 'Gulele Sub-city',      'ጉለሌ ክፍለ ከተማ',      'ET-AA-GU'),
 ('11111111-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000010', 'zone', 'Kirkos Sub-city',      'ቂርቆስ ክፍለ ከተማ',      'ET-AA-KK'),
 ('11111111-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000010', 'zone', 'Arada Sub-city',       'አራዳ ክፍለ ከተማ',       'ET-AA-AR'),
 ('11111111-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000010', 'zone', 'Addis Ketema Sub-city','አዲስ ከተማ ክፍለ ከተማ','ET-AA-AK'),
 ('11111111-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000010', 'zone', 'Lideta Sub-city',      'ልደታ ክፍለ ከተማ',      'ET-AA-LD');

-- ============================================================ FACILITY ADDRESSES (existing)
UPDATE facility SET address_line = 'Zambia Street, Lideta',                      po_box = 'P.O. Box 5657',
  region_id='11111111-0000-0000-0000-000000000010', zone_id='11111111-0000-0000-0000-000000000015', woreda_id=NULL
  WHERE id = '22222222-0000-0000-0000-000000000001';  -- Black Lion is in Addis, fix its geography
UPDATE facility SET address_line = 'Ambo Town, off the Addis Ababa–Nekemte road', po_box = 'P.O. Box 06'
  WHERE id = '22222222-0000-0000-0000-000000000002';
UPDATE facility SET address_line = 'Guder town centre'      WHERE id = '22222222-0000-0000-0000-000000000003';
UPDATE facility SET address_line = 'Ginchi town, Addis Ababa–Ambo road' WHERE id = '22222222-0000-0000-0000-000000000004';
UPDATE facility SET address_line = 'Kebele 01, Ambo'        WHERE id = '22222222-0000-0000-0000-000000000005';
UPDATE facility SET address_line = 'Guder 02 kebele'        WHERE id = '22222222-0000-0000-0000-000000000006';
UPDATE facility SET address_line = 'Tulu Bolo town'         WHERE id = '22222222-0000-0000-0000-000000000007';
UPDATE facility SET address_line = 'Awaro kebele'           WHERE id = '22222222-0000-0000-0000-000000000008';
UPDATE facility SET address_line = 'Gosu Kora kebele'       WHERE id = '22222222-0000-0000-0000-000000000009';
UPDATE facility SET address_line = 'Dano kebele'            WHERE id = '22222222-0000-0000-0000-00000000000a';

-- ============================================================ ADDIS FACILITIES
INSERT INTO facility (id, mfr_id, name_lat, name_am, facility_type, tier, ownership,
  region_id, zone_id, latitude, longitude, phone, is_24h, has_ambulance, address_line, po_box) VALUES
 ('22222222-0000-0000-0000-000000000011','MFR-ET-000102','St. Paul''s Hospital Millennium Medical College','ቅዱስ ጳውሎስ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000011',9.052600,38.726300,'+251112753454',TRUE,TRUE,
  'Swaziland Street, Gulele','P.O. Box 1271'),
 ('22222222-0000-0000-0000-000000000012','MFR-ET-000210','Zewditu Memorial Hospital','ዘውዲቱ መታሰቢያ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000012',9.014600,38.755000,'+251115518085',TRUE,TRUE,
  'Off Kazanchis, Kirkos','P.O. Box 316'),
 ('22222222-0000-0000-0000-000000000013','MFR-ET-000211','Yekatit 12 Hospital Medical College','የካቲት 12 ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000013',9.045000,38.761400,'+251111553065',TRUE,TRUE,
  'Sidist Kilo, Arada','P.O. Box 257'),
 ('22222222-0000-0000-0000-000000000014','MFR-ET-000212','Ghandi Memorial Hospital','ጋንዲ መታሰቢያ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000012',9.011000,38.762000,'+251115518065',TRUE,TRUE,
  'Near Addis Ababa Stadium, Kirkos','P.O. Box 3164'),
 ('22222222-0000-0000-0000-000000000015','MFR-ET-000213','Menelik II Comprehensive Specialised Hospital','ዳግማዊ ምኒልክ ሆስፒታል','general_hospital',4,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000013',9.039700,38.769000,'+251111552447',TRUE,FALSE,
  'Near Ministry of Foreign Affairs, Arada','P.O. Box 5556'),
 ('22222222-0000-0000-0000-000000000016','MFR-ET-000103','St. Peter''s Specialised Hospital','ቅዱስ ጴጥሮስ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000011',9.066600,38.739800,'+251111112691',TRUE,FALSE,
  'Entoto Road, Gulele','P.O. Box 21534'),
 ('22222222-0000-0000-0000-000000000017','MFR-ET-000104','Amanuel Mental Specialised Hospital','አማኑኤል የአእምሮ ሆስፒታል','specialised_hospital',5,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000014',9.033000,38.732600,'+251112757744',TRUE,FALSE,
  'Off Merkato, Addis Ketema','P.O. Box 1971'),
 ('22222222-0000-0000-0000-000000000018','MFR-ET-000310','Addis Ketema Health Centre','አዲስ ከተማ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000014',9.035500,38.722300,'+251112134455',FALSE,FALSE,
  'Near Merkato, Addis Ketema',NULL),
 ('22222222-0000-0000-0000-000000000019','MFR-ET-000311','Kazanchis Health Centre','ካዛንቺስ ጤና ጣቢያ','health_centre',2,'public',
  '11111111-0000-0000-0000-000000000010','11111111-0000-0000-0000-000000000012',9.017000,38.766000,'+251115156677',FALSE,FALSE,
  'Kazanchis, Kirkos',NULL);

-- ============================================================ CAPABILITIES (Addis)
-- St. Paul's: full apex except burns (Yekatit 12 is the burns centre)
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000011', code, 'available', now() - INTERVAL '2 days'
FROM capability WHERE code <> 'burns_care';

-- Zewditu: strong tier-4 general + ART; CT down for maintenance (visible exclusion)
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000012', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN
 ('emergency_24h','resuscitation','oxygen_supply','icu_bed','general_surgery','caesarean_section',
  'anaesthesia_general','anaesthesia_spinal','bemonc','cemonc','blood_transfusion','magnesium_sulphate',
  'xray','ultrasound','ecg','basic_lab','haematology','biochemistry','blood_bank',
  'internal_medicine','paediatrics','obgyn','art_clinic','tb_treatment','gbv_care');
INSERT INTO facility_capability (facility_id, capability_code, status, blocking_note, verified_at) VALUES
 ('22222222-0000-0000-0000-000000000012','ct_scan','unavailable',
  'CT scanner under maintenance — engineer scheduled this week', now() - INTERVAL '1 day');

-- Yekatit 12: tier-4 + burns + NICU + CT
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000013', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN
 ('emergency_24h','resuscitation','oxygen_supply','icu_bed','ventilator','general_surgery',
  'caesarean_section','anaesthesia_general','anaesthesia_spinal','burns_care','bemonc','cemonc',
  'neonatal_icu','blood_transfusion','magnesium_sulphate','xray','ultrasound','ct_scan','ecg',
  'basic_lab','haematology','biochemistry','blood_bank','internal_medicine','paediatrics','obgyn');

-- Ghandi: maternity apex
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000014', code, 'available', now() - INTERVAL '1 day'
FROM capability WHERE code IN
 ('emergency_24h','resuscitation','oxygen_supply','bemonc','cemonc','caesarean_section',
  'anaesthesia_general','anaesthesia_spinal','neonatal_icu','blood_transfusion','magnesium_sulphate',
  'obgyn','ultrasound','basic_lab','blood_bank');

-- Menelik II: ophthalmology + general surgical
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000015', code, 'available', now() - INTERVAL '5 days'
FROM capability WHERE code IN
 ('emergency_24h','resuscitation','oxygen_supply','general_surgery','anaesthesia_general',
  'anaesthesia_spinal','ophthalmology','xray','ct_scan','basic_lab','haematology','internal_medicine');

-- St. Peter's: TB/chest referral centre
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000016', code, 'available', now() - INTERVAL '3 days'
FROM capability WHERE code IN
 ('emergency_24h','resuscitation','oxygen_supply','icu_bed','xray','ecg','basic_lab','haematology',
  'biochemistry','tb_genexpert','tb_treatment','internal_medicine');

-- Amanuel: national psychiatry
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT '22222222-0000-0000-0000-000000000017', code, 'available', now() - INTERVAL '4 days'
FROM capability WHERE code IN
 ('psychiatry','emergency_24h','oxygen_supply','basic_lab','internal_medicine');

-- Addis health centres: standard HC package
INSERT INTO facility_capability (facility_id, capability_code, status, verified_at)
SELECT f.id, c.code, 'available', now() - INTERVAL '3 days'
FROM facility f CROSS JOIN capability c
WHERE f.id IN ('22222222-0000-0000-0000-000000000018','22222222-0000-0000-0000-000000000019')
  AND c.code IN ('bemonc','magnesium_sulphate','basic_lab','ultrasound','oxygen_supply',
                 'art_clinic','tb_treatment','tb_genexpert','malnutrition_otp','malnutrition_sc',
                 'gbv_care','emergency_24h');

-- ============================================================ CAPACITY (Addis)
INSERT INTO facility_capacity (facility_id, ward_type, beds_total, beds_free, reported_at) VALUES
 ('22222222-0000-0000-0000-000000000011','general',400,26,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000011','maternity',70,9,  now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000011','icu',20,2,        now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000012','general',200,14,  now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000012','maternity',40,6,  now() - INTERVAL '3 hours'),
 ('22222222-0000-0000-0000-000000000013','general',220,11,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000013','maternity',45,4,  now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000013','paediatric',60,9, now() - INTERVAL '2 hours'),
 ('22222222-0000-0000-0000-000000000014','maternity',120,15,now() - INTERVAL '1 hour'),
 ('22222222-0000-0000-0000-000000000015','general',150,20,  now() - INTERVAL '6 hours'),
 ('22222222-0000-0000-0000-000000000016','general',110,13,  now() - INTERVAL '8 hours'),
 ('22222222-0000-0000-0000-000000000017','general',300,35,  now() - INTERVAL '12 hours');

-- ============================================================ REASON CODES (new)
INSERT INTO reason_code (code, name_lat, name_am, category, default_urgency, min_target_tier, required_capabilities, stabilisation_items) VALUES
 ('burns_severe','Severe burns (>15% TBSA or airway)','ከባድ ቃጠሎ','surgical','emergency',4,
   ARRAY['burns_care','resuscitation','oxygen_supply'],
   ARRAY['Airway assessed','IV fluids per Parkland started','Burns cooled and covered','Analgesia given','TBSA estimated']),
 ('eye_emergency','Eye injury / sudden vision loss','የዓይን አደጋ','specialist','urgent',4,
   ARRAY['ophthalmology'],
   ARRAY['Eye shielded (no pressure)','Nil by mouth if surgical','Visual acuity documented']);

-- ============================================================ PATIENTS (portal-linked)
INSERT INTO patient (id, given_name_lat, given_name_am, fathers_name_lat, name_search, sex,
  age_value, age_unit, phone_primary_enc, phone_primary_hash, cbhi_member, is_pregnant, region_id) VALUES
 ('55555555-0000-0000-0000-000000000001','Abeba','አበባ','Kassahun','Abeba Kassahun','female',27,'years',
  convert_to('+251912000001','UTF8'), encode(digest('dev-pepper' || '+251912000001','sha256'),'hex'), TRUE, TRUE,
  '11111111-0000-0000-0000-000000000001'),
 ('55555555-0000-0000-0000-000000000002','Roba','ሮባ','Dinsa','Roba Dinsa','male',41,'years',
  convert_to('+251912000002','UTF8'), encode(digest('dev-pepper' || '+251912000002','sha256'),'hex'), TRUE, FALSE,
  '11111111-0000-0000-0000-000000000001'),
 ('55555555-0000-0000-0000-000000000003','Hanna','ሃና','Tulu','Hanna Tulu','female',34,'years',
  convert_to('+251912000003','UTF8'), encode(digest('dev-pepper' || '+251912000003','sha256'),'hex'), FALSE, FALSE,
  '11111111-0000-0000-0000-000000000010'),
 ('55555555-0000-0000-0000-000000000004','Getahun','ጌታሁን','Merga','Getahun Merga','male',63,'years',
  convert_to('+251912000004','UTF8'), encode(digest('dev-pepper' || '+251912000004','sha256'),'hex'), TRUE, FALSE,
  '11111111-0000-0000-0000-000000000001');

-- ============================================================ USERS (new roles)
-- Password hashes are set by scripts/seed.js after this file loads.
INSERT INTO app_user (id, username, password_hash, full_name, role, facility_id, phone,
  title, department, license_number, status, verified_at, verified_by) VALUES
 -- Black Lion
 ('33333333-0000-0000-0000-000000000010','dr.tigist','$2b$10$PLACEHOLDER','Dr Tigist Alemu','doctor',
  '22222222-0000-0000-0000-000000000001','+251911000101','Consultant Obstetrician-Gynaecologist','Obstetrics & Gynaecology','MOH-MD-10432','active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000011','it.blacklion','$2b$10$PLACEHOLDER','Natnael Tesfaye','it_admin',
  '22222222-0000-0000-0000-000000000001','+251911000104','Hospital IT Administrator','ICT',NULL,'active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000012','liaison.blacklion','$2b$10$PLACEHOLDER','Sr Selamawit Bekele','liaison',
  '22222222-0000-0000-0000-000000000001','+251911000103','Referral Liaison Officer','Referral Office',NULL,'active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000013','dr.yonas','$2b$10$PLACEHOLDER','Dr Yonas Getachew','doctor',
  '22222222-0000-0000-0000-000000000001','+251911000105','Emergency Physician','Emergency Medicine','MOH-MD-13990','pending',NULL,NULL),
 -- St. Paul's
 ('33333333-0000-0000-0000-000000000014','dr.mulu','$2b$10$PLACEHOLDER','Dr Mulu Habte','doctor',
  '22222222-0000-0000-0000-000000000011','+251911000201','Trauma Surgeon','Surgery','MOH-MD-09811','active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000015','liaison.stpauls','$2b$10$PLACEHOLDER','Sr Meron Tulu','liaison',
  '22222222-0000-0000-0000-000000000011','+251911000202','Referral Liaison Officer','Referral Office',NULL,'active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000016','it.stpauls','$2b$10$PLACEHOLDER','Eyob Alemayehu','it_admin',
  '22222222-0000-0000-0000-000000000011','+251911000203','Hospital IT Administrator','ICT',NULL,'active',now() - INTERVAL '119 days',NULL),
 -- Addis city hospitals
 ('33333333-0000-0000-0000-000000000017','dr.samuel','$2b$10$PLACEHOLDER','Dr Samuel Worku','doctor',
  '22222222-0000-0000-0000-000000000012','+251911000301','Internist','Internal Medicine','MOH-MD-12055','active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000018','liaison.zewditu','$2b$10$PLACEHOLDER','Sr Hiwot Kassa','liaison',
  '22222222-0000-0000-0000-000000000012','+251911000302','Referral Liaison Officer','Referral Office',NULL,'active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-000000000019','liaison.y12','$2b$10$PLACEHOLDER','Sr Marta Gebre','liaison',
  '22222222-0000-0000-0000-000000000013','+251911000401','Referral Liaison Officer','Referral Office',NULL,'active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-00000000001a','dr.selam','$2b$10$PLACEHOLDER','Dr Selam Fikre','doctor',
  '22222222-0000-0000-0000-000000000018','+251911000903','General Practitioner','OPD','MOH-MD-15320','active',now() - INTERVAL '119 days',NULL),
 -- West Shewa additions
 ('33333333-0000-0000-0000-00000000001b','dr.abdi','$2b$10$PLACEHOLDER','Dr Abdi Gemechu','doctor',
  '22222222-0000-0000-0000-000000000002','+251911000601','Medical Director, General Practitioner','Medical Directorate','MOH-MD-08122','active',now() - INTERVAL '119 days',NULL),
 ('33333333-0000-0000-0000-00000000001c','it.ambo','$2b$10$PLACEHOLDER','Kalkidan Mengistu','it_admin',
  '22222222-0000-0000-0000-000000000002','+251911000605','Hospital IT Administrator','ICT',NULL,'active',now() - INTERVAL '119 days',NULL),
 -- Patient portal accounts (facility_id NULL, linked to patient rows)
 ('33333333-0000-0000-0000-00000000001d','abeba.k','$2b$10$PLACEHOLDER','Abeba Kassahun','patient',
  NULL,'+251912000001',NULL,NULL,NULL,'active',now() - INTERVAL '30 days',NULL),
 ('33333333-0000-0000-0000-00000000001e','roba.d','$2b$10$PLACEHOLDER','Roba Dinsa','patient',
  NULL,'+251912000002',NULL,NULL,NULL,'active',now() - INTERVAL '30 days',NULL);

UPDATE app_user SET patient_id = '55555555-0000-0000-0000-000000000001' WHERE username = 'abeba.k';
UPDATE app_user SET patient_id = '55555555-0000-0000-0000-000000000002' WHERE username = 'roba.d';
-- Existing staff get professional metadata + verification stamps
UPDATE app_user SET verified_at = now() - INTERVAL '120 days' WHERE verified_at IS NULL AND status = 'active';
UPDATE app_user SET title = 'General Practitioner', license_number = 'MOH-MD-14501' WHERE username = 'clin.ambohc';
UPDATE app_user SET title = 'Health Officer',       license_number = 'MOH-HO-22140' WHERE username = 'clin.guderhc';

-- ============================================================ REFERRAL HISTORY
-- Closed loops + a decline so dashboards and the IT feedback view have real rows.
INSERT INTO referral (id, referral_code, chain_root_id, patient_id, status, urgency, referral_type,
  origin_facility_id, origin_facility_tier, origin_facility_name,
  referring_user_id, referring_user_name, referring_user_phone,
  target_facility_id, target_facility_tier, target_facility_name,
  suggestion_rank_of_chosen, override_reason, reason_code, provisional_diagnosis,
  clinical, pre_referral, decision, decision_at, acknowledged_at,
  receiving_clinician_name, departed_at, arrived_at, transit_minutes,
  outcome, outcome_submitted_at, outcome_acknowledged_at,
  lawful_basis, synced_at, created_at, updated_at)
VALUES
 -- 1. Awaro HP -> Ambo General, severe pre-eclampsia, closed loop (Abeba)
 ('66666666-0000-0000-0000-000000000001','ERL-K7PM-42','66666666-0000-0000-0000-000000000001',
  '55555555-0000-0000-0000-000000000001','CLOSED_COMPLETED','emergency','up',
  '22222222-0000-0000-0000-000000000008',1,'Awaro Health Post',
  '33333333-0000-0000-0000-000000000001','Almaz Bekele','+251911000001',
  '22222222-0000-0000-0000-000000000002',4,'Ambo General Hospital',
  1,NULL,'severe_pre_eclampsia','Severe pre-eclampsia at 34 weeks',
  '{"bpSystolic":160,"bpDiastolic":110,"pulse":98,"respRate":20,"temperatureC":36.8,"gestationalAgeWeeks":34}'::jsonb,
  '{"stabilisationGiven":["MgSO4 loading dose given","IV line established"]}'::jsonb,
  'accepted', now() - INTERVAL '21 days' + INTERVAL '5 minutes', now() - INTERVAL '21 days' + INTERVAL '3 minutes',
  'Dr Abdi Gemechu', now() - INTERVAL '21 days' + INTERVAL '15 minutes',
  now() - INTERVAL '21 days' + INTERVAL '40 minutes', 25,
  '{"finalDiagnosis":"Severe pre-eclampsia — stabilised, delivered at 36w","disposition":"discharged_home","treatmentProvided":"MgSO4 protocol completed; induced at 36 weeks","followUpInstructions":"BP check at Awaro HP weekly for 6 weeks","followUpRequired":true}'::jsonb,
  now() - INTERVAL '19 days', now() - INTERVAL '18 days',
  'vital_interest', now() - INTERVAL '21 days', now() - INTERVAL '21 days', now() - INTERVAL '18 days'),

 -- 2. Guder HC -> Ambo General, trauma, override (transport), closed loop (Roba)
 ('66666666-0000-0000-0000-000000000002','ERL-W3XR-88','66666666-0000-0000-0000-000000000002',
  '55555555-0000-0000-0000-000000000002','CLOSED_COMPLETED','emergency','up',
  '22222222-0000-0000-0000-000000000006',2,'Guder Health Centre',
  '33333333-0000-0000-0000-000000000004','Sr Meseret Alemu','+251911000004',
  '22222222-0000-0000-0000-000000000002',4,'Ambo General Hospital',
  2,'transport_availability','major_trauma','RTA: open tibial fracture, suspected internal bleeding',
  '{"bpSystolic":100,"bpDiastolic":64,"pulse":122,"respRate":24,"temperatureC":36.5}'::jsonb,
  '{"stabilisationGiven":["Bleeding controlled","IV access established","Fracture immobilised"]}'::jsonb,
  'accepted', now() - INTERVAL '15 days' + INTERVAL '7 minutes', now() - INTERVAL '15 days' + INTERVAL '4 minutes',
  'Dr Abdi Gemechu', now() - INTERVAL '15 days' + INTERVAL '20 minutes',
  now() - INTERVAL '15 days' + INTERVAL '51 minutes', 31,
  '{"finalDiagnosis":"Open tibial fracture — ORIF performed","disposition":"admitted","treatmentProvided":"Debridement + external fixation; transfused 2 units","followUpInstructions":"Orthopaedic review in 2 weeks","followUpRequired":true}'::jsonb,
  now() - INTERVAL '12 days', now() - INTERVAL '11 days',
  'vital_interest', now() - INTERVAL '15 days', now() - INTERVAL '15 days', now() - INTERVAL '11 days'),

 -- 3. Addis Ketema HC -> Zewditu, acute abdomen, DECLINED no_bed (Hanna)
 ('66666666-0000-0000-0000-000000000003','ERL-N9QT-15','66666666-0000-0000-0000-000000000003',
  '55555555-0000-0000-0000-000000000003','DECLINED','urgent','up',
  '22222222-0000-0000-0000-000000000018',2,'Addis Ketema Health Centre',
  '33333333-0000-0000-0000-00000000001a','Dr Selam Fikre','+251911000903',
  '22222222-0000-0000-0000-000000000012',4,'Zewditu Memorial Hospital',
  1,NULL,'acute_abdomen','Acute appendicitis, guarding RIF',
  '{"bpSystolic":118,"bpDiastolic":76,"pulse":96,"respRate":18,"temperatureC":38.2}'::jsonb,
  '{"stabilisationGiven":["Nil by mouth","IV fluids started"]}'::jsonb,
  'declined', now() - INTERVAL '8 days' + INTERVAL '26 minutes', now() - INTERVAL '8 days' + INTERVAL '9 minutes',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  'consent', now() - INTERVAL '8 days', now() - INTERVAL '8 days', now() - INTERVAL '8 days'),

 -- 4. Ambo General -> Black Lion, suspected cancer, override (previous care), closed loop (Getahun)
 ('66666666-0000-0000-0000-000000000004','ERL-D4FH-63','66666666-0000-0000-0000-000000000004',
  '55555555-0000-0000-0000-000000000004','CLOSED_COMPLETED','routine','up',
  '22222222-0000-0000-0000-000000000002',4,'Ambo General Hospital',
  '33333333-0000-0000-0000-00000000001b','Dr Abdi Gemechu','+251911000601',
  '22222222-0000-0000-0000-000000000001',5,'Black Lion Specialised Hospital',
  2,'previous_care_there','suspected_cancer','Progressive dysphagia, weight loss — suspected oesophageal malignancy',
  '{"bpSystolic":132,"bpDiastolic":80,"pulse":84,"respRate":18,"temperatureC":36.4}'::jsonb,
  '{"stabilisationGiven":["Previous investigations attached"]}'::jsonb,
  'accepted', now() - INTERVAL '24 days', now() - INTERVAL '25 days' + INTERVAL '3 hours',
  'Oncology clinic — Dr Tewodros M.', now() - INTERVAL '23 days',
  now() - INTERVAL '23 days' + INTERVAL '4 hours', 220,
  '{"finalDiagnosis":"Oesophageal SCC confirmed on endoscopic biopsy","disposition":"admitted","treatmentProvided":"Endoscopy + biopsy; staging CT; MDT reviewed","followUpInstructions":"Oncology follow-up at Black Lion; nutrition support plan shared","followUpRequired":true}'::jsonb,
  now() - INTERVAL '14 days', now() - INTERVAL '13 days',
  'consent', now() - INTERVAL '25 days', now() - INTERVAL '25 days', now() - INTERVAL '13 days');

UPDATE referral SET decline_reason = 'no_bed',
  decline_note = 'Surgical ward full after mass-casualty admission; try Yekatit 12'
 WHERE id = '66666666-0000-0000-0000-000000000003';

-- Minimal transition trails for the seeded referrals
INSERT INTO referral_transition (referral_id, from_status, to_status, event, actor_user_name, occurred_at) VALUES
 ('66666666-0000-0000-0000-000000000001',NULL,'DRAFT','create','Almaz Bekele', now() - INTERVAL '21 days'),
 ('66666666-0000-0000-0000-000000000001','DRAFT','SUBMITTED','submit','Almaz Bekele', now() - INTERVAL '21 days'),
 ('66666666-0000-0000-0000-000000000001','SUBMITTED','ACCEPTED','accept','Sr Hanna Girma', now() - INTERVAL '21 days' + INTERVAL '5 minutes'),
 ('66666666-0000-0000-0000-000000000001','ACCEPTED','IN_TRANSIT','depart','Almaz Bekele', now() - INTERVAL '21 days' + INTERVAL '15 minutes'),
 ('66666666-0000-0000-0000-000000000001','IN_TRANSIT','ARRIVED','arrive','Sr Hanna Girma', now() - INTERVAL '21 days' + INTERVAL '40 minutes'),
 ('66666666-0000-0000-0000-000000000001','ARRIVED','OUTCOME_RETURNED','submit_outcome','Dr Abdi Gemechu', now() - INTERVAL '19 days'),
 ('66666666-0000-0000-0000-000000000001','OUTCOME_RETURNED','CLOSED_COMPLETED','acknowledge_outcome','Almaz Bekele', now() - INTERVAL '18 days'),
 ('66666666-0000-0000-0000-000000000002',NULL,'DRAFT','create','Sr Meseret Alemu', now() - INTERVAL '15 days'),
 ('66666666-0000-0000-0000-000000000002','DRAFT','SUBMITTED','submit','Sr Meseret Alemu', now() - INTERVAL '15 days'),
 ('66666666-0000-0000-0000-000000000002','SUBMITTED','ACCEPTED','accept','Sr Hanna Girma', now() - INTERVAL '15 days' + INTERVAL '7 minutes'),
 ('66666666-0000-0000-0000-000000000002','ACCEPTED','IN_TRANSIT','depart','Sr Meseret Alemu', now() - INTERVAL '15 days' + INTERVAL '20 minutes'),
 ('66666666-0000-0000-0000-000000000002','IN_TRANSIT','ARRIVED','arrive','Nurse Dawit Mekonnen', now() - INTERVAL '15 days' + INTERVAL '51 minutes'),
 ('66666666-0000-0000-0000-000000000002','ARRIVED','OUTCOME_RETURNED','submit_outcome','Dr Abdi Gemechu', now() - INTERVAL '12 days'),
 ('66666666-0000-0000-0000-000000000002','OUTCOME_RETURNED','CLOSED_COMPLETED','acknowledge_outcome','Sr Meseret Alemu', now() - INTERVAL '11 days'),
 ('66666666-0000-0000-0000-000000000003',NULL,'DRAFT','create','Dr Selam Fikre', now() - INTERVAL '8 days'),
 ('66666666-0000-0000-0000-000000000003','DRAFT','SUBMITTED','submit','Dr Selam Fikre', now() - INTERVAL '8 days'),
 ('66666666-0000-0000-0000-000000000003','SUBMITTED','ACKNOWLEDGED','acknowledge','Sr Hiwot Kassa', now() - INTERVAL '8 days' + INTERVAL '9 minutes'),
 ('66666666-0000-0000-0000-000000000003','ACKNOWLEDGED','DECLINED','decline','Sr Hiwot Kassa', now() - INTERVAL '8 days' + INTERVAL '26 minutes'),
 ('66666666-0000-0000-0000-000000000004',NULL,'DRAFT','create','Dr Abdi Gemechu', now() - INTERVAL '25 days'),
 ('66666666-0000-0000-0000-000000000004','DRAFT','SUBMITTED','submit','Dr Abdi Gemechu', now() - INTERVAL '25 days'),
 ('66666666-0000-0000-0000-000000000004','SUBMITTED','ACKNOWLEDGED','acknowledge','Sr Selamawit Bekele', now() - INTERVAL '25 days' + INTERVAL '3 hours'),
 ('66666666-0000-0000-0000-000000000004','ACKNOWLEDGED','ACCEPTED','accept','Sr Selamawit Bekele', now() - INTERVAL '24 days'),
 ('66666666-0000-0000-0000-000000000004','ACCEPTED','IN_TRANSIT','depart','Dr Abdi Gemechu', now() - INTERVAL '23 days'),
 ('66666666-0000-0000-0000-000000000004','IN_TRANSIT','ARRIVED','arrive','Sr Selamawit Bekele', now() - INTERVAL '23 days' + INTERVAL '4 hours'),
 ('66666666-0000-0000-0000-000000000004','ARRIVED','OUTCOME_RETURNED','submit_outcome','Dr Tewodros M.', now() - INTERVAL '14 days'),
 ('66666666-0000-0000-0000-000000000004','OUTCOME_RETURNED','CLOSED_COMPLETED','acknowledge_outcome','Dr Abdi Gemechu', now() - INTERVAL '13 days');

-- ============================================================ FEEDBACK
INSERT INTO referral_feedback (referral_id, patient_id, facility_id, facility_role, rating, comment, created_at) VALUES
 ('66666666-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000008','origin',5,'Almaz explained everything and arranged the transfer quickly.', now() - INTERVAL '17 days'),
 ('66666666-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002','target',4,'Care was very good. Waiting at the maternity ward was long.', now() - INTERVAL '17 days'),
 ('66666666-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000006','origin',4,'They stabilised my leg well before transfer.', now() - INTERVAL '10 days'),
 ('66666666-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000002','target',5,'Surgery went well and the staff followed up every day.', now() - INTERVAL '10 days'),
 ('66666666-0000-0000-0000-000000000004','55555555-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000001','target',3,'Very skilled doctors but the queue at oncology took two days.', now() - INTERVAL '12 days'),
 ('66666666-0000-0000-0000-000000000004','55555555-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000002','origin',4,'Dr Abdi organised everything and the letter had all my results.', now() - INTERVAL '12 days');

COMMIT;
