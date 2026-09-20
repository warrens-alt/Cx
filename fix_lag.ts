import fs from 'fs';
let content = fs.readFileSync('src/pages/LifecycleLag.tsx', 'utf8');

if (!content.includes('LeadsModal')) {
  content = content.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport { LeadsModal } from '../lib/LeadsModal';\nimport { formatCurrency } from '../lib/utils';");
}

if (!content.includes('modalOpen')) {
  content = content.replace("const [isModalOpen, setIsModalOpen] = useState(false);", `  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDrilldown, setModalDrilldown] = useState('');
  const [modalParams, setModalParams] = useState({});

  const openDrilldown = (type: string, title: string, params: any = {}) => {
    setModalTitle(title);
    setModalDrilldown(type);
    setModalParams(params);
    setModalOpen(true);
  };
`);
}

// Ensure useDataFetch uses useFilters? Wait, useDataFetch already reads from useFilters and appends it!
// It's correct! But we need to add a second useDataFetch for speed-to-lead?
// Or we just add speed-to-lead component into this file.
