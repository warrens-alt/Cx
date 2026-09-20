const fs = require('fs');
let overview = fs.readFileSync('src/pages/Overview.tsx', 'utf8');
overview = "import { Info, ArrowUpRight, ArrowDownRight, Loader2, Sparkles, TrendingUp, AlertCircle, DollarSign, CheckCircle, PhoneCall, Send, Users } from 'lucide-react';\n" + overview;
fs.writeFileSync('src/pages/Overview.tsx', overview, 'utf8');
