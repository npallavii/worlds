// Healthy Kitchen content: foods, food groups, recipes and friendly, non-judgemental lines.
// Language rule: no food is "bad". Treats are "sometimes foods" that are fine to enjoy;
// a food that isn't in today's recipe is simply "not in this recipe".

export const GROUPS = {
  fruit: { name: 'Fruit', color: '#ff8a8a' },
  veg: { name: 'Vegetable', color: '#7fbf6a' },
  grain: { name: 'Grain', color: '#e9b247' },
  protein: { name: 'Protein', color: '#c98d5a' },
  dairy: { name: 'Dairy', color: '#8ec9f0' },
  treat: { name: 'Sometimes food', color: '#c9a0e8' },
};

export const FOODS = {
  banana: { name: 'banana', plural: 'bananas', group: 'fruit', line: 'Bananas are a fruit, and their peel makes a handy wrapper!' },
  strawberry: { name: 'strawberry', plural: 'strawberries', group: 'fruit', line: 'Strawberries are a fruit with tiny seeds on the outside.' },
  apple: { name: 'apple', plural: 'apples', group: 'fruit', line: 'Apples are a crunchy fruit.' },
  carrot: { name: 'carrot', plural: 'carrots', group: 'veg', line: 'Carrots are a vegetable that grows under the ground.' },
  tomato: { name: 'tomato', plural: 'tomatoes', group: 'veg', line: 'We often cook tomatoes like a vegetable, but they grow like a fruit!' },
  broccoli: { name: 'broccoli', plural: 'broccoli', one: 'piece of broccoli', group: 'veg', line: 'Broccoli is a vegetable that looks like tiny trees.' },
  bread: { name: 'bread', plural: 'slices of bread', one: 'slice of bread', group: 'grain', line: 'Bread is made from grains, like wheat.' },
  cheese: { name: 'cheese', plural: 'slices of cheese', one: 'slice of cheese', group: 'dairy', line: 'Cheese is made from milk.' },
  egg: { name: 'egg', plural: 'eggs', group: 'protein', line: 'Eggs have protein, which helps your muscles grow.' },
  fish: { name: 'fish', plural: 'fish', group: 'protein', line: 'Fish has protein, which helps your body grow strong.' },
  milk: { name: 'milk', plural: 'cartons of milk', one: 'carton of milk', group: 'dairy', line: 'Milk helps build strong bones and teeth.' },
  cookie: { name: 'cookie', plural: 'cookies', group: 'treat', line: 'Cookies are a sometimes food — yummy for special times!' },
  cupcake: { name: 'cupcake', plural: 'cupcakes', group: 'treat', line: 'Cupcakes are a sometimes food, great for a party!' },
};

export const RECIPES = [
  { id: 'fruitsalad', name: 'Rainbow Fruit Salad', items: { banana: 2, strawberry: 2, apple: 1 }, finish: 'Fruits have vitamins that help your body grow and stay healthy.' },
  { id: 'veggiesoup', name: 'Veggie Soup', items: { carrot: 2, tomato: 2, broccoli: 1 }, finish: 'Vegetables come in so many colours, and eating lots of colours is good for you.' },
  { id: 'sandwich', name: 'Picnic Sandwich', items: { bread: 2, cheese: 1, tomato: 1, egg: 1 }, finish: 'This sandwich has food from lots of different food groups. That makes it a balanced meal!' },
];

export const RECIPES_BY_LEVEL = [
  ['fruitsalad', 'veggiesoup'],
  ['veggiesoup', 'sandwich'],
  ['sandwich', 'fruitsalad'],
];

export const getRecipe = (id) => RECIPES.find((r) => r.id === id);

/** "2 bananas", "1 slice of cheese" … */
export const qty = (id, n) => `${n} ${n === 1 ? (FOODS[id].one ?? FOODS[id].name) : FOODS[id].plural}`;

const ART = {
  banana: '<path d="M22 30 C 26 70, 62 86, 90 66 C 94 62, 92 58, 86 60 C 64 72, 40 60, 34 30 Z" fill="#ffd84a" stroke="#e5b62a" stroke-width="3"/><path d="M22 30 l-4 -8" stroke="#7a5638" stroke-width="5" stroke-linecap="round"/>',
  strawberry: '<path d="M50 90 C 20 70, 18 40, 30 32 C 40 26, 60 26, 70 32 C 82 40, 80 70, 50 90 Z" fill="#ff5a6a"/><path d="M34 28 l8 6 8 -10 8 10 8 -6 -6 12 h-20 z" fill="#5fae52"/><g fill="#ffe08a"><circle cx="40" cy="48" r="2"/><circle cx="56" cy="46" r="2"/><circle cx="48" cy="60" r="2"/><circle cx="62" cy="62" r="2"/><circle cx="40" cy="66" r="2"/><circle cx="52" cy="74" r="2"/></g>',
  apple: '<circle cx="50" cy="58" r="30" fill="#ff6b6b"/><path d="M50 30 q2 -10 8 -14" stroke="#7a5638" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="64" cy="22" rx="10" ry="5" fill="#7fc46a" transform="rotate(-20 64 22)"/><ellipse cx="38" cy="48" rx="5" ry="9" fill="#fff" opacity="0.4"/>',
  carrot: '<path d="M30 30 L78 74 Q84 82 76 84 L32 40 Z" fill="#ff9a3c" transform="rotate(10 50 50)"/><path d="M28 30 l-10 -12 M32 26 l-4 -16 M36 28 l8 -14" stroke="#5fae52" stroke-width="5" stroke-linecap="round"/><path d="M44 46 l6 -2 M54 56 l6 -2 M64 66 l5 -2" stroke="#e07a2a" stroke-width="2.5" stroke-linecap="round"/>',
  tomato: '<circle cx="50" cy="56" r="30" fill="#ff5a4a"/><path d="M36 28 l8 6 6 -10 6 10 8 -6 -4 10 h-20 z" fill="#5fae52"/><ellipse cx="38" cy="50" rx="6" ry="9" fill="#fff" opacity="0.35"/>',
  broccoli: '<rect x="44" y="56" width="12" height="32" rx="5" fill="#8fcc6c"/><circle cx="34" cy="44" r="16" fill="#4f9a47"/><circle cx="52" cy="34" r="18" fill="#5fae52"/><circle cx="68" cy="46" r="15" fill="#4f9a47"/><circle cx="50" cy="52" r="14" fill="#6cbf5a"/>',
  bread: '<path d="M18 46 C 18 26, 82 26, 82 46 C 82 54, 76 54, 76 54 V84 H24 V54 C 24 54, 18 54, 18 46 Z" fill="#e9b05a"/><path d="M28 54 V80 H72 V54" fill="#ffe3b0"/>',
  cheese: '<path d="M14 70 L86 48 V80 H14 Z" fill="#ffd84a"/><path d="M14 70 L86 48 L70 36 Z" fill="#ffe680"/><g fill="#e9b72a"><circle cx="34" cy="74" r="5"/><circle cx="58" cy="66" r="4"/><circle cx="74" cy="72" r="3.5"/></g>',
  egg: '<ellipse cx="50" cy="54" rx="26" ry="32" fill="#fffaf0" stroke="#efe2c8" stroke-width="3"/><ellipse cx="42" cy="44" rx="5" ry="8" fill="#fff"/>',
  fish: '<ellipse cx="46" cy="50" rx="30" ry="18" fill="#8ec9f0"/><path d="M74 50 L92 36 L92 64 Z" fill="#6aaedc"/><circle cx="30" cy="46" r="4" fill="#2b2a4c"/><path d="M40 40 q6 10 0 20" stroke="#6aaedc" stroke-width="3" fill="none"/>',
  milk: '<path d="M32 30 L50 18 L68 30 V86 H32 Z" fill="#fffaf0" stroke="#d9e4ef" stroke-width="3"/><rect x="32" y="46" width="36" height="20" fill="#8ec9f0"/><path d="M50 18 V30" stroke="#d9e4ef" stroke-width="3"/>',
  cookie: '<circle cx="50" cy="50" r="32" fill="#d9a05a"/><g fill="#6b4425"><circle cx="38" cy="40" r="4.5"/><circle cx="60" cy="38" r="4"/><circle cx="54" cy="58" r="5"/><circle cx="36" cy="62" r="3.5"/><circle cx="66" cy="62" r="3.5"/></g>',
  cupcake: '<path d="M28 54 L36 88 H64 L72 54 Z" fill="#8ec9f0"/><path d="M30 56 C 18 44, 34 26, 50 28 C 66 26, 82 44, 70 56 Z" fill="#ffb8c8"/><circle cx="50" cy="24" r="6" fill="#ff5a6a"/>',
};

export const foodSvg = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${ART[id] ?? ''}</svg>`;

/** A finished dish: a bowl or plate with the recipe's ingredients piled on top. */
export function mealArt(recipe) {
  const ids = Object.keys(recipe.items);
  const placed = ids.map((id, i) => {
    const x = 18 + (i / Math.max(1, ids.length - 1)) * 64;
    return `<g transform="translate(${x - 16} ${30 + (i % 2) * 8}) scale(0.32)">${ART[id]}</g>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    ${placed}
    <path d="M8 58 H92 C 90 82, 70 92, 50 92 C 30 92, 10 82, 8 58 Z" fill="${recipe.id === 'veggiesoup' ? '#7a86b8' : '#fffaf0'}" stroke="#d9cfbf" stroke-width="3"/>
    <path d="M18 66 q32 10 64 0" stroke="#fff" stroke-width="3" fill="none" opacity="0.6"/>
  </svg>`;
}
