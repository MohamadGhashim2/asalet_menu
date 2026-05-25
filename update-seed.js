const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateId() {
  return 'item_' + crypto.randomBytes(4).toString('hex');
}
function generateGroupId() {
  return 'group_' + crypto.randomBytes(4).toString('hex');
}
function generateOptId() {
  return 'opt_' + crypto.randomBytes(4).toString('hex');
}

const seedPath = path.join(__dirname, 'data', 'menu-import', 'menu.seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Ensure arrays exist
if (!seedData.option_groups) seedData.option_groups = [];
if (!seedData.options) seedData.options = [];

// Give every item an ID if it doesn't have one
for (const item of seedData.items) {
  if (!item.id) {
    item.id = generateId();
  }
}

// Find categories related to 'طواجن'
const tawajenCategories = seedData.categories.filter(c => c.name.includes('طواجن'));
const tawajenCategoryIds = new Set(tawajenCategories.map(c => c.id));

// Find items in these categories
const tawajenItems = seedData.items.filter(i => tawajenCategoryIds.has(i.category_id));

let newGroups = 0;
let newOptions = 0;

for (const item of tawajenItems) {
  let group = seedData.option_groups.find(g => g.item_id === item.id && g.title === 'الإضافات المدفوعة');
  
  if (!group) {
    group = {
      id: generateGroupId(),
      item_id: item.id,
      title: 'الإضافات المدفوعة',
      kind: 'addon',
      selection_type: 'multiple',
      is_required: false,
      min_select: 0,
      max_select: null,
      sort_order: 0,
      is_active: true
    };
    seedData.option_groups.push(group);
    newGroups++;
  }

  let bigMalawah = seedData.options.find(o => o.group_id === group.id && o.name === 'ملوح كبير (إضافي)');
  if (!bigMalawah) {
    seedData.options.push({
      id: generateOptId(),
      group_id: group.id,
      name: 'ملوح كبير (إضافي)',
      price: 150,
      is_default: false,
      sort_order: 0,
      is_active: true
    });
    newOptions++;
  }

  let smallMalawah = seedData.options.find(o => o.group_id === group.id && o.name === 'ملوح صغير (إضافي)');
  if (!smallMalawah) {
    seedData.options.push({
      id: generateOptId(),
      group_id: group.id,
      name: 'ملوح صغير (إضافي)',
      price: 110,
      is_default: false,
      sort_order: 1,
      is_active: true
    });
    newOptions++;
  }
}

// Clean up the previously bugged group that had undefined item_id
seedData.option_groups = seedData.option_groups.filter(g => g.item_id !== undefined);
seedData.options = seedData.options.filter(o => seedData.option_groups.find(g => g.id === o.group_id));

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`Successfully updated menu.seed.json.`);
console.log(`Added ${newGroups} new option groups.`);
console.log(`Added ${newOptions} new options.`);
