import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
export default function Acquisition() {
  const { search } = useLocation();
  return <PageShell><PageHeader title="Acquisition & Media" description="Financial calculations require verified, consistently scoped costs." />
    <section role="status" className="enterprise-card p-6 space-y-3"><h2 className="font-semibold">Acquisition economics awaiting verification</h2>
      <p>The current warehouse mapping supplies a budget field. It has not been verified as incurred spend or allocated consistently to the selected vendors and sources.</p>
      <p>Spend, campaign profitability and return calculations are withheld rather than presented as confirmed financial results. No contractual rates are assumed.</p>
      <Link to={{ pathname: '/overview', search }} className="underline">View recorded lead and outcome performance</Link>
    </section>
  </PageShell>;
}
