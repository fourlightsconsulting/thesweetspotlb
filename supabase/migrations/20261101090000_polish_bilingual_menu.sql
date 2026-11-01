-- Review English menu copy and use clear Modern Standard Arabic.
-- Copy only: prices, availability, URLs, photos and selection rules stay intact.
-- Guard changed fields against concurrent staff edits; the migration is atomic.
do $menu_copy$
declare
  affected integer;
begin
  -- categories: mixes
  if exists (select 1 from public.categories where slug = 'mixes') then
    update public.categories
    set name_ar = 'مشروبات مشكلة'
    where slug = 'mixes'
      and (name_ar = 'ميكس' or name_ar = 'مشروبات مشكلة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/mixes'; end if;
  end if;

  -- categories: juice
  if exists (select 1 from public.categories where slug = 'juice') then
    update public.categories
    set name_ar = 'عصير طازج'
    where slug = 'juice'
      and (name_ar = 'عصير طازة' or name_ar = 'عصير طازج');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/juice'; end if;
  end if;

  -- categories: crepes
  if exists (select 1 from public.categories where slug = 'crepes') then
    update public.categories
    set description_en = 'Thin crêpes with chocolate, spreads or fruit.',
        description_ar = 'كريب رقيق مع الشوكولاتة أو كريمات الدهن أو الفواكه.'
    where slug = 'crepes'
      and (description_en = 'Thin, warm, folded around Nutella.' or description_en = 'Thin crêpes with chocolate, spreads or fruit.')
      and (description_ar = 'رقيقة وسخنة، ملفوفة على النوتيلا.' or description_ar = 'كريب رقيق مع الشوكولاتة أو كريمات الدهن أو الفواكه.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/crepes'; end if;
  end if;

  -- categories: profiteroles
  if exists (select 1 from public.categories where slug = 'profiteroles') then
    update public.categories
    set description_en = 'Pastry puffs filled with cream or ice cream, with your choice of sauce.',
        description_ar = 'قطع بروفيترول محشوة بالكريمة أو الآيس كريم، مع صلصة من اختيارك.'
    where slug = 'profiteroles'
      and (description_en = 'Bite-size and covered in chocolate.' or description_en = 'Pastry puffs filled with cream or ice cream, with your choice of sauce.')
      and (description_ar = 'لقمة صغيرة مغطّاة بالشوكولا.' or description_ar = 'قطع بروفيترول محشوة بالكريمة أو الآيس كريم، مع صلصة من اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/profiteroles'; end if;
  end if;

  -- categories: rolls
  if exists (select 1 from public.categories where slug = 'rolls') then
    update public.categories
    set name_ar = 'لفائف الآيس كريم',
        description_en = 'Freshly prepared ice cream rolls in a variety of flavors.',
        description_ar = 'لفائف آيس كريم تحضر طازجة بنكهات متنوعة.'
    where slug = 'rolls'
      and (name_ar = 'آيس كريم رولز' or name_ar = 'لفائف الآيس كريم')
      and (description_en = 'Rolled fresh in front of you.' or description_en = 'Freshly prepared ice cream rolls in a variety of flavors.')
      and (description_ar = 'بينلفّ طازة قدّامك.' or description_ar = 'لفائف آيس كريم تحضر طازجة بنكهات متنوعة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/rolls'; end if;
  end if;

  -- categories: pancakes
  if exists (select 1 from public.categories where slug = 'pancakes') then
    update public.categories
    set description_en = 'Fluffy pancakes with chocolate or Lotus spread.',
        description_ar = 'بان كيك هش مع الشوكولاتة أو كريمة لوتس.'
    where slug = 'pancakes'
      and (description_en = 'Fluffy stacks, drizzled to order.' or description_en = 'Fluffy pancakes with chocolate or Lotus spread.')
      and (description_ar = 'طبقات منفوشة مع الصوص اللي بتحبه.' or description_ar = 'بان كيك هش مع الشوكولاتة أو كريمة لوتس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/pancakes'; end if;
  end if;

  -- categories: bowls
  if exists (select 1 from public.categories where slug = 'bowls') then
    update public.categories
    set name_en = 'Dessert bowls & cheesecake',
        name_ar = 'أطباق الحلوى والتشيز كيك',
        description_en = 'Dessert bowls with a variety of toppings, plus San Sebastián cheesecake.',
        description_ar = 'أطباق حلوى بإضافات متنوعة، وتشيز كيك سان سيباستيان.'
    where slug = 'bowls'
      and (name_en = 'Bowls & cheesecake' or name_en = 'Dessert bowls & cheesecake')
      and (name_ar = 'بولز وتشيز كيك' or name_ar = 'أطباق الحلوى والتشيز كيك')
      and (description_en = 'Piled high and made fresh.' or description_en = 'Dessert bowls with a variety of toppings, plus San Sebastián cheesecake.')
      and (description_ar = 'مليانة ومعمولة طازة.' or description_ar = 'أطباق حلوى بإضافات متنوعة، وتشيز كيك سان سيباستيان.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/bowls'; end if;
  end if;

  -- categories: waffles
  if exists (select 1 from public.categories where slug = 'waffles') then
    update public.categories
    set description_en = 'Crisp on the outside, soft on the inside.',
        description_ar = 'وافل مقرمش من الخارج وطري من الداخل.'
    where slug = 'waffles'
      and (description_en = 'Crispy outside. Soft inside.' or description_en = 'Crisp on the outside, soft on the inside.')
      and (description_ar = 'مقرمش من برّا، طري من جوّا.' or description_ar = 'وافل مقرمش من الخارج وطري من الداخل.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/waffles'; end if;
  end if;

  -- categories: boxes
  if exists (select 1 from public.categories where slug = 'boxes') then
    update public.categories
    set name_ar = 'علب الحلوى',
        description_en = 'A selection of dessert boxes to share.',
        description_ar = 'تشكيلة من علب الحلوى للمشاركة.'
    where slug = 'boxes'
      and (name_ar = 'علب الحلو' or name_ar = 'علب الحلوى')
      and (description_en = 'Made for sharing. Or not.' or description_en = 'A selection of dessert boxes to share.')
      and (description_ar = 'للمشاركة... أو لا.' or description_ar = 'تشكيلة من علب الحلوى للمشاركة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/boxes'; end if;
  end if;

  -- categories: drinks
  if exists (select 1 from public.categories where slug = 'drinks') then
    update public.categories
    set description_en = 'Milkshakes, smoothies, mixed drinks, fresh juice and water.',
        description_ar = 'ميلك شيك وسموذي ومشروبات مشكلة وعصير طازج ومياه.'
    where slug = 'drinks'
      and (description_en = 'Shakes, smoothies and fresh mixes.' or description_en = 'Milkshakes, smoothies, mixed drinks, fresh juice and water.')
      and (description_ar = 'ميلك شيك، سموذي وميكس طازة.' or description_ar = 'ميلك شيك وسموذي ومشروبات مشكلة وعصير طازج ومياه.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: categories/drinks'; end if;
  end if;

  -- products: white-chocolate-crepe
  if exists (select 1 from public.products where slug = 'white-chocolate-crepe') then
    update public.products
    set name_ar = 'كريب بالشوكولاتة البيضاء',
        description_en = 'Crêpe filled with white chocolate.',
        description_ar = 'كريب محشو بالشوكولاتة البيضاء.'
    where slug = 'white-chocolate-crepe'
      and (name_ar = 'كريب شوكولا بيضاء' or name_ar = 'كريب بالشوكولاتة البيضاء')
      and (description_en = 'Crêpe with premium white chocolate filling.' or description_en = 'Crêpe filled with white chocolate.')
      and (description_ar = 'شوكولا بيضاء فاخرة.' or description_ar = 'كريب محشو بالشوكولاتة البيضاء.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/white-chocolate-crepe'; end if;
  end if;

  -- products: waffle-stick
  if exists (select 1 from public.products where slug = 'waffle-stick') then
    update public.products
    set name_ar = 'وافل على عود',
        description_en = 'One waffle stick coated in your choice of Lotus spread, Nutella or white chocolate.',
        description_ar = 'قطعة وافل على عود، مغطاة بكريمة لوتس أو نوتيلا أو الشوكولاتة البيضاء، حسب اختيارك.'
    where slug = 'waffle-stick'
      and (name_ar = 'عصا وافل' or name_ar = 'وافل على عود')
      and (description_en = 'One waffle stick, dipped in Lotus, Nutella or white chocolate.' or description_en = 'One waffle stick coated in your choice of Lotus spread, Nutella or white chocolate.')
      and (description_ar = 'عصا وافل وحدة، مغطّسة بلوتس، نوتيلا أو شوكولا بيضاء.' or description_ar = 'قطعة وافل على عود، مغطاة بكريمة لوتس أو نوتيلا أو الشوكولاتة البيضاء، حسب اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/waffle-stick'; end if;
  end if;

  -- products: lotus-waffle
  if exists (select 1 from public.products where slug = 'lotus-waffle') then
    update public.products
    set description_ar = 'وافل مغطى بكريمة لوتس ومزين ببسكويت لوتس.'
    where slug = 'lotus-waffle'
      and (description_ar = 'كريمة لوتس وبسكوت لوتس.' or description_ar = 'وافل مغطى بكريمة لوتس ومزين ببسكويت لوتس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/lotus-waffle'; end if;
  end if;

  -- products: fettuccine-crepe
  if exists (select 1 from public.products where slug = 'fettuccine-crepe') then
    update public.products
    set description_en = 'Crêpe ribbons served with a scoop of ice cream and Belgian chocolate for dipping.',
        description_ar = 'شرائط كريب تقدم مع كرة من الآيس كريم وصلصة شوكولاتة بلجيكية للتغميس.'
    where slug = 'fettuccine-crepe'
      and (description_en = 'Crêpe cut into ribbons served with a scoop of ice cream and a Belgian chocolate dip.' or description_en = 'Crêpe ribbons served with a scoop of ice cream and Belgian chocolate for dipping.')
      and (description_ar = 'كريب مقطّع شرايط، مع بولة آيس كريم وصوص شوكولا بلجيكية للتغميس.' or description_ar = 'شرائط كريب تقدم مع كرة من الآيس كريم وصلصة شوكولاتة بلجيكية للتغميس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/fettuccine-crepe'; end if;
  end if;

  -- products: premium-waffle-stick
  if exists (select 1 from public.products where slug = 'premium-waffle-stick') then
    update public.products
    set name_ar = 'وافل فاخر على عود',
        description_en = 'One waffle stick coated in your choice of Belgian or dark chocolate.',
        description_ar = 'قطعة وافل على عود، مغطاة بالشوكولاتة البلجيكية أو الداكنة، حسب اختيارك.'
    where slug = 'premium-waffle-stick'
      and (name_ar = 'عصا وافل بريميوم' or name_ar = 'وافل فاخر على عود')
      and (description_en = 'One waffle stick, dipped in Belgian or dark chocolate.' or description_en = 'One waffle stick coated in your choice of Belgian or dark chocolate.')
      and (description_ar = 'عصا وافل وحدة، مغطّسة بشوكولا بلجيكية أو داكنة.' or description_ar = 'قطعة وافل على عود، مغطاة بالشوكولاتة البلجيكية أو الداكنة، حسب اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/premium-waffle-stick'; end if;
  end if;

  -- products: fruity-crepe
  if exists (select 1 from public.products where slug = 'fruity-crepe') then
    update public.products
    set name_en = 'Fruit Crêpe',
        description_en = 'Crêpe topped with mixed fresh fruit and served with Belgian chocolate.',
        description_ar = 'كريب مزين بفواكه طازجة مشكلة، يقدم مع الشوكولاتة البلجيكية.'
    where slug = 'fruity-crepe'
      and (name_en = 'Fruity Crêpe' or name_en = 'Fruit Crêpe')
      and (description_en = 'Crêpe topped with mix fruits served with Belgian chocolate.' or description_en = 'Crêpe topped with mixed fresh fruit and served with Belgian chocolate.')
      and (description_ar = 'فواكه طازة مشكّلة.' or description_ar = 'كريب مزين بفواكه طازجة مشكلة، يقدم مع الشوكولاتة البلجيكية.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/fruity-crepe'; end if;
  end if;

  -- products: nutella-crepe
  if exists (select 1 from public.products where slug = 'nutella-crepe') then
    update public.products
    set description_en = 'Crêpe filled with Nutella spread.',
        description_ar = 'كريب محشو بكريمة نوتيلا.'
    where slug = 'nutella-crepe'
      and (description_en = 'Crêpe with Nutella filling' or description_en = 'Crêpe filled with Nutella spread.')
      and (description_ar = 'شوكولا نوتيلا.' or description_ar = 'كريب محشو بكريمة نوتيلا.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/nutella-crepe'; end if;
  end if;

  -- products: belgian-chocolate-crepe
  if exists (select 1 from public.products where slug = 'belgian-chocolate-crepe') then
    update public.products
    set name_ar = 'كريب بالشوكولاتة البلجيكية',
        description_en = 'Crêpe topped with Belgian chocolate.',
        description_ar = 'كريب مغطى بالشوكولاتة البلجيكية.'
    where slug = 'belgian-chocolate-crepe'
      and (name_ar = 'كريب شوكولا بلجيكية' or name_ar = 'كريب بالشوكولاتة البلجيكية')
      and (description_en = 'Crêpe topped with Premium Belgian chocolate.' or description_en = 'Crêpe topped with Belgian chocolate.')
      and (description_ar = 'شوكولا بلجيكية فاخرة.' or description_ar = 'كريب مغطى بالشوكولاتة البلجيكية.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/belgian-chocolate-crepe'; end if;
  end if;

  -- products: lotus-crepe
  if exists (select 1 from public.products where slug = 'lotus-crepe') then
    update public.products
    set description_en = 'Crêpe filled with Lotus spread and topped with Lotus biscuits.',
        description_ar = 'كريب محشو بكريمة لوتس ومزين ببسكويت لوتس.'
    where slug = 'lotus-crepe'
      and (description_en = 'Crêpe topped with Lotus biscuits and filled with lotus spread.' or description_en = 'Crêpe filled with Lotus spread and topped with Lotus biscuits.')
      and (description_ar = 'كريمة لوتس وبسكوت لوتس.' or description_ar = 'كريب محشو بكريمة لوتس ومزين ببسكويت لوتس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/lotus-crepe'; end if;
  end if;

  -- products: sushi-crepe
  if exists (select 1 from public.products where slug = 'sushi-crepe') then
    update public.products
    set description_en = 'Eight sushi-style crêpe rolls filled with brownies, topped with fruit and served with Belgian chocolate for dipping.',
        description_ar = 'ثماني لفائف كريب على طريقة السوشي، محشوة بالبراوني ومزينة بالفواكه، تقدم مع صلصة شوكولاتة بلجيكية للتغميس.'
    where slug = 'sushi-crepe'
      and (description_en = 'Eight crêpe rolls sushi style stuffed in brownies topped with fruits served with a Belgian chocolate dip.' or description_en = 'Eight sushi-style crêpe rolls filled with brownies, topped with fruit and served with Belgian chocolate for dipping.')
      and (description_ar = '8 لفّات كريب على طريقة السوشي، مع صوص شوكولا بلجيكية للتغميس.' or description_ar = 'ثماني لفائف كريب على طريقة السوشي، محشوة بالبراوني ومزينة بالفواكه، تقدم مع صلصة شوكولاتة بلجيكية للتغميس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/sushi-crepe'; end if;
  end if;

  -- products: nutella-waffle
  if exists (select 1 from public.products where slug = 'nutella-waffle') then
    update public.products
    set description_en = 'Waffle topped with Nutella spread.',
        description_ar = 'وافل مغطى بكريمة نوتيلا.'
    where slug = 'nutella-waffle'
      and (description_en = 'Waffle topped with Nutella chocolate spread.' or description_en = 'Waffle topped with Nutella spread.')
      and (description_ar = 'شوكولا نوتيلا.' or description_ar = 'وافل مغطى بكريمة نوتيلا.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/nutella-waffle'; end if;
  end if;

  -- products: white-chocolate-waffle
  if exists (select 1 from public.products where slug = 'white-chocolate-waffle') then
    update public.products
    set name_ar = 'وافل بالشوكولاتة البيضاء',
        description_en = 'Waffle topped with white chocolate.',
        description_ar = 'وافل مغطى بالشوكولاتة البيضاء.'
    where slug = 'white-chocolate-waffle'
      and (name_ar = 'وافل شوكولا بيضاء' or name_ar = 'وافل بالشوكولاتة البيضاء')
      and (description_en = 'Waffle topped with Premium white chocolate.' or description_en = 'Waffle topped with white chocolate.')
      and (description_ar = 'شوكولا بيضاء فاخرة.' or description_ar = 'وافل مغطى بالشوكولاتة البيضاء.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/white-chocolate-waffle'; end if;
  end if;

  -- products: belgian-chocolate-waffle
  if exists (select 1 from public.products where slug = 'belgian-chocolate-waffle') then
    update public.products
    set name_ar = 'وافل بالشوكولاتة البلجيكية',
        description_en = 'Waffle topped with Belgian chocolate.',
        description_ar = 'وافل مغطى بالشوكولاتة البلجيكية.'
    where slug = 'belgian-chocolate-waffle'
      and (name_ar = 'وافل شوكولا بلجيكية' or name_ar = 'وافل بالشوكولاتة البلجيكية')
      and (description_en = 'Waffle topped with Premium Belgian chocolate.' or description_en = 'Waffle topped with Belgian chocolate.')
      and (description_ar = 'شوكولا بلجيكية فاخرة.' or description_ar = 'وافل مغطى بالشوكولاتة البلجيكية.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/belgian-chocolate-waffle'; end if;
  end if;

  -- products: dark-chocolate-waffle
  if exists (select 1 from public.products where slug = 'dark-chocolate-waffle') then
    update public.products
    set name_ar = 'وافل بالشوكولاتة الداكنة',
        description_en = 'Waffle topped with dark chocolate.',
        description_ar = 'وافل مغطى بالشوكولاتة الداكنة.'
    where slug = 'dark-chocolate-waffle'
      and (name_ar = 'وافل شوكولا داكنة' or name_ar = 'وافل بالشوكولاتة الداكنة')
      and (description_en = 'Waffle topped with dark chocolate' or description_en = 'Waffle topped with dark chocolate.')
      and (description_ar = 'شوكولا داكنة.' or description_ar = 'وافل مغطى بالشوكولاتة الداكنة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/dark-chocolate-waffle'; end if;
  end if;

  -- products: waffle-sandwich
  if exists (select 1 from public.products where slug = 'waffle-sandwich') then
    update public.products
    set name_ar = 'ساندويتش وافل',
        description_en = 'Two waffles filled with four ice cream rolls of your choice and strawberries. Dine-in only.',
        description_ar = 'قطعتا وافل بينهما أربع لفائف آيس كريم من اختيارك وفراولة. متاح للتناول داخل المحل فقط.'
    where slug = 'waffle-sandwich'
      and (name_ar = 'ساندويش وافل' or name_ar = 'ساندويتش وافل')
      and (description_en = 'Two waffles with four ice cream rolls of your choice and strawberries in between. Dine-in only.' or description_en = 'Two waffles filled with four ice cream rolls of your choice and strawberries. Dine-in only.')
      and (description_ar = 'وافلين، 4 آيس كريم رولز عذوقك وفريز. بس بالمحل.' or description_ar = 'قطعتا وافل بينهما أربع لفائف آيس كريم من اختيارك وفراولة. متاح للتناول داخل المحل فقط.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/waffle-sandwich'; end if;
  end if;

  -- products: lotus-pancakes
  if exists (select 1 from public.products where slug = 'lotus-pancakes') then
    update public.products
    set description_en = 'Pancakes topped with Lotus spread and Lotus biscuits.',
        description_ar = 'بان كيك مغطى بكريمة لوتس ومزين ببسكويت لوتس.'
    where slug = 'lotus-pancakes'
      and (description_en = 'Pancake topped with Lotus spread and Lotus biscuits.' or description_en = 'Pancakes topped with Lotus spread and Lotus biscuits.')
      and (description_ar = 'كريمة لوتس وبسكوت لوتس.' or description_ar = 'بان كيك مغطى بكريمة لوتس ومزين ببسكويت لوتس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/lotus-pancakes'; end if;
  end if;

  -- products: nutella-pancakes
  if exists (select 1 from public.products where slug = 'nutella-pancakes') then
    update public.products
    set description_en = 'Pancakes topped with Nutella spread.',
        description_ar = 'بان كيك مغطى بكريمة نوتيلا.'
    where slug = 'nutella-pancakes'
      and (description_en = 'Pancake topped with nutella chocolate spread.' or description_en = 'Pancakes topped with Nutella spread.')
      and (description_ar = 'شوكولا نوتيلا.' or description_ar = 'بان كيك مغطى بكريمة نوتيلا.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/nutella-pancakes'; end if;
  end if;

  -- products: belgian-chocolate-pancakes
  if exists (select 1 from public.products where slug = 'belgian-chocolate-pancakes') then
    update public.products
    set name_ar = 'بان كيك بالشوكولاتة البلجيكية',
        description_en = 'Pancakes topped with Belgian chocolate.',
        description_ar = 'بان كيك مغطى بالشوكولاتة البلجيكية.'
    where slug = 'belgian-chocolate-pancakes'
      and (name_ar = 'بان كيك شوكولا بلجيكية' or name_ar = 'بان كيك بالشوكولاتة البلجيكية')
      and (description_en = 'Pancake topped with premium Belgian chocolate.' or description_en = 'Pancakes topped with Belgian chocolate.')
      and (description_ar = 'شوكولا بلجيكية فاخرة.' or description_ar = 'بان كيك مغطى بالشوكولاتة البلجيكية.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/belgian-chocolate-pancakes'; end if;
  end if;

  -- products: white-chocolate-pancakes
  if exists (select 1 from public.products where slug = 'white-chocolate-pancakes') then
    update public.products
    set name_ar = 'بان كيك بالشوكولاتة البيضاء',
        description_en = 'Pancakes topped with white chocolate.',
        description_ar = 'بان كيك مغطى بالشوكولاتة البيضاء.'
    where slug = 'white-chocolate-pancakes'
      and (name_ar = 'بان كيك شوكولا بيضاء' or name_ar = 'بان كيك بالشوكولاتة البيضاء')
      and (description_en = 'Pancake topped with Premium white chocolate.' or description_en = 'Pancakes topped with white chocolate.')
      and (description_ar = 'شوكولا بيضاء فاخرة.' or description_ar = 'بان كيك مغطى بالشوكولاتة البيضاء.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/white-chocolate-pancakes'; end if;
  end if;

  -- products: dark-chocolate-pancakes
  if exists (select 1 from public.products where slug = 'dark-chocolate-pancakes') then
    update public.products
    set name_ar = 'بان كيك بالشوكولاتة الداكنة',
        description_en = 'Pancakes topped with dark chocolate.',
        description_ar = 'بان كيك مغطى بالشوكولاتة الداكنة.'
    where slug = 'dark-chocolate-pancakes'
      and (name_ar = 'بان كيك شوكولا داكنة' or name_ar = 'بان كيك بالشوكولاتة الداكنة')
      and (description_en = 'Pancake topped with Dark chocolate.' or description_en = 'Pancakes topped with dark chocolate.')
      and (description_ar = 'شوكولا داكنة.' or description_ar = 'بان كيك مغطى بالشوكولاتة الداكنة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/dark-chocolate-pancakes'; end if;
  end if;

  -- products: creamy-profiteroles
  if exists (select 1 from public.products where slug = 'creamy-profiteroles') then
    update public.products
    set name_en = 'Cream-Filled Profiteroles',
        name_ar = 'بروفيترول بالكريمة',
        description_en = 'Five profiteroles filled with pastry cream, served with strawberries and your choice of sauce.',
        description_ar = 'خمس قطع بروفيترول محشوة بكريمة الحلواني، تقدم مع الفراولة وصلصة من اختيارك.'
    where slug = 'creamy-profiteroles'
      and (name_en = 'Creamy Profiteroles' or name_en = 'Cream-Filled Profiteroles')
      and (name_ar = 'بروفيترول بالكريما' or name_ar = 'بروفيترول بالكريمة')
      and (description_en = '5 profiteroles filled with crème pâtissier, and strawberries topped with chocolate of your choice.' or description_en = 'Five profiteroles filled with pastry cream, served with strawberries and your choice of sauce.')
      and (description_ar = 'محشي كريما باتيسيير، مع فريز والشوكولا اللي بتختارها.' or description_ar = 'خمس قطع بروفيترول محشوة بكريمة الحلواني، تقدم مع الفراولة وصلصة من اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/creamy-profiteroles'; end if;
  end if;

  -- products: pistachio-ice-cream-rolls
  if exists (select 1 from public.products where slug = 'pistachio-ice-cream-rolls') then
    update public.products
    set name_ar = 'لفائف آيس كريم بالفستق الحلبي',
        description_en = 'Freshly prepared ice cream rolls with pistachio.',
        description_ar = 'لفائف آيس كريم بالفستق الحلبي تحضر طازجة.'
    where slug = 'pistachio-ice-cream-rolls'
      and (name_ar = 'آيس كريم رولز فستق' or name_ar = 'لفائف آيس كريم بالفستق الحلبي')
      and (description_en = 'Pistachio, rolled fresh.' or description_en = 'Freshly prepared ice cream rolls with pistachio.')
      and (description_ar = 'فستق حلبي، بينلفّ طازة.' or description_ar = 'لفائف آيس كريم بالفستق الحلبي تحضر طازجة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/pistachio-ice-cream-rolls'; end if;
  end if;

  -- products: ice-cream-profiteroles
  if exists (select 1 from public.products where slug = 'ice-cream-profiteroles') then
    update public.products
    set description_en = 'Five profiteroles filled with vanilla ice cream and topped with your choice of sauce.',
        description_ar = 'خمس قطع بروفيترول محشوة بآيس كريم الفانيليا ومغطاة بصلصة من اختيارك.'
    where slug = 'ice-cream-profiteroles'
      and (description_en = '5 profiteroles filled with vanilla ice cream topped with the chocolate of your choice.' or description_en = 'Five profiteroles filled with vanilla ice cream and topped with your choice of sauce.')
      and (description_ar = 'محشي آيس كريم فانيلا، مع الشوكولا اللي بتختارها.' or description_ar = 'خمس قطع بروفيترول محشوة بآيس كريم الفانيليا ومغطاة بصلصة من اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/ice-cream-profiteroles'; end if;
  end if;

  -- products: nutella-ice-cream-rolls
  if exists (select 1 from public.products where slug = 'nutella-ice-cream-rolls') then
    update public.products
    set name_en = 'Ice Cream Rolls (Three Flavors)',
        name_ar = 'لفائف آيس كريم بثلاث نكهات',
        description_en = 'Freshly prepared ice cream rolls combining three flavors of your choice.',
        description_ar = 'لفائف آيس كريم تحضر طازجة وتجمع ثلاث نكهات من اختيارك.'
    where slug = 'nutella-ice-cream-rolls'
      and (name_en = 'Three Flavors Ice Cream Rolls' or name_en = 'Ice Cream Rolls (Three Flavors)')
      and (name_ar = 'آيس كريم رولز بثلاث نكهات' or name_ar = 'لفائف آيس كريم بثلاث نكهات')
      and (description_en = '' or description_en = 'Freshly prepared ice cream rolls combining three flavors of your choice.')
      and (description_ar = '' or description_ar = 'لفائف آيس كريم تحضر طازجة وتجمع ثلاث نكهات من اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/nutella-ice-cream-rolls'; end if;
  end if;

  -- products: san-sebastian-cheesecake
  if exists (select 1 from public.products where slug = 'san-sebastian-cheesecake') then
    update public.products
    set description_en = 'Creamy Basque cheesecake with a caramelized top.',
        description_ar = 'تشيز كيك باسكي بقوام كريمي وسطح مكرمل.'
    where slug = 'san-sebastian-cheesecake'
      and (description_en = 'Creamy Basque cheesecake with a caramelised top.' or description_en = 'Creamy Basque cheesecake with a caramelized top.')
      and (description_ar = 'تشيز كيك باسكي كريمي بوجه مكرمل.' or description_ar = 'تشيز كيك باسكي بقوام كريمي وسطح مكرمل.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/san-sebastian-cheesecake'; end if;
  end if;

  -- products: strawberry-bowl
  if exists (select 1 from public.products where slug = 'strawberry-bowl') then
    update public.products
    set name_ar = 'طبق الفراولة',
        description_en = 'A dessert bowl with fresh strawberries.',
        description_ar = 'طبق حلوى مع فراولة طازجة.'
    where slug = 'strawberry-bowl'
      and (name_ar = 'بول فريز' or name_ar = 'طبق الفراولة')
      and (description_en = 'Fresh strawberries by the spoonful.' or description_en = 'A dessert bowl with fresh strawberries.')
      and (description_ar = 'فريز طازة بالمعلقة.' or description_ar = 'طبق حلوى مع فراولة طازجة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/strawberry-bowl'; end if;
  end if;

  -- products: marshmallow-bowl
  if exists (select 1 from public.products where slug = 'marshmallow-bowl') then
    update public.products
    set name_ar = 'طبق المارشميلو',
        description_en = 'A dessert bowl with marshmallows.',
        description_ar = 'طبق حلوى مع المارشميلو.'
    where slug = 'marshmallow-bowl'
      and (name_ar = 'بول مارشميلو' or name_ar = 'طبق المارشميلو')
      and (description_en = 'Loaded with marshmallows.' or description_en = 'A dessert bowl with marshmallows.')
      and (description_ar = 'مليان مارشميلو.' or description_ar = 'طبق حلوى مع المارشميلو.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/marshmallow-bowl'; end if;
  end if;

  -- products: fruity-bowl
  if exists (select 1 from public.products where slug = 'fruity-bowl') then
    update public.products
    set name_en = 'Fruit Bowl',
        name_ar = 'طبق الفواكه',
        description_en = 'A dessert bowl with mixed fresh fruit.',
        description_ar = 'طبق حلوى مع فواكه طازجة مشكلة.'
    where slug = 'fruity-bowl'
      and (name_en = 'Fruity Bowl' or name_en = 'Fruit Bowl')
      and (name_ar = 'بول فواكه' or name_ar = 'طبق الفواكه')
      and (description_en = 'Fresh fruit, front and centre.' or description_en = 'A dessert bowl with mixed fresh fruit.')
      and (description_ar = 'فواكه طازة على كيفك.' or description_ar = 'طبق حلوى مع فواكه طازجة مشكلة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/fruity-bowl'; end if;
  end if;

  -- products: dubai-bowl
  if exists (select 1 from public.products where slug = 'dubai-bowl') then
    update public.products
    set name_ar = 'طبق دبي',
        description_en = 'A Dubai-style dessert bowl with pistachio and kunafa.',
        description_ar = 'طبق حلوى على طريقة دبي بالفستق الحلبي والكنافة.'
    where slug = 'dubai-bowl'
      and (name_ar = 'بول دبي' or name_ar = 'طبق دبي')
      and (description_en = 'Pistachio and kunafa, Dubai style.' or description_en = 'A Dubai-style dessert bowl with pistachio and kunafa.')
      and (description_ar = 'فستق وكنافة، على طريقة دبي.' or description_ar = 'طبق حلوى على طريقة دبي بالفستق الحلبي والكنافة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/dubai-bowl'; end if;
  end if;

  -- products: bueno-bowl
  if exists (select 1 from public.products where slug = 'bueno-bowl') then
    update public.products
    set name_ar = 'طبق بوينو',
        description_en = 'A dessert bowl with Kinder Bueno.',
        description_ar = 'طبق حلوى مع كيندر بوينو.'
    where slug = 'bueno-bowl'
      and (name_ar = 'بول بوينو' or name_ar = 'طبق بوينو')
      and (description_en = 'Loaded with Kinder Bueno.' or description_en = 'A dessert bowl with Kinder Bueno.')
      and (description_ar = 'مليان كيندر بوينو.' or description_ar = 'طبق حلوى مع كيندر بوينو.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/bueno-bowl'; end if;
  end if;

  -- products: sweet-spot-box
  if exists (select 1 from public.products where slug = 'sweet-spot-box') then
    update public.products
    set description_en = 'Waffle bites, crêpe rolls, pancakes, brownies, profiteroles and strawberries, served with four dipping sauces.',
        description_ar = 'قطع وافل ولفائف كريب وبان كيك وبراوني وبروفيترول وفراولة، تقدم مع أربع صلصات للتغميس.'
    where slug = 'sweet-spot-box'
      and (description_en = 'A bit of everything: waffle bites, crêpe rolls, pancakes, brownies, profiteroles and strawberries, with four dips.' or description_en = 'Waffle bites, crêpe rolls, pancakes, brownies, profiteroles and strawberries, served with four dipping sauces.')
      and (description_ar = 'شوي من كل شي: قطع وافل، لفّات كريب، بان كيك، براوني، بروفيترول وفريز، مع 4 صوصات للتغميس.' or description_ar = 'قطع وافل ولفائف كريب وبان كيك وبراوني وبروفيترول وفراولة، تقدم مع أربع صلصات للتغميس.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/sweet-spot-box'; end if;
  end if;

  -- products: tri-box
  if exists (select 1 from public.products where slug = 'tri-box') then
    update public.products
    set description_ar = 'كريب بالفستق الحلبي وكريب فيتوتشيني وكريب لوتس في علبة واحدة.'
    where slug = 'tri-box'
      and (description_ar = 'كريب فستق، فيتوتشيني ولوتس بعلبة وحدة.' or description_ar = 'كريب بالفستق الحلبي وكريب فيتوتشيني وكريب لوتس في علبة واحدة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/tri-box'; end if;
  end if;

  -- products: strawberry-box
  if exists (select 1 from public.products where slug = 'strawberry-box') then
    update public.products
    set name_ar = 'علبة الفراولة',
        description_en = 'Fresh strawberries served with chocolate.',
        description_ar = 'فراولة طازجة تقدم مع الشوكولاتة.'
    where slug = 'strawberry-box'
      and (name_ar = 'علبة فريز' or name_ar = 'علبة الفراولة')
      and (description_en = 'Fresh strawberries with chocolate.' or description_en = 'Fresh strawberries served with chocolate.')
      and (description_ar = 'فريز طازة مع شوكولا.' or description_ar = 'فراولة طازجة تقدم مع الشوكولاتة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/strawberry-box'; end if;
  end if;

  -- products: strawberry-milkshake
  if exists (select 1 from public.products where slug = 'strawberry-milkshake') then
    update public.products
    set name_ar = 'ميلك شيك بالفراولة',
        description_en = 'A thick, chilled strawberry milkshake.',
        description_ar = 'ميلك شيك بارد وكثيف بالفراولة.'
    where slug = 'strawberry-milkshake'
      and (name_ar = 'ميلك شيك فريز' or name_ar = 'ميلك شيك بالفراولة')
      and (description_en = 'Thick, cold and full of strawberries.' or description_en = 'A thick, chilled strawberry milkshake.')
      and (description_ar = 'كثيف، بارد ومليان فريز.' or description_ar = 'ميلك شيك بارد وكثيف بالفراولة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/strawberry-milkshake'; end if;
  end if;

  -- products: oreo-milkshake
  if exists (select 1 from public.products where slug = 'oreo-milkshake') then
    update public.products
    set description_en = 'A creamy milkshake with Oreo cookies.',
        description_ar = 'ميلك شيك كريمي مع بسكويت أوريو.'
    where slug = 'oreo-milkshake'
      and (description_en = 'Cookies and cream in a cup.' or description_en = 'A creamy milkshake with Oreo cookies.')
      and (description_ar = 'كوكيز وكريمة بكاسة.' or description_ar = 'ميلك شيك كريمي مع بسكويت أوريو.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/oreo-milkshake'; end if;
  end if;

  -- products: lotus-milkshake
  if exists (select 1 from public.products where slug = 'lotus-milkshake') then
    update public.products
    set description_en = 'A thick milkshake with Lotus Biscoff flavor.',
        description_ar = 'ميلك شيك كثيف بنكهة لوتس بيسكوف.'
    where slug = 'lotus-milkshake'
      and (description_en = 'Lotus Biscoff, blended thick.' or description_en = 'A thick milkshake with Lotus Biscoff flavor.')
      and (description_ar = 'لوتس بيسكوف، مخفوق كثيف.' or description_ar = 'ميلك شيك كثيف بنكهة لوتس بيسكوف.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/lotus-milkshake'; end if;
  end if;

  -- products: chocolate-milkshake
  if exists (select 1 from public.products where slug = 'chocolate-milkshake') then
    update public.products
    set name_ar = 'ميلك شيك بالشوكولاتة',
        description_en = 'A thick chocolate milkshake with a rich flavor.',
        description_ar = 'ميلك شيك كثيف بالشوكولاتة ونكهة غنية.'
    where slug = 'chocolate-milkshake'
      and (name_ar = 'ميلك شيك شوكولا' or name_ar = 'ميلك شيك بالشوكولاتة')
      and (description_en = 'Rich chocolate, blended thick.' or description_en = 'A thick chocolate milkshake with a rich flavor.')
      and (description_ar = 'شوكولا غنية، مخفوقة كثيف.' or description_ar = 'ميلك شيك كثيف بالشوكولاتة ونكهة غنية.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/chocolate-milkshake'; end if;
  end if;

  -- products: caramel-milkshake
  if exists (select 1 from public.products where slug = 'caramel-milkshake') then
    update public.products
    set name_ar = 'ميلك شيك بالكراميل',
        description_en = 'A smooth, chilled caramel milkshake.',
        description_ar = 'ميلك شيك بارد بالكراميل وقوام ناعم.'
    where slug = 'caramel-milkshake'
      and (name_ar = 'ميلك شيك كراميل' or name_ar = 'ميلك شيك بالكراميل')
      and (description_en = 'Smooth caramel, blended cold.' or description_en = 'A smooth, chilled caramel milkshake.')
      and (description_ar = 'كراميل ناعم، مخفوق بارد.' or description_ar = 'ميلك شيك بارد بالكراميل وقوام ناعم.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/caramel-milkshake'; end if;
  end if;

  -- products: strawberry-smoothie
  if exists (select 1 from public.products where slug = 'strawberry-smoothie') then
    update public.products
    set name_ar = 'سموذي بالفراولة',
        description_en = 'Fresh strawberries blended into a chilled smoothie.',
        description_ar = 'سموذي بارد محضر من الفراولة الطازجة.'
    where slug = 'strawberry-smoothie'
      and (name_ar = 'سموذي فريز' or name_ar = 'سموذي بالفراولة')
      and (description_en = 'Fresh strawberries, blended.' or description_en = 'Fresh strawberries blended into a chilled smoothie.')
      and (description_ar = 'فريز طازة مخفوقة.' or description_ar = 'سموذي بارد محضر من الفراولة الطازجة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/strawberry-smoothie'; end if;
  end if;

  -- products: mango-smoothie
  if exists (select 1 from public.products where slug = 'mango-smoothie') then
    update public.products
    set name_ar = 'سموذي بالمانجو',
        description_en = 'Ripe mango blended into a smooth, chilled drink.',
        description_ar = 'مانجو ناضجة تمزج لتحضير مشروب بارد بقوام ناعم.'
    where slug = 'mango-smoothie'
      and (name_ar = 'سموذي مانغو' or name_ar = 'سموذي بالمانجو')
      and (description_en = 'Ripe mango, blended smooth.' or description_en = 'Ripe mango blended into a smooth, chilled drink.')
      and (description_ar = 'مانغو ناضجة، مخفوقة ناعمة.' or description_ar = 'مانجو ناضجة تمزج لتحضير مشروب بارد بقوام ناعم.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/mango-smoothie'; end if;
  end if;

  -- products: coconut-mango-smoothie
  if exists (select 1 from public.products where slug = 'coconut-mango-smoothie') then
    update public.products
    set name_en = 'Mango & Coconut Smoothie',
        name_ar = 'سموذي بالمانجو وجوز الهند',
        description_en = 'A chilled smoothie with mango and coconut.',
        description_ar = 'سموذي بارد بالمانجو وجوز الهند.'
    where slug = 'coconut-mango-smoothie'
      and (name_en = 'Coconut Mango Smoothie' or name_en = 'Mango & Coconut Smoothie')
      and (name_ar = 'سموذي جوز الهند ومانغو' or name_ar = 'سموذي بالمانجو وجوز الهند')
      and (description_en = 'Mango and coconut, tropical and cold.' or description_en = 'A chilled smoothie with mango and coconut.')
      and (description_ar = 'مانغو وجوز الهند، استوائي وبارد.' or description_ar = 'سموذي بارد بالمانجو وجوز الهند.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/coconut-mango-smoothie'; end if;
  end if;

  -- products: berry-smoothie
  if exists (select 1 from public.products where slug = 'berry-smoothie') then
    update public.products
    set name_ar = 'سموذي بالتوت',
        description_en = 'A chilled smoothie with mixed berries.',
        description_ar = 'سموذي بارد بالتوت المشكل.'
    where slug = 'berry-smoothie'
      and (name_ar = 'سموذي توت' or name_ar = 'سموذي بالتوت')
      and (description_en = 'Mixed berries, blended cold.' or description_en = 'A chilled smoothie with mixed berries.')
      and (description_ar = 'توت مشكّل، مخفوق بارد.' or description_ar = 'سموذي بارد بالتوت المشكل.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/berry-smoothie'; end if;
  end if;

  -- products: strawberry-mojito
  if exists (select 1 from public.products where slug = 'strawberry-mojito') then
    update public.products
    set name_ar = 'موهيتو بالفراولة',
        description_en = 'A chilled mojito-style drink with strawberry flavor.',
        description_ar = 'مشروب بارد على طريقة الموهيتو بنكهة الفراولة.'
    where slug = 'strawberry-mojito'
      and (name_ar = 'موهيتو فريز' or name_ar = 'موهيتو بالفراولة')
      and (description_en = 'Strawberry, mojito style.' or description_en = 'A chilled mojito-style drink with strawberry flavor.')
      and (description_ar = 'فريز، على طريقة الموهيتو.' or description_ar = 'مشروب بارد على طريقة الموهيتو بنكهة الفراولة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/strawberry-mojito'; end if;
  end if;

  -- products: passion-mojito
  if exists (select 1 from public.products where slug = 'passion-mojito') then
    update public.products
    set name_en = 'Passion Fruit Mojito',
        description_en = 'A chilled mojito-style drink with passion fruit flavor.',
        description_ar = 'مشروب بارد على طريقة الموهيتو بنكهة الباشن فروت.'
    where slug = 'passion-mojito'
      and (name_en = 'Passion Mojito' or name_en = 'Passion Fruit Mojito')
      and (description_en = 'Passion fruit, mojito style.' or description_en = 'A chilled mojito-style drink with passion fruit flavor.')
      and (description_ar = 'باشن فروت، على طريقة الموهيتو.' or description_ar = 'مشروب بارد على طريقة الموهيتو بنكهة الباشن فروت.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/passion-mojito'; end if;
  end if;

  -- products: mangotic
  if exists (select 1 from public.products where slug = 'mangotic') then
    update public.products
    set description_en = 'A chilled mango-flavored mixed drink.',
        description_ar = 'مشروب بارد مشكل بنكهة المانجو.'
    where slug = 'mangotic'
      and (description_en = 'Mango, tropical and chilled.' or description_en = 'A chilled mango-flavored mixed drink.')
      and (description_ar = 'مانغو استوائية ومبرّدة.' or description_ar = 'مشروب بارد مشكل بنكهة المانجو.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/mangotic'; end if;
  end if;

  -- products: hyper-kiwi
  if exists (select 1 from public.products where slug = 'hyper-kiwi') then
    update public.products
    set description_en = 'A chilled kiwi-flavored mixed drink.',
        description_ar = 'مشروب بارد مشكل بنكهة الكيوي.'
    where slug = 'hyper-kiwi'
      and (description_en = 'Kiwi, cold and zesty.' or description_en = 'A chilled kiwi-flavored mixed drink.')
      and (description_ar = 'كيوي بارد ومنعش.' or description_ar = 'مشروب بارد مشكل بنكهة الكيوي.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/hyper-kiwi'; end if;
  end if;

  -- products: blue-ocean
  if exists (select 1 from public.products where slug = 'blue-ocean') then
    update public.products
    set description_en = 'A refreshing blue mixed drink, served chilled.',
        description_ar = 'مشروب أزرق مشكل ومنعش، يقدم باردا.'
    where slug = 'blue-ocean'
      and (description_en = 'Cool, bright and blue.' or description_en = 'A refreshing blue mixed drink, served chilled.')
      and (description_ar = 'بارد، منعش وأزرق.' or description_ar = 'مشروب أزرق مشكل ومنعش، يقدم باردا.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/blue-ocean'; end if;
  end if;

  -- products: blue-hawaii
  if exists (select 1 from public.products where slug = 'blue-hawaii') then
    update public.products
    set description_en = 'A chilled tropical-style mixed drink.',
        description_ar = 'مشروب بارد مشكل بطابع استوائي.'
    where slug = 'blue-hawaii'
      and (description_en = 'Tropical and ice-cold.' or description_en = 'A chilled tropical-style mixed drink.')
      and (description_ar = 'استوائي ومتلّج.' or description_ar = 'مشروب بارد مشكل بطابع استوائي.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/blue-hawaii'; end if;
  end if;

  -- products: orange-juice
  if exists (select 1 from public.products where slug = 'orange-juice') then
    update public.products
    set name_ar = 'عصير برتقال طازج',
        description_en = 'Freshly squeezed orange juice.',
        description_ar = 'عصير برتقال معصور طازجا.'
    where slug = 'orange-juice'
      and (name_ar = 'عصير برتقال طازة' or name_ar = 'عصير برتقال طازج')
      and (description_en = 'Freshly squeezed.' or description_en = 'Freshly squeezed orange juice.')
      and (description_ar = 'معصور طازة.' or description_ar = 'عصير برتقال معصور طازجا.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/orange-juice'; end if;
  end if;

  -- products: water
  if exists (select 1 from public.products where slug = 'water') then
    update public.products
    set description_en = 'Bottled water.',
        description_ar = 'عبوة مياه.'
    where slug = 'water'
      and (description_en = 'A bottle of water.' or description_en = 'Bottled water.')
      and (description_ar = 'قنينة مياه.' or description_ar = 'عبوة مياه.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/water'; end if;
  end if;

  -- products: fruity-ice-cream-rolls
  if exists (select 1 from public.products where slug = 'fruity-ice-cream-rolls') then
    update public.products
    set name_en = 'Ice Cream Rolls (One Flavor)',
        name_ar = 'لفائف آيس كريم بنكهة واحدة',
        description_en = 'Freshly prepared ice cream rolls with one flavor of your choice.',
        description_ar = 'لفائف آيس كريم تحضر طازجة بنكهة واحدة من اختيارك.'
    where slug = 'fruity-ice-cream-rolls'
      and (name_en = 'One Flavor Ice Cream Rolls' or name_en = 'Ice Cream Rolls (One Flavor)')
      and (name_ar = 'آيس كريم رولز بنكهة واحدة' or name_ar = 'لفائف آيس كريم بنكهة واحدة')
      and (description_en = 'Rolled into cold, creamy ice cream.' or description_en = 'Freshly prepared ice cream rolls with one flavor of your choice.')
      and (description_ar = '' or description_ar = 'لفائف آيس كريم تحضر طازجة بنكهة واحدة من اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/fruity-ice-cream-rolls'; end if;
  end if;

  -- products: crunchy-bowl
  if exists (select 1 from public.products where slug = 'crunchy-bowl') then
    update public.products
    set name_ar = 'طبق الحلوى المقرمش',
        description_en = 'A dessert bowl with chocolate, strawberries and a crunchy finish.',
        description_ar = 'طبق حلوى بالشوكولاتة والفراولة مع لمسة مقرمشة.'
    where slug = 'crunchy-bowl'
      and (name_ar = 'بول كرانشي' or name_ar = 'طبق الحلوى المقرمش')
      and (description_en = 'Chocolate, strawberries and plenty of crunch.' or description_en = 'A dessert bowl with chocolate, strawberries and a crunchy finish.')
      and (description_ar = 'شوكولا، فريز وكتير قرمشة.' or description_ar = 'طبق حلوى بالشوكولاتة والفراولة مع لمسة مقرمشة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/crunchy-bowl'; end if;
  end if;

  -- products: lotus-ice-cream-rolls
  if exists (select 1 from public.products where slug = 'lotus-ice-cream-rolls') then
    update public.products
    set name_en = 'Ice Cream Rolls (Two Flavors)',
        name_ar = 'لفائف آيس كريم بنكهتين',
        description_en = 'Freshly prepared ice cream rolls combining two flavors of your choice.',
        description_ar = 'لفائف آيس كريم تحضر طازجة وتجمع نكهتين من اختيارك.'
    where slug = 'lotus-ice-cream-rolls'
      and (name_en = 'Two Flavors Ice Cream Rolls' or name_en = 'Ice Cream Rolls (Two Flavors)')
      and (name_ar = 'آيس كريم رولز بنكهتين' or name_ar = 'لفائف آيس كريم بنكهتين')
      and (description_en = '' or description_en = 'Freshly prepared ice cream rolls combining two flavors of your choice.')
      and (description_ar = '' or description_ar = 'لفائف آيس كريم تحضر طازجة وتجمع نكهتين من اختيارك.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/lotus-ice-cream-rolls'; end if;
  end if;

  -- products: dubai-crepe
  if exists (select 1 from public.products where slug = 'dubai-crepe') then
    update public.products
    set description_en = 'Crêpe filled with pistachio cream and crispy kunafa, topped with Belgian chocolate and served with vanilla ice cream.',
        description_ar = 'كريب محشو بكريمة الفستق الحلبي والكنافة المقرمشة، مغطى بالشوكولاتة البلجيكية ويقدم مع آيس كريم الفانيليا.'
    where slug = 'dubai-crepe'
      and (description_en = 'Crepe stuffed in premium pistachio cream and crispy kunafa topped with belgian chocolate served with a side of vanilla ice cream' or description_en = 'Crêpe filled with pistachio cream and crispy kunafa, topped with Belgian chocolate and served with vanilla ice cream.')
      and (description_ar = 'كريمة فستق، كنافة مقرمشة وشوكولا.' or description_ar = 'كريب محشو بكريمة الفستق الحلبي والكنافة المقرمشة، مغطى بالشوكولاتة البلجيكية ويقدم مع آيس كريم الفانيليا.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/dubai-crepe'; end if;
  end if;

  -- products: dark-chocolate-crepe
  if exists (select 1 from public.products where slug = 'dark-chocolate-crepe') then
    update public.products
    set name_ar = 'كريب بالشوكولاتة الداكنة',
        description_en = 'Crêpe topped with dark chocolate.',
        description_ar = 'كريب مغطى بالشوكولاتة الداكنة.'
    where slug = 'dark-chocolate-crepe'
      and (name_ar = 'كريب شوكولا داكنة' or name_ar = 'كريب بالشوكولاتة الداكنة')
      and (description_en = 'Crêpe topped with Dark chocolate.' or description_en = 'Crêpe topped with dark chocolate.')
      and (description_ar = 'شوكولا داكنة.' or description_ar = 'كريب مغطى بالشوكولاتة الداكنة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/dark-chocolate-crepe'; end if;
  end if;

  -- products: brownie-crepe-sandwich
  if exists (select 1 from public.products where slug = 'brownie-crepe-sandwich') then
    update public.products
    set name_ar = 'ساندويتش كريب بالبراوني',
        description_en = 'Crêpe filled with brownies, strawberries, banana, pastry cream and white chocolate, with a chocolate topping.',
        description_ar = 'كريب محشو بالبراوني والفراولة والموز وكريمة الحلواني والشوكولاتة البيضاء، مع تغطية من الشوكولاتة.'
    where slug = 'brownie-crepe-sandwich'
      and (name_ar = 'ساندويش كريب براوني' or name_ar = 'ساندويتش كريب بالبراوني')
      and (description_en = 'Crêpe stuffed with brownies, strawberry, banana, crème pâtissière and white chocolate and topped with chocolate of your choice.' or description_en = 'Crêpe filled with brownies, strawberries, banana, pastry cream and white chocolate, with a chocolate topping.')
      and (description_ar = 'براوني مع فريز، موز، كريما باتيسيير وشوكولا بيضاء.' or description_ar = 'كريب محشو بالبراوني والفراولة والموز وكريمة الحلواني والشوكولاتة البيضاء، مع تغطية من الشوكولاتة.');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: products/brownie-crepe-sandwich'; end if;
  end if;

  -- option_groups: chocolate
  if exists (select 1 from public.option_groups where key = 'chocolate') then
    update public.option_groups
    set name_en = 'Sauce',
        name_ar = 'الصلصة'
    where key = 'chocolate'
      and (name_en = 'Chocolate' or name_en = 'Sauce')
      and (name_ar = 'الشوكولا' or name_ar = 'الصلصة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/chocolate'; end if;
  end if;

  -- option_groups: stick
  if exists (select 1 from public.option_groups where key = 'stick') then
    update public.option_groups
    set name_en = 'Coating',
        name_ar = 'التغطية'
    where key = 'stick'
      and (name_en = 'Dipped in' or name_en = 'Coating')
      and (name_ar = 'مغطّسة بـ' or name_ar = 'التغطية');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/stick'; end if;
  end if;

  -- option_groups: stick-premium
  if exists (select 1 from public.option_groups where key = 'stick-premium') then
    update public.option_groups
    set name_en = 'Coating',
        name_ar = 'التغطية'
    where key = 'stick-premium'
      and (name_en = 'Dipped in' or name_en = 'Coating')
      and (name_ar = 'مغطّسة بـ' or name_ar = 'التغطية');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/stick-premium'; end if;
  end if;

  -- option_groups: extra-chocolate
  if exists (select 1 from public.option_groups where key = 'extra-chocolate') then
    update public.option_groups
    set name_en = 'Extra sauce',
        name_ar = 'صلصة إضافية'
    where key = 'extra-chocolate'
      and (name_en = 'Extra chocolate' or name_en = 'Extra sauce')
      and (name_ar = 'شوكولا إضافية' or name_ar = 'صلصة إضافية');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/extra-chocolate'; end if;
  end if;

  -- option_groups: fruit
  if exists (select 1 from public.option_groups where key = 'fruit') then
    update public.option_groups
    set name_ar = 'فواكه طازجة'
    where key = 'fruit'
      and (name_ar = 'فواكه طازة' or name_ar = 'فواكه طازجة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/fruit'; end if;
  end if;

  -- option_groups: bars
  if exists (select 1 from public.option_groups where key = 'bars') then
    update public.option_groups
    set name_en = 'Chocolate, cookies & brownies',
        name_ar = 'شوكولاتة وبسكويت وبراوني'
    where key = 'bars'
      and (name_en = 'Chocolate bars & cookies' or name_en = 'Chocolate, cookies & brownies')
      and (name_ar = 'ألواح شوكولا وبسكويت' or name_ar = 'شوكولاتة وبسكويت وبراوني');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/bars'; end if;
  end if;

  -- option_groups: nuts
  if exists (select 1 from public.option_groups where key = 'nuts') then
    update public.option_groups
    set name_ar = 'مكسرات'
    where key = 'nuts'
      and (name_ar = 'مكسّرات' or name_ar = 'مكسرات');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: option_groups/nuts'; end if;
  end if;

  -- options: white
  if exists (select 1 from public.options where key = 'white' and group_id = (select id from public.option_groups where key = 'chocolate')) then
    update public.options
    set name_ar = 'شوكولاتة بيضاء'
    where key = 'white' and group_id = (select id from public.option_groups where key = 'chocolate')
      and (name_ar = 'شوكولا بيضاء' or name_ar = 'شوكولاتة بيضاء');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/white'; end if;
  end if;

  -- options: lotus
  if exists (select 1 from public.options where key = 'lotus' and group_id = (select id from public.option_groups where key = 'chocolate')) then
    update public.options
    set name_en = 'Lotus spread',
        name_ar = 'كريمة لوتس'
    where key = 'lotus' and group_id = (select id from public.option_groups where key = 'chocolate')
      and (name_en = 'Lotus' or name_en = 'Lotus spread')
      and (name_ar = 'لوتس' or name_ar = 'كريمة لوتس');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/lotus'; end if;
  end if;

  -- options: dark
  if exists (select 1 from public.options where key = 'dark' and group_id = (select id from public.option_groups where key = 'chocolate')) then
    update public.options
    set name_ar = 'شوكولاتة داكنة'
    where key = 'dark' and group_id = (select id from public.option_groups where key = 'chocolate')
      and (name_ar = 'شوكولا داكنة' or name_ar = 'شوكولاتة داكنة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/dark'; end if;
  end if;

  -- options: belgian
  if exists (select 1 from public.options where key = 'belgian' and group_id = (select id from public.option_groups where key = 'chocolate')) then
    update public.options
    set name_ar = 'شوكولاتة بلجيكية'
    where key = 'belgian' and group_id = (select id from public.option_groups where key = 'chocolate')
      and (name_ar = 'شوكولا بلجيكية' or name_ar = 'شوكولاتة بلجيكية');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/belgian'; end if;
  end if;

  -- options: white
  if exists (select 1 from public.options where key = 'white' and group_id = (select id from public.option_groups where key = 'stick')) then
    update public.options
    set name_ar = 'شوكولاتة بيضاء'
    where key = 'white' and group_id = (select id from public.option_groups where key = 'stick')
      and (name_ar = 'شوكولا بيضاء' or name_ar = 'شوكولاتة بيضاء');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/white'; end if;
  end if;

  -- options: lotus
  if exists (select 1 from public.options where key = 'lotus' and group_id = (select id from public.option_groups where key = 'stick')) then
    update public.options
    set name_en = 'Lotus spread',
        name_ar = 'كريمة لوتس'
    where key = 'lotus' and group_id = (select id from public.option_groups where key = 'stick')
      and (name_en = 'Lotus' or name_en = 'Lotus spread')
      and (name_ar = 'لوتس' or name_ar = 'كريمة لوتس');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/lotus'; end if;
  end if;

  -- options: dark
  if exists (select 1 from public.options where key = 'dark' and group_id = (select id from public.option_groups where key = 'stick-premium')) then
    update public.options
    set name_ar = 'شوكولاتة داكنة'
    where key = 'dark' and group_id = (select id from public.option_groups where key = 'stick-premium')
      and (name_ar = 'شوكولا داكنة' or name_ar = 'شوكولاتة داكنة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/dark'; end if;
  end if;

  -- options: belgian
  if exists (select 1 from public.options where key = 'belgian' and group_id = (select id from public.option_groups where key = 'stick-premium')) then
    update public.options
    set name_ar = 'شوكولاتة بلجيكية'
    where key = 'belgian' and group_id = (select id from public.option_groups where key = 'stick-premium')
      and (name_ar = 'شوكولا بلجيكية' or name_ar = 'شوكولاتة بلجيكية');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/belgian'; end if;
  end if;

  -- options: white
  if exists (select 1 from public.options where key = 'white' and group_id = (select id from public.option_groups where key = 'extra-chocolate')) then
    update public.options
    set name_ar = 'شوكولاتة بيضاء'
    where key = 'white' and group_id = (select id from public.option_groups where key = 'extra-chocolate')
      and (name_ar = 'شوكولا بيضاء' or name_ar = 'شوكولاتة بيضاء');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/white'; end if;
  end if;

  -- options: dark
  if exists (select 1 from public.options where key = 'dark' and group_id = (select id from public.option_groups where key = 'extra-chocolate')) then
    update public.options
    set name_ar = 'شوكولاتة داكنة'
    where key = 'dark' and group_id = (select id from public.option_groups where key = 'extra-chocolate')
      and (name_ar = 'شوكولا داكنة' or name_ar = 'شوكولاتة داكنة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/dark'; end if;
  end if;

  -- options: belgian
  if exists (select 1 from public.options where key = 'belgian' and group_id = (select id from public.option_groups where key = 'extra-chocolate')) then
    update public.options
    set name_ar = 'شوكولاتة بلجيكية'
    where key = 'belgian' and group_id = (select id from public.option_groups where key = 'extra-chocolate')
      and (name_ar = 'شوكولا بلجيكية' or name_ar = 'شوكولاتة بلجيكية');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/belgian'; end if;
  end if;

  -- options: strawberry
  if exists (select 1 from public.options where key = 'strawberry' and group_id = (select id from public.option_groups where key = 'fruit')) then
    update public.options
    set name_ar = 'فراولة'
    where key = 'strawberry' and group_id = (select id from public.option_groups where key = 'fruit')
      and (name_ar = 'فريز' or name_ar = 'فراولة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/strawberry'; end if;
  end if;

  -- options: mixed
  if exists (select 1 from public.options where key = 'mixed' and group_id = (select id from public.option_groups where key = 'fruit')) then
    update public.options
    set name_ar = 'فواكه مشكلة'
    where key = 'mixed' and group_id = (select id from public.option_groups where key = 'fruit')
      and (name_ar = 'فواكه مشكّلة' or name_ar = 'فواكه مشكلة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/mixed'; end if;
  end if;

  -- options: rice-vanilla
  if exists (select 1 from public.options where key = 'rice-vanilla' and group_id = (select id from public.option_groups where key = 'toppings')) then
    update public.options
    set name_ar = 'أرز مقرمش بالفانيليا'
    where key = 'rice-vanilla' and group_id = (select id from public.option_groups where key = 'toppings')
      and (name_ar = 'رز مقرمش بالفانيلا' or name_ar = 'أرز مقرمش بالفانيليا');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/rice-vanilla'; end if;
  end if;

  -- options: sprinkles
  if exists (select 1 from public.options where key = 'sprinkles' and group_id = (select id from public.option_groups where key = 'toppings')) then
    update public.options
    set name_ar = 'حبيبات سكر للتزيين'
    where key = 'sprinkles' and group_id = (select id from public.option_groups where key = 'toppings')
      and (name_ar = 'سبرينكلز' or name_ar = 'حبيبات سكر للتزيين');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/sprinkles'; end if;
  end if;

  -- options: vermicelli
  if exists (select 1 from public.options where key = 'vermicelli' and group_id = (select id from public.option_groups where key = 'toppings')) then
    update public.options
    set name_ar = 'حبيبات شوكولاتة للتزيين'
    where key = 'vermicelli' and group_id = (select id from public.option_groups where key = 'toppings')
      and (name_ar = 'شعيرية شوكولا' or name_ar = 'حبيبات شوكولاتة للتزيين');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/vermicelli'; end if;
  end if;

  -- options: rice-chocolate
  if exists (select 1 from public.options where key = 'rice-chocolate' and group_id = (select id from public.option_groups where key = 'toppings')) then
    update public.options
    set name_ar = 'أرز مقرمش بالشوكولاتة'
    where key = 'rice-chocolate' and group_id = (select id from public.option_groups where key = 'toppings')
      and (name_ar = 'رز مقرمش بالشوكولا' or name_ar = 'أرز مقرمش بالشوكولاتة');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/rice-chocolate'; end if;
  end if;

  -- options: kinder-bueno-white
  if exists (select 1 from public.options where key = 'kinder-bueno-white' and group_id = (select id from public.option_groups where key = 'bars')) then
    update public.options
    set name_ar = 'كيندر بوينو بالشوكولاتة البيضاء'
    where key = 'kinder-bueno-white' and group_id = (select id from public.option_groups where key = 'bars')
      and (name_ar = 'كيندر بوينو أبيض' or name_ar = 'كيندر بوينو بالشوكولاتة البيضاء');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/kinder-bueno-white'; end if;
  end if;

  -- options: peanut
  if exists (select 1 from public.options where key = 'peanut' and group_id = (select id from public.option_groups where key = 'nuts')) then
    update public.options
    set name_ar = 'فول سوداني'
    where key = 'peanut' and group_id = (select id from public.option_groups where key = 'nuts')
      and (name_ar = 'فستق عبيد' or name_ar = 'فول سوداني');
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Menu copy changed since review: options/peanut'; end if;
  end if;

end;
$menu_copy$;
