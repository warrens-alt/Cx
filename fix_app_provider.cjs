const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /<FilterProvider>\s*<BrowserRouter>/,
  "<BrowserRouter>\n        <FilterProvider>"
);
app = app.replace(
  /<\/BrowserRouter>\s*<\/FilterProvider>/,
  "</FilterProvider>\n      </BrowserRouter>"
);

fs.writeFileSync('src/App.tsx', app);
