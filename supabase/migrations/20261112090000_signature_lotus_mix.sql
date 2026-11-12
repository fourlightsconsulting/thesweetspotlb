update public.products as p
set description_en = copy.en, description_ar = copy.ar
from (values
  ('lotus-crepe', 'Crêpe filled and topped with our signature Lotus mix and finished with Lotus biscuits.', 'كريب محشي بخلطة اللوتس الخاصة فينا ومغطّى بنفس الخلطة وبسكويت لوتس.'),
  ('lotus-waffle', 'Waffle topped with our signature Lotus mix and Lotus biscuits.', 'وافل مع خلطة اللوتس الخاصة فينا وبسكويت لوتس.'),
  ('lotus-pancakes', 'Pancakes filled with our signature Lotus mix and topped with a mix of chocolates.', 'بان كيك محشي بخلطة اللوتس الخاصة فينا ومغطّى بميكس من الشوكولا.'),
  ('lotus-milkshake', 'A thick, creamy milkshake made with our signature Lotus Biscoff mix.', 'ميلك شيك كثيف وكريمي، معمول بخلطة لوتس بيسكوف الخاصة فينا.')
) as copy(slug, en, ar)
where p.slug = copy.slug
  and (p.description_en, p.description_ar) is distinct from (copy.en, copy.ar);

update public.categories as c
set description_en = copy.en, description_ar = copy.ar
from (values
  ('crepes', 'Thin crêpes with chocolate, our signature Lotus mix or fruit.', 'كريب رقيق مع شوكولا، خلطة اللوتس الخاصة فينا أو فواكه.'),
  ('pancakes', 'Fluffy pancakes filled with chocolate or our signature Lotus mix, with a mix of chocolates on top.', 'بان كيك محشي شوكولا أو خلطة اللوتس الخاصة فينا ومغطّى بميكس من الشوكولا.')
) as copy(slug, en, ar)
where c.slug = copy.slug
  and (c.description_en, c.description_ar) is distinct from (copy.en, copy.ar);
