const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

// standardise button components
content += `

@layer components {
  .btn-primary {
    @apply h-9 px-4 inline-flex items-center justify-center bg-teal text-white text-[13px] font-medium rounded-md hover:bg-teal-dark transition-colors shadow-sm;
  }
  .btn-secondary {
    @apply h-9 px-4 inline-flex items-center justify-center bg-surface border border-border-strong text-text-main text-[13px] font-medium rounded-md hover:bg-surface-sec transition-colors shadow-sm;
  }
  .btn-icon {
    @apply h-9 w-9 inline-flex items-center justify-center bg-surface border border-border-strong text-text-main rounded-md hover:bg-surface-sec transition-colors shadow-sm;
  }
}
`;

fs.writeFileSync('src/index.css', content);
