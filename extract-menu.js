const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:/Users/mgrm3/Desktop/AsaletMenu_images';
const TARGET_ASSETS_DIR = 'C:/Users/mgrm3/Desktop/FastQrMenu/qur-menu-client/public/menu-assets';
const SEED_FILE = 'C:/Users/mgrm3/Desktop/FastQrMenu/qur-menu-client/data/menu-import/menu.seed.json';

// Make sure target assets dir exists
if (!fs.existsSync(TARGET_ASSETS_DIR)) {
  fs.mkdirSync(TARGET_ASSETS_DIR, { recursive: true });
}

let seedData = {
  categories: [],
  items: []
};

// Map of categories and sort order
const folders = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

let categorySortOrder = 0;
let itemGlobalId = 1;

for (const folder of folders) {
  const categoryPath = path.join(SOURCE_DIR, folder);
  const targetCategoryPath = path.join(TARGET_ASSETS_DIR, folder);
  
  if (!fs.existsSync(targetCategoryPath)) {
    fs.mkdirSync(targetCategoryPath, { recursive: true });
  }

  // Create Category
  const categoryId = `cat_${categorySortOrder}`;
  seedData.categories.push({
    id: categoryId,
    name: folder,
    description: "",
    sort_order: categorySortOrder++
  });

  // Read الاسعار.txt
  const pricesFile = path.join(categoryPath, 'الاسعار.txt');
  let itemsParsed = [];
  if (fs.existsSync(pricesFile)) {
    const text = fs.readFileSync(pricesFile, 'utf8');
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
    
    let itemSortOrder = 0;
    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 2) {
        const name = lines[0];
        const description = lines[1];
        let price = 0;
        if (lines.length >= 3) {
          const priceMatch = lines[2].match(/\d+/);
          if (priceMatch) {
            price = parseInt(priceMatch[0], 10);
          }
        }
        
        itemsParsed.push({
          tempName: name,
          name: name,
          description: description !== name ? description : "",
          base_price: price,
          category_id: categoryId,
          sort_order: itemSortOrder++,
          is_available: true,
          is_featured: false,
          image_url: null
        });
      }
    }
  }

  // Find images
  const files = fs.readdirSync(categoryPath);
  for (const file of files) {
    if (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg')) {
      const fileNameWithoutExt = path.parse(file).name.replace(/_/g, ' ');
      
      // Copy image
      fs.copyFileSync(path.join(categoryPath, file), path.join(targetCategoryPath, file));
      const webUrl = `/menu-assets/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;

      // Try to match with parsed items
      let matchedItem = itemsParsed.find(i => 
        i.tempName && (i.tempName.replace(/_/g, ' ').includes(fileNameWithoutExt) || 
        fileNameWithoutExt.includes(i.tempName.replace(/_/g, ' ')))
      );

      if (matchedItem) {
        matchedItem.image_url = webUrl;
      } else {
        // If not found in text, add it as a new item
        itemsParsed.push({
          name: fileNameWithoutExt,
          description: "",
          base_price: 0,
          category_id: categoryId,
          sort_order: itemsParsed.length,
          is_available: true,
          is_featured: false,
          image_url: webUrl
        });
      }
    }
  }

  // Add to global items
  for (const item of itemsParsed) {
    seedData.items.push({
      name: item.name,
      description: item.description,
      base_price: item.base_price,
      category_id: item.category_id,
      sort_order: item.sort_order,
      is_available: item.is_available,
      is_featured: item.is_featured,
      image_url: item.image_url
    });
  }
}

// Add Add-ons for "طواجن" if needed (skip since user didn't provide specific add-ons, they can do it via admin dashboard)

fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2), 'utf8');
console.log('Successfully generated ' + SEED_FILE);
