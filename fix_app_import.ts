import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('Zap,')) {
  content = content.replace("} from 'lucide-react';", "  Zap,\n} from 'lucide-react';");
  fs.writeFileSync('src/App.tsx', content);
  console.log("Added Zap import");
}
