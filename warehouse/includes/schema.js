// Canonical inputs are provided by approved source adapters. No column-name guessing or HLC-counter-to-call conversion.
const fields = {
  leads: { captured_at: 'TIMESTAMP', source: 'STRING', medium: 'STRING' },
  deliveries: { lead_key: 'STRING', vendor: 'STRING', attempted_at: 'TIMESTAMP', delivered_at: 'TIMESTAMP' },
  calls: { delivery_key: 'STRING', event_at: 'TIMESTAMP' },
  sales: { delivery_key: 'STRING', event_at: 'TIMESTAMP' },
  activations: { sale_key: 'STRING', event_at: 'TIMESTAMP' },
  commercial: { sale_key: 'STRING', event_at: 'TIMESTAMP', stage: 'STRING', amount_delta: 'NUMERIC', currency: 'STRING', agreement_version: 'STRING' },
};
const optional = { leads: ['medium'], deliveries: ['delivered_at'], calls: [], sales: [], activations: [], commercial: [] };
module.exports = { fields, optional };
