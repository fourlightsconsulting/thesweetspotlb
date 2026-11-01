-- Seed data for local development and the first deploy.
--
-- The Tripoli menu was imported from the old site's database on 2026-10-06
-- (names tidied, Arabic added). To confirm with the shop before launch:
-- opening hours (the old site says 9 am – 12 am daily; the new site's copy
-- says 12 pm – 12 am / 1 am), delivery areas and fees, prices like $12.22
-- that look converted from lira, and the phone number for order alerts.
-- Photos go in the "menu" storage bucket under the image_path names.

insert into public.branches
  (slug, name_en, name_ar, phone, maps_url, accepts_online_orders,
   last_order_minutes, pickup_eta_min, pickup_eta_max, delivery_eta_min, delivery_eta_max)
values
  ('tripoli', 'Tripoli', 'طرابلس', '+96171819112',
   'https://www.google.com/maps/search/?api=1&query=The+Sweet+Spot+Tripoli+Lebanon', true, 15, 10, 15, 30, 45);

-- Tripoli: every day 12 pm – 12 am.
insert into public.branch_hours (branch_id, weekday, opens_at, closes_at)
select b.id, h.weekday, h.opens_at::time, h.closes_at::time
from public.branches b
join (values
  ('tripoli', 0, '12:00', '00:00'), ('tripoli', 1, '12:00', '00:00'), ('tripoli', 2, '12:00', '00:00'),
  ('tripoli', 3, '12:00', '00:00'), ('tripoli', 4, '12:00', '00:00'), ('tripoli', 5, '12:00', '00:00'),
  ('tripoli', 6, '12:00', '00:00')
) as h (branch, weekday, opens_at, closes_at) on h.branch = b.slug;

insert into public.delivery_zones (branch_id, name, fee_cents)
select id, 'Zone A', 200 from public.branches where slug = 'tripoli';

insert into public.delivery_areas (branch_id, zone_id, slug, name_en, name_ar)
select b.id, z.id, a.slug, a.name_en, a.name_ar
from public.branches b
join public.delivery_zones z on z.branch_id = b.id and z.name = 'Zone A'
cross join (values
  ('mina', 'Mina', 'الميناء'),
  ('tal', 'Tal', 'التل'),
  ('azmi', 'Azmi', 'شارع عزمي'),
  ('dam-w-farez', 'Dam w Farez', 'الضم والفرز'),
  ('abou-samra', 'Abou Samra', 'أبي سمراء'),
  ('bahsas', 'Bahsas', 'البحصاص')
) as a (slug, name_en, name_ar)
where b.slug = 'tripoli';

insert into public.categories (slug, name_en, name_ar, description_en, description_ar, image_path, sort_order)
values
  ('crepes', 'Crêpes', 'كريب', 'Thin crêpes with chocolate, spreads or fruit.', 'كريب رقيق مع شوكولا، لوتس أو فواكه.', 'nutella-crepe.webp', 1),
  ('waffles', 'Waffles', 'وافل', 'Crisp on the outside, soft on the inside.', 'وافل مقرمش من برّا وطري من جوّا.', 'lotus-waffle.webp', 2),
  ('pancakes', 'Pancakes', 'بان كيك', 'Fluffy pancakes filled with chocolate or Lotus spread, with a mix of chocolates on top.', 'بان كيك محشي شوكولا أو كريمة لوتس ومغطّى بميكس من الشوكولا.', 'nutella-pancakes.webp', 3),
  ('profiteroles', 'Profiteroles', 'بروفيترول', 'Pastry puffs filled with cream or ice cream, with your choice of sauce.', 'بروفيترول محشي كريما أو آيس كريم، مع الشوكولا اللي بتختارها.', 'creamy-profiteroles.webp', 4),
  ('rolls', 'Ice cream rolls', 'آيس كريم رولز', 'Freshly prepared ice cream rolls in a variety of flavors.', 'آيس كريم رولز بنكهات مختلفة.', 'pistachio-ice-cream-rolls.webp', 5),
  ('bowls', 'Dessert bowls & cheesecake', 'بولز وتشيز كيك', 'Dessert bowls with a variety of toppings, plus San Sebastián cheesecake.', 'بولز بإضافات مختلفة، وتشيز كيك سان سيباستيان.', 'strawberry-bowl.webp', 6),
  ('boxes', 'Dessert boxes', 'علب الحلو', 'A selection of dessert boxes to share.', 'علب حلو للمشاركة.', 'sweet-spot-box.webp', 7),
  ('drinks', 'Cold drinks', 'مشروبات باردة', 'Milkshakes, smoothies, mixed drinks, fresh juice and water.', 'ميلك شيك، سموذي، ميكسات، عصير طازة ومياه.', 'strawberry-milkshake.webp', 8);

insert into public.categories (parent_id, slug, name_en, name_ar, sort_order)
select c.id, s.slug, s.name_en, s.name_ar, s.sort_order
from public.categories c
join (values
  ('milkshakes', 'Milkshakes', 'ميلك شيك', 1),
  ('smoothies', 'Smoothies', 'سموذي', 2),
  ('mixes', 'Mixed drinks', 'ميكسات', 3),
  ('juice', 'Fresh juice', 'عصير طازة', 4),
  ('water', 'Water', 'مياه', 5)
) as s (slug, name_en, name_ar, sort_order) on c.slug = 'drinks';

insert into public.option_groups (key, name_en, name_ar, min_select, max_select)
values
  ('chocolate', 'Sauce', 'اختيارك من الشوكولا', 1, 1),
  ('stick', 'Coating', 'اختيارك من الشوكولا', 1, 1),
  ('stick-premium', 'Coating', 'اختيارك من الشوكولا', 1, 1),
  ('extra-chocolate', 'Extra sauce', 'شوكولا زيادة', 0, 5),
  ('fruit', 'Fresh fruit', 'فواكه طازة', 0, 5),
  ('toppings', 'Toppings', 'الإضافات', 0, 8),
  ('bars', 'Chocolate, cookies & brownies', 'شوكولا، بسكويت وبراوني', 0, 5),
  ('nuts', 'Nuts', 'مكسرات', 0, 4);

insert into public.options (group_id, key, name_en, name_ar, price_cents, sort_order)
select g.id, o.key, o.name_en, o.name_ar, o.price_cents, o.sort_order
from public.option_groups g
join (values
  ('chocolate', 'belgian', 'Belgian chocolate', 'شوكولا بلجيكية', 0, 1),
  ('chocolate', 'dark', 'Dark chocolate', 'شوكولا داكنة', 0, 2),
  ('chocolate', 'lotus', 'Lotus spread', 'كريمة لوتس', 0, 3),
  ('chocolate', 'nutella', 'Nutella', 'نوتيلا', 0, 4),
  ('chocolate', 'white', 'White chocolate', 'شوكولا بيضا', 0, 5),
  ('stick', 'lotus', 'Lotus spread', 'كريمة لوتس', 0, 1),
  ('stick', 'nutella', 'Nutella', 'نوتيلا', 0, 2),
  ('stick', 'white', 'White chocolate', 'شوكولا بيضا', 0, 3),
  ('stick-premium', 'belgian', 'Belgian milk chocolate', 'شوكولا بلجيكية بالحليب', 0, 1),
  ('stick-premium', 'dark', 'Belgian dark chocolate', 'شوكولا بلجيكية داكنة', 0, 2),
  ('extra-chocolate', 'belgian', 'Belgian chocolate', 'شوكولا بلجيكية', 300, 1),
  ('extra-chocolate', 'dark', 'Dark chocolate', 'شوكولا داكنة', 300, 2),
  ('extra-chocolate', 'lotus', 'Lotus spread', 'كريمة لوتس', 300, 3),
  ('extra-chocolate', 'nutella', 'Nutella', 'نوتيلا', 300, 4),
  ('extra-chocolate', 'white', 'White chocolate', 'شوكولا بيضا', 300, 5),
  ('fruit', 'banana', 'Banana', 'موز', 150, 1),
  ('fruit', 'kiwi', 'Kiwi', 'كيوي', 150, 2),
  ('fruit', 'pineapple', 'Pineapple', 'أناناس', 150, 3),
  ('fruit', 'mixed', 'Mixed fruit', 'فواكه مشكّلة', 200, 4),
  ('fruit', 'strawberry', 'Strawberries', 'فريز', 200, 5),
  ('toppings', 'rice-chocolate', 'Chocolate rice crispies', 'رز مقرمش بالشوكولا', 50, 1),
  ('toppings', 'vermicelli', 'Chocolate vermicelli', 'سبرينكلز شوكولا', 50, 2),
  ('toppings', 'crispy-balls', 'Crispy balls', 'كرات مقرمشة', 50, 3),
  ('toppings', 'crispy-flakes', 'Crispy flakes', 'رقائق مقرمشة', 50, 4),
  ('toppings', 'marshmallow', 'Marshmallows', 'مارشميلو', 50, 5),
  ('toppings', 'smarties', 'Smarties', 'سمارتيز', 50, 6),
  ('toppings', 'sprinkles', 'Sprinkles', 'سبرينكلز', 50, 7),
  ('toppings', 'rice-vanilla', 'Vanilla rice crispies', 'رز مقرمش بالفانيلا', 50, 8),
  ('bars', 'brownie', 'Brownie', 'براوني', 150, 1),
  ('bars', 'kinder', 'Kinder', 'كيندر', 150, 2),
  ('bars', 'kinder-bueno', 'Kinder Bueno', 'كيندر بوينو', 150, 3),
  ('bars', 'kinder-bueno-white', 'Kinder Bueno White', 'كيندر بوينو وايت', 150, 4),
  ('bars', 'oreo', 'Oreo', 'أوريو', 150, 5),
  ('nuts', 'almond', 'Almonds', 'لوز', 100, 1),
  ('nuts', 'hazelnut', 'Hazelnuts', 'بندق', 100, 2),
  ('nuts', 'peanut', 'Peanuts', 'فول سوداني', 100, 3),
  ('nuts', 'pistachio', 'Pistachios', 'فستق حلبي', 100, 4)
) as o (group_key, key, name_en, name_ar, price_cents, sort_order) on o.group_key = g.key;

insert into public.products
  (category_id, slug, name_en, name_ar, description_en, description_ar, price_cents, image_path, sort_order, orderable_online)
select c.id, p.slug, p.name_en, p.name_ar, p.description_en, p.description_ar, p.price_cents, p.image_path, p.sort_order, p.orderable_online
from public.categories c
join (values
  ('crepes', 'lotus-crepe', 'Lotus Crêpe', 'كريب لوتس', 'Crêpe filled with Lotus spread and topped with a mix of chocolate.', 'كريب محشي بكريمة لوتس ومغطّى بميكس من الشوكولا.', 500, 'lotus-crepe.webp', 1, true),
  ('crepes', 'nutella-crepe', 'Nutella Crêpe', 'كريب نوتيلا', 'Crêpe filled with Nutella and topped with a mix of chocolate.', 'كريب محشي نوتيلا ومغطّى بميكس من الشوكولا.', 500, 'nutella-crepe.webp', 2, true),
  ('crepes', 'white-chocolate-crepe', 'White Chocolate Crêpe', 'كريب بالشوكولاتة البيضاء', 'Crêpe filled with white chocolate and topped with a mix of chocolate.', 'كريب محشي شوكولا بيضا ومغطّى بميكس من الشوكولا.', 500, 'white-chocolate-crepe.webp', 3, true),
  ('crepes', 'belgian-chocolate-crepe', 'Belgian Chocolate Crêpe', 'كريب بالشوكولاتة البلجيكية', 'Crêpe filled with Belgian chocolate and topped with Belgian milk, white and dark chocolate.', 'كريب محشي شوكولا بلجيكية ومغطّى بشوكولا بلجيكية بالحليب، بيضا وداكنة.', 750, 'belgian-chocolate-crepe.webp', 4, true),
  ('crepes', 'dark-chocolate-crepe', 'Dark Chocolate Crêpe', 'كريب بالشوكولاتة الداكنة', 'Crêpe filled with dark chocolate and topped with a mix of chocolate.', 'كريب محشي شوكولا داكنة ومغطّى بميكس من الشوكولا.', 750, 'dark-chocolate-crepe.webp', 5, true),
  ('crepes', 'fettuccine-crepe', 'Fettuccine Crêpe', 'كريب فيتوتشيني', 'Crêpe ribbons topped with your favorite chocolate and served with a scoop of ice cream of your choice.', 'كريب مقطّع شرايط ومغطّى بالشوكولا اللي بتختارها، مع سكوب آيس كريم من اختيارك.', 800, 'fettuccine-crepe.webp', 6, true),
  ('crepes', 'fruity-crepe', 'Fruit Crêpe', 'كريب بالفواكه', 'Crêpe topped with banana, kiwi and strawberries, served with your choice of chocolate.', 'كريب مغطّى بالموز، الكيوي والفريز، مع الشوكولا اللي بتختارها.', 850, 'fruity-crepe.webp', 7, true),
  ('crepes', 'brownie-crepe-sandwich', 'Brownie Crêpe Sandwich', 'ساندويش كريب براوني', 'Crêpe filled with brownies, strawberries, banana and crème pâtissière, topped with your favorite chocolate toppings.', 'كريب محشي براوني، فريز، موز وكريما باتيسيير، مع الشوكولا اللي بتختارها.', 1000, 'brownie-crepe-sandwich.webp', 8, true),
  ('crepes', 'sushi-crepe', 'Sushi Crêpe', 'كريب سوشي', 'Eight sushi-style crêpe rolls filled with brownies, topped with fruit and served with a Belgian chocolate dip.', '8 رولز كريب على شكل سوشي، محشية براوني ومغطّاة بالفواكه، مع شوكولا بلجيكية للتغميس.', 1000, 'sushi-crepe.webp', 9, true),
  ('crepes', 'dubai-crepe', 'Dubai Crêpe', 'كريب دبي', 'Crêpe filled with pistachio cream and basma osmalliye, topped with Belgian chocolate and pistachios, and served with a scoop of ice cream of your choice.', 'كريب محشي كريمة فستق حلبي وبصمة عثملية، ومغطّى بالشوكولا البلجيكية وحبات الفستق الحلبي، مع سكوب آيس كريم من اختيارك.', 1222, 'dubai-crepe.webp', 10, true),
  ('waffles', 'waffle-stick', 'Waffle Stick', 'وافل ستيك', 'One waffle stick covered with your choice of spread.', 'وافل ستيك مع الشوكولا اللي بتختارها.', 450, 'waffle-stick.webp', 11, true),
  ('waffles', 'premium-waffle-stick', 'Premium Waffle Stick', 'وافل ستيك بريميوم', 'One waffle stick covered with your choice of Belgian milk or Belgian dark chocolate.', 'وافل ستيك مع اختيارك من الشوكولا البلجيكية بالحليب أو الشوكولا البلجيكية الداكنة.', 600, 'premium-waffle-stick.webp', 12, true),
  ('waffles', 'lotus-waffle', 'Lotus Waffle', 'وافل لوتس', 'Waffle topped with Lotus spread and Lotus biscuits.', 'وافل مع كريمة لوتس وبسكويت لوتس.', 700, 'lotus-waffle.webp', 13, true),
  ('waffles', 'nutella-waffle', 'Nutella Waffle', 'وافل نوتيلا', 'Waffle topped with Nutella spread.', 'وافل مع نوتيلا.', 700, 'nutella-waffle.webp', 14, true),
  ('waffles', 'white-chocolate-waffle', 'White Chocolate Waffle', 'وافل بالشوكولاتة البيضاء', 'Waffle topped with white chocolate.', 'وافل مع شوكولا بيضا.', 700, 'white-chocolate-waffle.webp', 15, true),
  ('waffles', 'belgian-chocolate-waffle', 'Belgian Chocolate Waffle', 'وافل بالشوكولاتة البلجيكية', 'Waffle topped with Belgian chocolate.', 'وافل مع شوكولا بلجيكية.', 1000, 'belgian-chocolate-waffle.webp', 16, true),
  ('waffles', 'dark-chocolate-waffle', 'Dark Chocolate Waffle', 'وافل بالشوكولاتة الداكنة', 'Waffle topped with dark chocolate.', 'وافل مع شوكولا داكنة.', 1000, 'dark-chocolate-waffle.webp', 17, true),
  ('waffles', 'waffle-sandwich', 'Waffle Sandwich', 'ساندويش وافل', 'Two waffles filled with four ice cream rolls of your choice and strawberries. Dine-in only.', '2 وافل، بيناتهم 4 آيس كريم رولز من اختيارك وفريز. بس للأكل بالمحل.', 1000, null, 18, false),
  ('pancakes', 'lotus-pancakes', 'Lotus Pancakes', 'بان كيك لوتس', 'Pancakes filled with Lotus spread and topped with a mix of chocolates.', 'بان كيك محشي كريمة لوتس ومغطّى بميكس من الشوكولا.', 700, 'lotus-pancakes.webp', 19, true),
  ('pancakes', 'nutella-pancakes', 'Nutella Pancakes', 'بان كيك نوتيلا', 'Pancakes filled with Nutella and topped with a mix of chocolates.', 'بان كيك محشي نوتيلا ومغطّى بميكس من الشوكولا.', 700, 'nutella-pancakes.webp', 20, true),
  ('pancakes', 'white-chocolate-pancakes', 'White Chocolate Pancakes', 'بان كيك بالشوكولاتة البيضاء', 'Pancakes filled with white chocolate and topped with a mix of chocolates.', 'بان كيك محشي شوكولا بيضا ومغطّى بميكس من الشوكولا.', 700, 'white-chocolate-pancakes.webp', 21, true),
  ('pancakes', 'belgian-chocolate-pancakes', 'Belgian Chocolate Pancakes', 'بان كيك بالشوكولاتة البلجيكية', 'Pancakes filled with Belgian chocolate and topped with a mix of Belgian chocolates.', 'بان كيك محشي شوكولا بلجيكية ومغطّى بميكس من الشوكولا البلجيكية.', 1000, 'belgian-chocolate-pancakes.webp', 22, true),
  ('pancakes', 'dark-chocolate-pancakes', 'Dark Chocolate Pancakes', 'بان كيك بالشوكولاتة الداكنة', 'Pancakes filled with dark chocolate and topped with a mix of chocolates.', 'بان كيك محشي شوكولا داكنة ومغطّى بميكس من الشوكولا.', 1000, 'dark-chocolate-pancakes.webp', 23, true),
  ('profiteroles', 'creamy-profiteroles', 'Profiteroles', 'بروفيترول', 'Five profiteroles filled with your choice of crème pâtissière or ice cream, topped with your choice of topping.', '5 حبات بروفيترول، محشية كريما باتيسيير أو آيس كريم حسب اختيارك، مع الشوكولا اللي بتحبها.', 1000, 'creamy-profiteroles.webp', 24, true),
  ('profiteroles', 'ice-cream-profiteroles', 'Ice Cream Profiteroles', 'بروفيترول بالآيس كريم', 'Five profiteroles filled with vanilla ice cream and topped with your choice of sauce.', 'خمس قطع بروفيترول محشوة بآيس كريم الفانيليا ومغطاة بصلصة من اختيارك.', 1000, 'ice-cream-profiteroles.webp', 25, true),
  ('rolls', 'fruity-ice-cream-rolls', 'Ice Cream Rolls (One Flavor)', 'آيس كريم رولز بنكهة واحدة', 'Freshly prepared ice cream rolls with one flavor of your choice.', 'آيس كريم رولز بنكهة من اختيارك.', 400, 'fruity-ice-cream-rolls.webp', 26, true),
  ('rolls', 'lotus-ice-cream-rolls', 'Ice Cream Rolls (Two Flavors)', 'آيس كريم رولز بنكهتين', 'Freshly prepared ice cream rolls with two flavors of your choice.', 'آيس كريم رولز بنكهتين من اختيارك.', 400, 'lotus-ice-cream-rolls.webp', 27, true),
  ('rolls', 'nutella-ice-cream-rolls', 'Ice Cream Rolls (Three Flavors)', 'آيس كريم رولز بثلاث نكهات', 'Freshly prepared ice cream rolls with three flavors of your choice.', 'آيس كريم رولز بثلاث نكهات من اختيارك.', 400, 'nutella-ice-cream-rolls.webp', 28, true),
  ('rolls', 'pistachio-ice-cream-rolls', 'Pistachio Ice Cream Rolls', 'آيس كريم رولز بالفستق الحلبي', 'Freshly prepared ice cream rolls with pistachio.', 'آيس كريم رولز بالفستق الحلبي.', 400, 'pistachio-ice-cream-rolls.webp', 29, true),
  ('bowls', 'bueno-bowl', 'Bueno Bowl', 'بول بوينو', 'TBD', 'TBD', 600, null, 30, true),
  ('bowls', 'crunchy-bowl', 'Crunchy Bowl', 'بول كرانشي', 'TBD', 'TBD', 600, 'crunchy-bowl.webp', 31, true),
  ('bowls', 'dubai-bowl', 'Dubai Bowl', 'بول دبي', 'TBD', 'TBD', 600, null, 32, true),
  ('bowls', 'fruity-bowl', 'Fruit Bowl', 'بول فواكه', 'TBD', 'TBD', 600, 'fruity-bowl.webp', 33, true),
  ('bowls', 'marshmallow-bowl', 'Marshmallow Bowl', 'بول مارشميلو', 'TBD', 'TBD', 600, null, 34, true),
  ('bowls', 'strawberry-bowl', 'Strawberry Bowl', 'بول فريز', 'TBD', 'TBD', 600, 'strawberry-bowl.webp', 35, true),
  ('bowls', 'san-sebastian-cheesecake', 'San Sebastián Cheesecake', 'تشيز كيك سان سيباستيان', 'Creamy Basque cheesecake with a caramelized top.', 'تشيز كيك طري من جوّا ومحمّر من فوق.', 700, 'san-sebastian-cheesecake.webp', 36, true),
  ('boxes', 'strawberry-box', 'Strawberry Box', 'علبة فريز', 'Fresh strawberries covered in chocolate.', 'فريز طازة مغطّى بالشوكولا.', 1100, 'strawberry-box.webp', 37, true),
  ('boxes', 'tri-box', 'Tri-Box', 'تراي بوكس', 'Pistachio, fettuccine and Lotus crêpes in one box.', 'كريب فستق، كريب فيتوتشيني وكريب لوتس بعلبة وحدة.', 1500, 'tri-box.webp', 38, true),
  ('boxes', 'sweet-spot-box', 'Sweet Spot Box', 'علبة سويت سبوت', 'Waffle bites, crêpe rolls, fettuccine crêpe, brownies, pancakes, strawberries and profiteroles, served with four cups of chocolate for dipping.', 'قطع وافل، كريب رولز، كريب فيتوتشيني، براوني، بان كيك، فريز وبروفيترول، مع 4 كوب شوكولا للتغميس.', 3300, 'sweet-spot-box.webp', 39, true),
  ('milkshakes', 'caramel-milkshake', 'Caramel Milkshake', 'ميلك شيك كراميل', 'A smooth, cold caramel milkshake.', 'ميلك شيك كراميل بارد وناعم.', 500, 'caramel-milkshake.webp', 40, true),
  ('milkshakes', 'chocolate-milkshake', 'Chocolate Milkshake', 'ميلك شيك شوكولا', 'A thick, creamy chocolate milkshake.', 'ميلك شيك شوكولا كثيف وكريمي.', 500, 'chocolate-milkshake.webp', 41, true),
  ('milkshakes', 'lotus-milkshake', 'Lotus Milkshake', 'ميلك شيك لوتس', 'A thick, creamy milkshake made with Lotus Biscoff.', 'ميلك شيك كثيف وكريمي، معمول بلوتس بيسكوف.', 500, 'lotus-milkshake.webp', 42, true),
  ('milkshakes', 'oreo-milkshake', 'Oreo Milkshake', 'ميلك شيك أوريو', 'A creamy milkshake with Oreo cookies.', 'ميلك شيك كريمي مع بسكويت أوريو.', 500, 'oreo-milkshake.webp', 43, true),
  ('milkshakes', 'strawberry-milkshake', 'Strawberry Milkshake', 'ميلك شيك فريز', 'A thick, cold strawberry milkshake.', 'ميلك شيك فريز بارد وكثيف.', 500, 'strawberry-milkshake.webp', 44, true),
  ('smoothies', 'berry-smoothie', 'Berry Smoothie', 'سموذي توت', 'A cold smoothie with mixed berries.', 'سموذي بارد مع توت مشكّل.', 400, 'berry-smoothie.webp', 45, true),
  ('smoothies', 'coconut-mango-smoothie', 'Mango & Coconut Smoothie', 'سموذي مانغو وجوز الهند', 'A cold smoothie with mango and coconut.', 'سموذي بارد بالمانغو وجوز الهند.', 400, 'coconut-mango-smoothie.webp', 46, true),
  ('smoothies', 'mango-smoothie', 'Mango Smoothie', 'سموذي مانغو', 'Ripe mango blended into a smooth, cold drink.', 'سموذي بارد وناعم من المانغو الناضجة.', 400, 'mango-smoothie.webp', 47, true),
  ('smoothies', 'strawberry-smoothie', 'Strawberry Smoothie', 'سموذي فريز', 'Fresh strawberries blended into a cold smoothie.', 'سموذي بارد من الفريز الطازة.', 400, 'strawberry-smoothie.webp', 48, true),
  ('mixes', 'blue-hawaii', 'Blue Hawaii', 'بلو هاواي', 'A cold tropical-style mixed drink.', 'بارد ومنعش.', 333, 'blue-hawaii.webp', 49, true),
  ('mixes', 'blue-ocean', 'Blue Ocean', 'بلو أوشن', 'A refreshing blue mixed drink, served cold.', 'بارد ومنعش.', 333, 'blue-ocean.webp', 50, true),
  ('mixes', 'hyper-kiwi', 'Hyper Kiwi', 'هايبر كيوي', 'A cold kiwi-flavored mixed drink.', 'بارد ومنعش.', 333, 'hyper-kiwi.webp', 51, true),
  ('mixes', 'mangotic', 'Mangotic', 'مانغوتيك', 'A cold mango-flavored mixed drink.', 'بارد ومنعش.', 333, 'mangotic.webp', 52, true),
  ('mixes', 'passion-mojito', 'Passion Fruit Mojito', 'موهيتو باشن فروت', 'A cold mojito-style drink with passion fruit flavor.', 'بارد ومنعش.', 333, 'passion-mojito.webp', 53, true),
  ('mixes', 'strawberry-mojito', 'Strawberry Mojito', 'موهيتو فريز', 'A cold mojito-style drink with strawberry flavor.', 'بارد ومنعش.', 333, 'strawberry-mojito.webp', 54, true),
  ('juice', 'orange-juice', 'Fresh Orange Juice', 'عصير برتقال طازة', 'Freshly squeezed orange juice.', 'عصير برتقال معصور طازة.', 222, 'orange-juice.webp', 55, true),
  ('water', 'water', 'Water', 'مياه', 'Bottled water.', 'قنينة مياه.', 100, null, 56, true)
) as p (category, slug, name_en, name_ar, description_en, description_ar, price_cents, image_path, sort_order, orderable_online)
  on p.category = c.slug;

insert into public.product_option_groups (product_id, group_id, key, sort_order)
select p.id, g.id, g.key, l.sort_order
from (values
  ('brownie-crepe-sandwich', 'extra-chocolate', 1),
  ('brownie-crepe-sandwich', 'fruit', 2),
  ('brownie-crepe-sandwich', 'toppings', 3),
  ('brownie-crepe-sandwich', 'bars', 4),
  ('brownie-crepe-sandwich', 'nuts', 5),
  ('belgian-chocolate-waffle', 'extra-chocolate', 1),
  ('belgian-chocolate-waffle', 'fruit', 2),
  ('belgian-chocolate-waffle', 'toppings', 3),
  ('belgian-chocolate-waffle', 'bars', 4),
  ('belgian-chocolate-waffle', 'nuts', 5),
  ('white-chocolate-crepe', 'extra-chocolate', 1),
  ('white-chocolate-crepe', 'fruit', 2),
  ('white-chocolate-crepe', 'toppings', 3),
  ('white-chocolate-crepe', 'bars', 4),
  ('white-chocolate-crepe', 'nuts', 5),
  ('dubai-crepe', 'extra-chocolate', 1),
  ('dubai-crepe', 'fruit', 2),
  ('dubai-crepe', 'toppings', 3),
  ('dubai-crepe', 'bars', 4),
  ('dubai-crepe', 'nuts', 5),
  ('nutella-waffle', 'extra-chocolate', 1),
  ('nutella-waffle', 'fruit', 2),
  ('nutella-waffle', 'toppings', 3),
  ('nutella-waffle', 'bars', 4),
  ('nutella-waffle', 'nuts', 5),
  ('sushi-crepe', 'extra-chocolate', 1),
  ('sushi-crepe', 'fruit', 2),
  ('sushi-crepe', 'toppings', 3),
  ('sushi-crepe', 'bars', 4),
  ('sushi-crepe', 'nuts', 5),
  ('nutella-pancakes', 'extra-chocolate', 1),
  ('nutella-pancakes', 'fruit', 2),
  ('nutella-pancakes', 'toppings', 3),
  ('nutella-pancakes', 'bars', 4),
  ('nutella-pancakes', 'nuts', 5),
  ('white-chocolate-pancakes', 'extra-chocolate', 1),
  ('white-chocolate-pancakes', 'fruit', 2),
  ('white-chocolate-pancakes', 'toppings', 3),
  ('white-chocolate-pancakes', 'bars', 4),
  ('white-chocolate-pancakes', 'nuts', 5),
  ('dark-chocolate-crepe', 'extra-chocolate', 1),
  ('dark-chocolate-crepe', 'fruit', 2),
  ('dark-chocolate-crepe', 'toppings', 3),
  ('dark-chocolate-crepe', 'bars', 4),
  ('dark-chocolate-crepe', 'nuts', 5),
  ('creamy-profiteroles', 'chocolate', 1),
  ('creamy-profiteroles', 'extra-chocolate', 2),
  ('creamy-profiteroles', 'fruit', 3),
  ('creamy-profiteroles', 'toppings', 4),
  ('creamy-profiteroles', 'bars', 5),
  ('creamy-profiteroles', 'nuts', 6),
  ('dark-chocolate-pancakes', 'extra-chocolate', 1),
  ('dark-chocolate-pancakes', 'fruit', 2),
  ('dark-chocolate-pancakes', 'toppings', 3),
  ('dark-chocolate-pancakes', 'bars', 4),
  ('dark-chocolate-pancakes', 'nuts', 5),
  ('nutella-ice-cream-rolls', 'extra-chocolate', 1),
  ('nutella-ice-cream-rolls', 'fruit', 2),
  ('nutella-ice-cream-rolls', 'toppings', 3),
  ('nutella-ice-cream-rolls', 'bars', 4),
  ('nutella-ice-cream-rolls', 'nuts', 5),
  ('belgian-chocolate-pancakes', 'extra-chocolate', 1),
  ('belgian-chocolate-pancakes', 'fruit', 2),
  ('belgian-chocolate-pancakes', 'toppings', 3),
  ('belgian-chocolate-pancakes', 'bars', 4),
  ('belgian-chocolate-pancakes', 'nuts', 5),
  ('dark-chocolate-waffle', 'extra-chocolate', 1),
  ('dark-chocolate-waffle', 'fruit', 2),
  ('dark-chocolate-waffle', 'toppings', 3),
  ('dark-chocolate-waffle', 'bars', 4),
  ('dark-chocolate-waffle', 'nuts', 5),
  ('fruity-ice-cream-rolls', 'extra-chocolate', 1),
  ('fruity-ice-cream-rolls', 'fruit', 2),
  ('fruity-ice-cream-rolls', 'toppings', 3),
  ('fruity-ice-cream-rolls', 'bars', 4),
  ('fruity-ice-cream-rolls', 'nuts', 5),
  ('pistachio-ice-cream-rolls', 'extra-chocolate', 1),
  ('pistachio-ice-cream-rolls', 'fruit', 2),
  ('pistachio-ice-cream-rolls', 'toppings', 3),
  ('pistachio-ice-cream-rolls', 'bars', 4),
  ('pistachio-ice-cream-rolls', 'nuts', 5),
  ('premium-waffle-stick', 'stick-premium', 1),
  ('premium-waffle-stick', 'extra-chocolate', 2),
  ('premium-waffle-stick', 'fruit', 3),
  ('premium-waffle-stick', 'toppings', 4),
  ('premium-waffle-stick', 'bars', 5),
  ('premium-waffle-stick', 'nuts', 6),
  ('fruity-crepe', 'extra-chocolate', 1),
  ('fruity-crepe', 'fruit', 2),
  ('fruity-crepe', 'toppings', 3),
  ('fruity-crepe', 'bars', 4),
  ('fruity-crepe', 'nuts', 5),
  ('white-chocolate-waffle', 'extra-chocolate', 1),
  ('white-chocolate-waffle', 'fruit', 2),
  ('white-chocolate-waffle', 'toppings', 3),
  ('white-chocolate-waffle', 'bars', 4),
  ('white-chocolate-waffle', 'nuts', 5),
  ('waffle-stick', 'stick', 1),
  ('waffle-stick', 'extra-chocolate', 2),
  ('waffle-stick', 'fruit', 3),
  ('waffle-stick', 'toppings', 4),
  ('waffle-stick', 'bars', 5),
  ('waffle-stick', 'nuts', 6),
  ('lotus-crepe', 'extra-chocolate', 1),
  ('lotus-crepe', 'fruit', 2),
  ('lotus-crepe', 'toppings', 3),
  ('lotus-crepe', 'bars', 4),
  ('lotus-crepe', 'nuts', 5),
  ('lotus-ice-cream-rolls', 'extra-chocolate', 1),
  ('lotus-ice-cream-rolls', 'fruit', 2),
  ('lotus-ice-cream-rolls', 'toppings', 3),
  ('lotus-ice-cream-rolls', 'bars', 4),
  ('lotus-ice-cream-rolls', 'nuts', 5),
  ('lotus-waffle', 'extra-chocolate', 1),
  ('lotus-waffle', 'fruit', 2),
  ('lotus-waffle', 'toppings', 3),
  ('lotus-waffle', 'bars', 4),
  ('lotus-waffle', 'nuts', 5),
  ('lotus-pancakes', 'extra-chocolate', 1),
  ('lotus-pancakes', 'fruit', 2),
  ('lotus-pancakes', 'toppings', 3),
  ('lotus-pancakes', 'bars', 4),
  ('lotus-pancakes', 'nuts', 5),
  ('nutella-crepe', 'extra-chocolate', 1),
  ('nutella-crepe', 'fruit', 2),
  ('nutella-crepe', 'toppings', 3),
  ('nutella-crepe', 'bars', 4),
  ('nutella-crepe', 'nuts', 5),
  ('fettuccine-crepe', 'extra-chocolate', 1),
  ('fettuccine-crepe', 'fruit', 2),
  ('fettuccine-crepe', 'toppings', 3),
  ('fettuccine-crepe', 'bars', 4),
  ('fettuccine-crepe', 'nuts', 5),
  ('belgian-chocolate-crepe', 'extra-chocolate', 1),
  ('belgian-chocolate-crepe', 'fruit', 2),
  ('belgian-chocolate-crepe', 'toppings', 3),
  ('belgian-chocolate-crepe', 'bars', 4),
  ('belgian-chocolate-crepe', 'nuts', 5),
  ('ice-cream-profiteroles', 'chocolate', 1),
  ('ice-cream-profiteroles', 'extra-chocolate', 2),
  ('ice-cream-profiteroles', 'fruit', 3),
  ('ice-cream-profiteroles', 'toppings', 4),
  ('ice-cream-profiteroles', 'bars', 5),
  ('ice-cream-profiteroles', 'nuts', 6)
) as l (product, group_key, sort_order)
join public.products p on p.slug = l.product
join public.option_groups g on g.key = l.group_key;

insert into public.discount_codes (code, description, kind, value, first_order_only)
values ('SWEET20', '20% off your first online order', 'percent', 20, true);

-- Site settings the admin edits. The ticker starts with the website's
-- built-in phrases; the welcome popup starts switched off.
insert into public.site_settings (key, is_public, value)
values
  ('home_ticker', true, jsonb_build_object(
    'enabled', true,
    'phrases', jsonb_build_array(
      jsonb_build_object('en', 'Order now', 'ar', 'اطلب الآن'),
      jsonb_build_object('en', 'Pickup or delivery', 'ar', 'استلام أو توصيل'),
      jsonb_build_object('en', 'Open late', 'ar', 'مفتوحين للسهرة'),
      jsonb_build_object('en', '20% off · code SWEET20', 'ar', 'خصم 20% · الرمز SWEET20')
    )
  )),
  ('welcome_popup', true, jsonb_build_object(
    'enabled', false,
    'title', jsonb_build_object('en', '20% off your first order', 'ar', 'خصم 20% على أول طلب'),
    'body', jsonb_build_object(
      'en', 'Order online for pickup or delivery and use the code at checkout.',
      'ar', 'اطلب أونلاين استلام أو توصيل واستعمل الرمز عند الدفع.'
    ),
    'code', 'SWEET20',
    'cta', jsonb_build_object(
      'label', jsonb_build_object('en', 'Order now', 'ar', 'اطلب الآن'),
      'target', 'order'
    ),
    'delay_seconds', 4,
    'repeat_after_days', 7,
    'pages', 'all'
  ));
