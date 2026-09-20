/**
 * OFFICIAL METRIC TAXONOMY & NAMING CONVENTIONS
 * Authoritative single source of truth for all metric terminology, report values,
 * cost metrics, formulas, and waterfall calculations across the application.
 */

export interface MetricTaxonomyItem {
  itemNo: number;
  reportValue: string;
  formattedItemNo: string;
  goal?: string;
  objective?: string;
  okr?: string;
  costMetric: string;
  metric: string;
  costMetricFormula: string;
  waterfallMetricFormula: string;
  revenueMetric?: string;
  costOfRevenueMetric?: string;
  costOfRevenueMetricFormula?: string;
  channel?: string;
}

export const MASTER_TAXONOMY: MetricTaxonomyItem[] = [
  {
    itemNo: 2,
    formattedItemNo: "Impressions - 02.0",
    reportValue: "Impressions",
    goal: "WEB Online",
    objective: "Awareness",
    okr: "Serve your ad as many times as possible",
    costMetric: "CPM",
    metric: "Cost per mille",
    costMetricFormula: "(Total Spend / Total Impressions) * 1000",
    waterfallMetricFormula: "N/A",
    channel: "Facebook, Instagram, GDN, YouTube, PMax, TikTok"
  },
  {
    itemNo: 3,
    formattedItemNo: "Reach - 03.0",
    reportValue: "Reach",
    goal: "WEB Online",
    objective: "Awareness",
    okr: "Reach as many unique people as possible",
    costMetric: "CPM.R",
    metric: "Frequency",
    costMetricFormula: "(Total Spend / Reach) * 1000",
    waterfallMetricFormula: "Impressions / Reach",
    channel: "Facebook, Instagram, GDN, YouTube, PMax, TikTok, Whatsapp"
  },
  {
    itemNo: 4,
    formattedItemNo: "Ad Recall - 04.0",
    reportValue: "Ad Recall",
    goal: "WEB Online",
    objective: "Awareness",
    okr: "Get as many people to remember your ad.",
    costMetric: "CP.Recall",
    metric: "Ad recall rate",
    costMetricFormula: "Total Spend / Total Ad Recallers",
    waterfallMetricFormula: "(Ad Recallers / Total Reach) * 100",
    channel: "Facebook, Instagram, GDN, YouTube, PMax"
  },
  {
    itemNo: 5,
    formattedItemNo: "Engagement - 05.0",
    reportValue: "Engagement",
    goal: "WEB Online",
    objective: "Consideration",
    okr: "Get as many engagements as possible",
    costMetric: "CPE",
    metric: "Engagement Rate",
    costMetricFormula: "Total Spend / Engagements",
    waterfallMetricFormula: "(Engagements / Reach) * 100",
    channel: "Facebook, Instagram, GDN, YouTube, PMax, TikTok"
  },
  {
    itemNo: 6,
    formattedItemNo: 'Video Views (5""+ Play) (20% Viewable) - 06.0',
    reportValue: 'Video Views (5""+ Play) (20% Viewable)',
    goal: "WEB Online",
    objective: "Consideration",
    okr: "Get as many video views as possible",
    costMetric: "CP.View",
    metric: "Video view rate",
    costMetricFormula: "Spend / Video Views",
    waterfallMetricFormula: "(Video Views / Reach) * 100",
    channel: "Facebook, Instagram, YouTube, TikTok, Google Ads"
  },
  {
    itemNo: 7,
    formattedItemNo: "Page Like - 07.0",
    reportValue: "Page Like",
    goal: "WEB Online",
    objective: "Consideration",
    okr: "Get as many page likes as possible",
    costMetric: "CP.PageLike",
    metric: "Page like rate",
    costMetricFormula: "Total Spend / Page Likes",
    waterfallMetricFormula: "(Page Likes / Reach) * 100",
    channel: "Facebook"
  },
  {
    itemNo: 8,
    formattedItemNo: "Clicks - 08.0",
    reportValue: "Clicks",
    goal: "WEB Online",
    objective: "Consideration",
    okr: "Get as many clicks as possible",
    costMetric: "CPC",
    metric: "Click through rate (CTR)",
    costMetricFormula: "Spend / All Clicks",
    waterfallMetricFormula: "(All Clicks / Reach) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 9,
    formattedItemNo: "Outbound Clicks - 09.0",
    reportValue: "Outbound Clicks",
    goal: "WEB Online",
    objective: "Consideration",
    okr: "Get as many outbound clicks as possible",
    costMetric: "CP.OC",
    metric: "Outbound click through rate",
    costMetricFormula: "Spend / Outbound Clicks",
    waterfallMetricFormula: "(Outbound Clicks / Reach) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 10,
    formattedItemNo: "Conversation - 010.0",
    reportValue: "Conversation",
    goal: "BOT",
    objective: "Consideration",
    okr: "Get as many conversations started as possible",
    costMetric: "CP.Convo",
    metric: "Conversation Started rate",
    costMetricFormula: "Spend / Conversations Started",
    waterfallMetricFormula: "(Conversations Started / Reach) * 100",
    channel: "Facebook, Instagram, Whatsapp"
  },
  {
    itemNo: 11,
    formattedItemNo: "Landing Page Views - 011.0",
    reportValue: "Landing Page Views",
    goal: "WEB Online",
    objective: "Consideration",
    okr: "Get as many landing page views as possible",
    costMetric: "CP.LPV",
    metric: "Landing page view rate",
    costMetricFormula: "Spend / Landing Page Views",
    waterfallMetricFormula: "(Landing Page Views / Reach) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 12,
    formattedItemNo: "App Purchases - 012.0",
    reportValue: "App Purchases",
    goal: "APP Journey",
    objective: "Consideration",
    okr: "Get as many app purchases as possible",
    costMetric: "CP.AP",
    metric: "App Purchase Rate",
    costMetricFormula: "Spend / App Purchases",
    waterfallMetricFormula: "(App Purchases / Outbound Clicks) * 100",
    revenueMetric: "App Purchase Value",
    costOfRevenueMetric: "ROAS",
    costOfRevenueMetricFormula: "Total App Purchase Value / Total Spend",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 13,
    formattedItemNo: "App Download - 013.0",
    reportValue: "App Download",
    goal: "APP Journey",
    objective: "Consideration",
    okr: "Get as many app downloads as possible",
    costMetric: "CP.AD",
    metric: "App Download Rate",
    costMetricFormula: "Spend / App Download",
    waterfallMetricFormula: "(App downloads / Outbound Clicks) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 14,
    formattedItemNo: "App Installs - 014.0",
    reportValue: "App Installs",
    goal: "APP Journey",
    objective: "Consideration",
    okr: "Get as many app Installs as possible",
    costMetric: "CP.Install",
    metric: "App Install Rate",
    costMetricFormula: "Spend / App Installs",
    waterfallMetricFormula: "(App Installs / Outbound Clicks) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 15,
    formattedItemNo: "App Opens - 015.0",
    reportValue: "App Opens",
    goal: "APP Journey",
    objective: "Consideration",
    okr: "Get as many app opens as possible",
    costMetric: "CP.AO",
    metric: "App Open Rate",
    costMetricFormula: "Spend / App Opens",
    waterfallMetricFormula: "(App Opens / Outbound Clicks) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 16,
    formattedItemNo: "App Engagements - 016.0",
    reportValue: "App Engagements",
    goal: "APP Journey",
    objective: "Consideration",
    okr: "Get as many app engagements as possible",
    costMetric: "CP.AE",
    metric: "App Engagement Rate",
    costMetricFormula: "Spend / App Engagements",
    waterfallMetricFormula: "(App Engagements / Outbound Clicks) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 17,
    formattedItemNo: "Add To Carts - 017.0",
    reportValue: "Add To Carts",
    goal: "e-Commerce",
    objective: "Consideration",
    okr: "Get as many add to carts as possible",
    costMetric: "CP.A2C",
    metric: "Add To Cart Rate",
    costMetricFormula: "Spend / Add To Carts",
    waterfallMetricFormula: "(Add To Carts / Outbound Clicks) * 100",
    revenueMetric: "Total Cart Value",
    costOfRevenueMetric: "Potential Return On Cart",
    costOfRevenueMetricFormula: "Total Cart Value / Total Spend",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 18,
    formattedItemNo: "Initiate Checkouts - 018.0",
    reportValue: "Initiate Checkouts",
    goal: "e-Commerce",
    objective: "Consideration",
    okr: "Get as many initiate checkouts as possible",
    costMetric: "CP.ICheckout",
    metric: "Initiate Checkout Rate",
    costMetricFormula: "Spend / Initiate Checkouts",
    waterfallMetricFormula: "(Initiate Checkouts / Outbound Clicks) * 100",
    revenueMetric: "Total Checkout Value",
    costOfRevenueMetric: "Potential Return On Checkout",
    costOfRevenueMetricFormula: "Total Checkout Value / Total Spend",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 19,
    formattedItemNo: "Add Payment Info - 019.0",
    reportValue: "Add Payment Info",
    goal: "e-Commerce",
    objective: "Consideration",
    okr: "Get as many people to complete payment info",
    costMetric: "CP.PaymentInfo",
    metric: "Add payment information rate",
    costMetricFormula: "Spend / Add Payment Info Events",
    waterfallMetricFormula: "(Add Payment Info / Outbound Clicks) * 100",
    revenueMetric: "Total Add Payment Info Value",
    costOfRevenueMetric: "Potential Return On Add Payment Info",
    costOfRevenueMetricFormula: "Total Add Payment Info Value / Total Spend",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 20,
    formattedItemNo: "Purchase - 020.0",
    reportValue: "Purchase",
    goal: "e-Commerce",
    objective: "Conversion",
    okr: "Get as many online purchases as possible",
    costMetric: "CP.Purchase",
    metric: "Purchase rate (Conversion Rate)",
    costMetricFormula: "Spend / Purchases",
    waterfallMetricFormula: "(Purchases / Outbound Clicks) * 100",
    revenueMetric: "Total Purchase Value",
    costOfRevenueMetric: "ROAS",
    costOfRevenueMetricFormula: "Total Purchase Value / Total Spend",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 21,
    formattedItemNo: "Form Completes (Lead) - 021.0",
    reportValue: "Form Completes (Lead)",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many leads initiated as possible",
    costMetric: "CPL",
    metric: "Form Complete Rate",
    costMetricFormula: "Spend / Form Completes",
    waterfallMetricFormula: "(Form Completes / Initiate Checkouts) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 22,
    formattedItemNo: "Fetched Leads - 022.0",
    reportValue: "Fetched Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many Fetched leads as possible",
    costMetric: "CPL.Fetched",
    metric: "Fetched Lead Rate",
    costMetricFormula: "Spend / Fetched Leads",
    waterfallMetricFormula: "(Fetched Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 23,
    formattedItemNo: "Standardised Leads - 023.0",
    reportValue: "Standardised Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many standardised leads as possible",
    costMetric: "CPL.Standardised",
    metric: "Standardised Lead Rate",
    costMetricFormula: "Spend / Standardised Leads",
    waterfallMetricFormula: "(Standardised Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 24,
    formattedItemNo: "ID Validated Leads - 024.0",
    reportValue: "ID Validated Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many ID Validated leads as possible",
    costMetric: "CPL.IDValidated",
    metric: "ID Validated Leads",
    costMetricFormula: "Spend / ID Validated",
    waterfallMetricFormula: "(ID Validated Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 25,
    formattedItemNo: "Phone Validated Leads - 025.0",
    reportValue: "Phone Validated Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many Phone Validated leads as possible",
    costMetric: "CPL.PhoneValidated",
    metric: "Phone Validated Leads",
    costMetricFormula: "Spend / Phone Validated",
    waterfallMetricFormula: "(Standardised Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 26,
    formattedItemNo: "Email Validated Leads - 026.0",
    reportValue: "Email Validated Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many Email Validated leads as possible",
    costMetric: "CPL.EmailValidated",
    metric: "Email validated Leads",
    costMetricFormula: "Spend / Email Validated",
    waterfallMetricFormula: "(Standardised Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 27,
    formattedItemNo: "Address Validated Leads - 027.0",
    reportValue: "Address Validated Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many Address Validated leads as possible",
    costMetric: "CPL.AddressValidated",
    metric: "Address validated Leads",
    costMetricFormula: "Spend / Address Validated",
    waterfallMetricFormula: "(Standardised Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 28,
    formattedItemNo: "Enriched Leads - 028.0",
    reportValue: "Enriched Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many enriched leads as possible",
    costMetric: "CPL.Enriched",
    metric: "Enriched Lead Rate",
    costMetricFormula: "Spend / Enriched Leads",
    waterfallMetricFormula: "(Enriched Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 29,
    formattedItemNo: "Internal DeDuped Leads - 029.0",
    reportValue: "Internal DeDuped Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many Deduplicated leads as possible",
    costMetric: "CPL.Deduped",
    metric: "Deduplicatin rate",
    costMetricFormula: "Spend / Internal DeDuped Leads",
    waterfallMetricFormula: "(Deduped Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 30,
    formattedItemNo: "Internal Scored Leads - 030.0",
    reportValue: "Internal Scored Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get As many scored leads as possible",
    costMetric: "CPL.InternalScored",
    metric: "Internal Scored Lead Rate",
    costMetricFormula: "Spend / Internal Scored Leads",
    waterfallMetricFormula: "(Internal Scored Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 31,
    formattedItemNo: "Contactability Verification - 031.0",
    reportValue: "Contactability Verification",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many contactable leads as possible",
    costMetric: "CPL.Verified",
    metric: "Lead Verification Rate",
    costMetricFormula: "Spend / Contactability Verification",
    waterfallMetricFormula: "(Contactability Verification / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 32,
    formattedItemNo: "Attempted to deliver Leads - 032.0",
    reportValue: "Attempted to deliver Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Attempt to deliver as many leads as possible",
    costMetric: "CPL.DelAttempted",
    metric: "Lead Delivery Attempted Rate",
    costMetricFormula: "Spend / Delivery Attempt",
    waterfallMetricFormula: "(Attempted Delivered Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 33,
    formattedItemNo: "Delivered Leads - 033.0",
    reportValue: "Delivered Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many delivered leads as possible",
    costMetric: "CPL.Delivered",
    metric: "Lead delivery rate",
    costMetricFormula: "Spend / Delivered Leads",
    waterfallMetricFormula: "(Delivered Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 34,
    formattedItemNo: "Accepted Leads - 034.0",
    reportValue: "Accepted Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many accepted leads as possible",
    costMetric: "CPL.Accepted",
    metric: "Lead acceptance rate",
    costMetricFormula: "Spend / Accepted Leads",
    waterfallMetricFormula: "(Accepted Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 35,
    formattedItemNo: "Inbound calls - 035.0",
    reportValue: "Inbound calls",
    goal: "WEB Leads & Sales",
    objective: "Conversion - Inbound",
    okr: "Get as many inbound calls as possible",
    costMetric: "CP.INCALL",
    metric: "Inbound call rate",
    costMetricFormula: "Spend / Inbound Calls",
    waterfallMetricFormula: "(Inbound Calls / Outbound Clicks) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 36,
    formattedItemNo: "Qualified Leads - 036.0",
    reportValue: "Qualified Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many qualified leads as possible",
    costMetric: "CPL.Qualified",
    metric: "Qualified lead rate",
    costMetricFormula: "Spend / Qualified Leads",
    waterfallMetricFormula: "(Qualified Leads / Leads) * 100",
    channel: "Facebook, Instagram, YouTube, Google Ads, TikTok"
  },
  {
    itemNo: 37,
    formattedItemNo: "Dialed Leads - 037.0",
    reportValue: "Dialed Leads",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many leads dialed as possible",
    costMetric: "CPL.Dialed",
    metric: "Lead dial rate",
    costMetricFormula: "Spend / Dialed Leads",
    waterfallMetricFormula: "(Dialed Leads / Qualified Leads) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 38,
    formattedItemNo: "Answered Calls - 038.0",
    reportValue: "Answered Calls",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Speak to as many leads as possible",
    costMetric: "CPL.Answered",
    metric: "Answer Rate",
    costMetricFormula: "Spend / Answered Leads",
    waterfallMetricFormula: "(Answered / Qualified Leads) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 39,
    formattedItemNo: "Right Party Contact - 039.0",
    reportValue: "Right Party Contact",
    goal: "WEB Leads & Sales",
    objective: "Conversion",
    okr: "Get as many right party connects as possible",
    costMetric: "CP.RPC",
    metric: "Right party contact rate",
    costMetricFormula: "Spend / RPCs",
    waterfallMetricFormula: "(RPCs / Qualified Leads) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 40,
    formattedItemNo: "Sales - 040.0",
    reportValue: "Sales",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion",
    okr: "Convert as many qualified leads to sales as possible",
    costMetric: "CP.Sale",
    metric: "Qualified Leads to Sale Rate (Lead-to-Sale)",
    costMetricFormula: "Spend / Sales",
    waterfallMetricFormula: "(Sales / Qualified Leads) * 100",
    revenueMetric: "Total Sales value",
    costOfRevenueMetric: "Potential return on sales",
    costOfRevenueMetricFormula: "Total Sales value / Total spend",
    channel: "CRM Integration"
  },
  {
    itemNo: 41,
    formattedItemNo: "Fetched Sales - 041.0",
    reportValue: "Fetched Sales",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion - CRM",
    okr: "Fetch as many sales as possible",
    costMetric: "CPS.Fetched",
    metric: "Fetched Sales Rate",
    costMetricFormula: "Spend / Fetched Sales",
    waterfallMetricFormula: "(Fetched Sales / Sales) * 100",
    revenueMetric: "Total Fetched Sales value",
    costOfRevenueMetric: "Potential return on sales",
    channel: "CRM Integration"
  },
  {
    itemNo: 42,
    formattedItemNo: "Attempted Delivery of Sales to Client CRM - 042.0",
    reportValue: "Attempted Delivery of Sales to Client CRM",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion - CRM",
    okr: "Attempted to delivery as many sales to client CRM",
    costMetric: "CPS.CRMAttempted",
    metric: "Attempted Sales CRM Delivery Rate",
    costMetricFormula: "Spend / Attempted Delivery of Sales to Client CRM",
    waterfallMetricFormula: "(Attempted Delivery of Sales to Client CRM / Sales) * 100",
    revenueMetric: "Total Fetched Sales value",
    channel: "CRM Integration"
  },
  {
    itemNo: 43,
    formattedItemNo: "Delivery of Sales to Client CRM - 043.0",
    reportValue: "Delivery of Sales to Client CRM",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion - CRM",
    okr: "Deliver as many sales to clients CRM as possible.",
    costMetric: "CPS.CRMDelivered",
    metric: "Delivered Sales CRM Delivery Rate",
    costMetricFormula: "Spend / Delivered Sales to Client CRM",
    waterfallMetricFormula: "(CRM Delivery / CRM Delivery Attempts) * 100",
    revenueMetric: "CRM Delivered Sales Value",
    costOfRevenueMetric: "Return on CRM Delivered Sales",
    costOfRevenueMetricFormula: "Delivered Sales Value / Total Spend",
    channel: "CRM Integration"
  },
  {
    itemNo: 44,
    formattedItemNo: "Accepted Client CRM Sales - 044.0",
    reportValue: "Accepted Client CRM Sales",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion - CRM",
    okr: "Get as many fetched sales accepted by client crm",
    costMetric: "CPS.CRMAccepted",
    metric: "Accepted Sales CRM Rate",
    costMetricFormula: "Spend / Accepted CRM Sales",
    waterfallMetricFormula: "(Accepted CRM Sales / Sales) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 45,
    formattedItemNo: "Delivered Sales - 045.0",
    reportValue: "Delivered Sales",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion",
    okr: "Get as many sales delivered as possible",
    costMetric: "CPS.Delivered",
    metric: "Delivery Rate",
    costMetricFormula: "Spend / Delivered Sales",
    waterfallMetricFormula: "(Delivered Sales / Sales) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 46,
    formattedItemNo: "Activated Sales - 046.0",
    reportValue: "Activated Sales",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion",
    okr: "Get as many sales activated as possible",
    costMetric: "CPS.Activated",
    metric: "Activation Rate",
    costMetricFormula: "Spend / Activated Sales",
    waterfallMetricFormula: "(Activated Sales / Sales) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 47,
    formattedItemNo: "Sales payment collected - 047.0",
    reportValue: "Sales payment collected",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion",
    okr: "Collect as many sales payments as possible",
    costMetric: "CPS.Collection",
    metric: "Sales Collection Rate",
    costMetricFormula: "Spend / Sales Payment Collections",
    waterfallMetricFormula: "(Sales Payment Collections / Sales) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 48,
    formattedItemNo: "Premium Collections - 048.0",
    reportValue: "Premium Collections",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion",
    okr: "Get as many Premium collections as possible",
    costMetric: "CPP.Collection",
    metric: "Premium Collection rate",
    costMetricFormula: "Spend / Premium Collections",
    waterfallMetricFormula: "(Premium Collections / Sales) * 100",
    channel: "CRM Integration"
  },
  {
    itemNo: 49,
    formattedItemNo: "Lifetime Value - 049.0",
    reportValue: "Lifetime Value",
    goal: "WEB Leads & Sales",
    objective: "Post Conversion",
    okr: "Get maximum customer lifetime value",
    costMetric: "CLTV",
    metric: "Return On Customer Life Time Value",
    costMetricFormula: "Total Revenue collected / Customer Total Acquisition Cost",
    waterfallMetricFormula: "Customer Life Time Revenue / Customer Total Acquisition Cost",
    revenueMetric: "ROAS",
    costOfRevenueMetricFormula: "Customer Life Time Revenue / Customer Total Acquisition Cost",
    channel: "CRM, Analytics"
  }
];

// Fast lookup maps
export const TAXONOMY_BY_ITEM_NO: Record<number, MetricTaxonomyItem> = {};
export const TAXONOMY_BY_REPORT_VALUE: Record<string, MetricTaxonomyItem> = {};
export const TAXONOMY_BY_COST_METRIC: Record<string, MetricTaxonomyItem> = {};

MASTER_TAXONOMY.forEach(item => {
  TAXONOMY_BY_ITEM_NO[item.itemNo] = item;
  TAXONOMY_BY_REPORT_VALUE[item.reportValue.toLowerCase()] = item;
  TAXONOMY_BY_COST_METRIC[item.costMetric.toLowerCase()] = item;
});

/**
 * Helper to retrieve taxonomy info by report value or code
 */
export function getTaxonomyItem(key: string | number): MetricTaxonomyItem | undefined {
  if (typeof key === 'number') {
    return TAXONOMY_BY_ITEM_NO[key];
  }
  const clean = key.toLowerCase().trim();
  return TAXONOMY_BY_REPORT_VALUE[clean] || TAXONOMY_BY_COST_METRIC[clean];
}
