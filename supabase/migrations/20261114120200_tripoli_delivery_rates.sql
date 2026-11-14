-- Move the existing areas by slug so their IDs and past orders stay linked.
insert into public.delivery_zones as z (branch_id, name, fee_cents)
select b.id, data.name, data.fee_cents
from public.branches b
cross join (values
  ('Zone A', 100),
  ('Zone B', 150),
  ('Zone C', 200),
  ('Zone D', 250),
  ('Zone E', 300),
  ('Zone F', 350),
  ('Zone G', 400),
  ('Zone H', 450)
) as data (name, fee_cents)
where b.slug = 'tripoli'
on conflict (branch_id, lower(name)) do update set
  name = excluded.name, fee_cents = excluded.fee_cents
where (z.name, z.fee_cents) is distinct from (excluded.name, excluded.fee_cents);

insert into public.delivery_areas as a (branch_id, zone_id, slug, name_en, name_ar)
select b.id, z.id, data.slug, data.name_en, data.name_ar
from public.branches b
cross join (values
  ('Zone A', 'dam-w-farez', 'Dam w Farez', 'الضم والفرز'),
  ('Zone A', 'boulevard', 'Boulevard', 'البوليفار'),
  ('Zone A', 'bahsas', 'Bahsas', 'البحصاص'),
  ('Zone B', 'mharam', 'Mharam', 'المحرّم'),
  ('Zone B', 'beb-ramel', 'Beb Ramel', 'باب الرمل'),
  ('Zone B', 'sehet-lnour', 'Sehet Lnour', 'ساحة النور'),
  ('Zone B', 'douwar-nini', 'Douwar Nini', 'دوّار النيني'),
  ('Zone B', 'maarad', 'Maarad', 'المعرض'),
  ('Zone C', 'naji', 'Naji', 'ناجي'),
  ('Zone C', 'palma', 'Palma', 'بالما'),
  ('Zone C', 'haykaliye', 'Haykaliye', 'الهيكلية'),
  ('Zone C', 'abou-samra', 'Abu Samra', 'أبي سمراء'),
  ('Zone C', 'tal', 'Tal', 'التل'),
  ('Zone C', 'seht-nejme', 'Seht Nejme', 'ساحة النجمة'),
  ('Zone C', 'azmi', 'Azmi', 'شارع عزمي'),
  ('Zone C', '200-street', '200 Street', 'شارع الـ200'),
  ('Zone C', 'jamil-adra', 'Jamil Adra', 'جميل عدرا'),
  ('Zone C', 'nakabet-ateba2', 'Nakabet Ateba2', 'نقابة الأطباء'),
  ('Zone C', 'mina', 'Mina', 'الميناء'),
  ('Zone C', 'tari2-mina', 'Tari2 Mina', 'طريق الميناء'),
  ('Zone D', 'mina-baher', 'Mina (Baher)', 'الميناء (البحر)'),
  ('Zone D', 'mina-groupy', 'Mina (Groupy)', 'الميناء (غروبي)'),
  ('Zone D', 'daher-eiin', 'Daher Eiin', 'ضهر العين'),
  ('Zone D', 'north-marina', 'North Marina', 'نورث مارينا'),
  ('Zone D', 'kanaes-street', 'Kanaes Street', 'شارع الكنائس'),
  ('Zone D', 'zehriye', 'Zehriye', 'الزاهرية'),
  ('Zone D', 'ponto-alto', 'Ponto Alto', 'بونتو ألتو'),
  ('Zone E', 'abu-samra-shalfe', 'Abu Samra (Shalfe)', 'أبي سمراء (الشلفة)'),
  ('Zone E', 'abu-samra-seke-bayda', 'Abu Samra (Seke Bayda)', 'أبي سمراء (السكة البيضا)'),
  ('Zone E', 'abu-samra-wadihab', 'Abu Samra (Wadihab)', 'أبي سمراء (وادي هاب)'),
  ('Zone E', 'abu-samra-islah', 'Abu Samra (Islah)', 'أبي سمراء (الإصلاح)'),
  ('Zone E', 'abu-samra-safa', 'Abu Samra (Safa)', 'أبي سمراء (الصفا)'),
  ('Zone E', 'abu-samra-jinan', 'Abu Samra (Jinan)', 'أبي سمراء (الجنان)'),
  ('Zone E', 'tebeneh', 'Tebeneh', 'التبانة'),
  ('Zone E', 'duwar-abu-ali', 'Duwar Abu Ali', 'دوّار أبو علي'),
  ('Zone E', 'ras-maska', 'Ras Maska', 'رأس مسقا'),
  ('Zone E', 'hara-beraeshiye', 'Hara Beraeshiye', 'حارة البراشية'),
  ('Zone F', 'kalamoun', 'Kalamoun', 'القلمون'),
  ('Zone F', 'ebbe', 'Ebbe', 'القبة'),
  ('Zone F', 'daher-eiin-ba3d-sea', 'Daher Eiin Ba3d Sea', 'ضهر العين بعد Sea'),
  ('Zone F', 'barsa', 'Barsa', 'برسا'),
  ('Zone F', 'barad-chami', 'Barad Chami', 'برّاد الشامي'),
  ('Zone F', 'bader-hasun', 'Bader Hasun', 'بدر حسّون'),
  ('Zone G', 'jabal-mehsen', 'Jabal Mehsen', 'جبل محسن'),
  ('Zone G', 'samriye', 'Samriye', 'السمرية'),
  ('Zone H', 'malule', 'Malule', 'الملولة'),
  ('Zone H', 'mankubin', 'Mankubin', 'المنكوبين'),
  ('Zone H', 'bedewi', 'Bedewi', 'البداوي'),
  ('Zone H', 'dedeh', 'Dedeh', 'ددّه'),
  ('Zone H', 'dar-nour', 'Dar Nour', 'دار النور'),
  ('Zone H', 'hara-khasa', 'Hara Khasa', 'حارة خاصة'),
  ('Zone H', 'nakhle', 'Nakhle', 'النخلة'),
  ('Zone H', 'btouratij', 'Btouratij', 'بتوراتيج')
) as data (zone, slug, name_en, name_ar)
join public.delivery_zones z on z.branch_id = b.id and lower(z.name) = lower(data.zone)
where b.slug = 'tripoli'
on conflict (branch_id, slug) do update set
  zone_id = excluded.zone_id, name_en = excluded.name_en, name_ar = excluded.name_ar, is_active = true
where (a.zone_id, a.name_en, a.name_ar, a.is_active)
  is distinct from (excluded.zone_id, excluded.name_en, excluded.name_ar, true);
