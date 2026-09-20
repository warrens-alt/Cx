import pandas as pd
import json
import ast
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_curve, auc
import matplotlib.pyplot as plt

# =============================================================================
# OBJECTIVE 1: Data Extraction & Preprocessing
# =============================================================================

def parse_comments_to_features(df, comments_col='comments'):
    """
    Parses a stringified key-value or JSON-like structure in the comments column
    and extracts Segment, Device_Model, and Package_Name into structured columns.
    
    Assumes format: "segment -> Charcoal | device_model -> BLACKVIEW WAVE | package_name -> C SaveR Combo 1GB"
    """
    def extract_fields(comment_str):
        if pd.isna(comment_str):
            return pd.Series([None, None, None])
        
        # Try splitting by ' | ' and ' -> '
        try:
            parts = comment_str.split(' | ')
            extracted = {}
            for part in parts:
                if ' -> ' in part:
                    k, v = part.split(' -> ', 1)
                    extracted[k.strip().lower()] = v.strip()
            
            return pd.Series([
                extracted.get('segment', None),
                extracted.get('device_model', None),
                extracted.get('package_name', None)
            ])
        except Exception:
            return pd.Series([None, None, None])

    df[['Segment', 'Device_Model', 'Package_Name']] = df[comments_col].apply(extract_fields)
    return df

# Example SQL JOIN Approach (BigQuery Dialect)
'''
-- SQL Approach to join Dataset 1 (Aggregated) with Dataset 2 (Granular)
-- Assumption: Dataset 1 aggregates at a daily/campaign level. 
-- We join on the campaign mapping and date bounds.
SELECT 
    d2.lead_id,
    d2.call_date,
    d2.status,
    d2.comments,
    d1.Amount_Spent,
    d1.MTN_Activated_Sales,
    d1.offershop_source
FROM `project.dataset.dataset2_calls` d2
LEFT JOIN `project.dataset.dataset1_marketing` d1
    -- Assuming offershop_source corresponds to campaign_id or source_id
    ON d2.source_id = d1.offershop_source 
    -- Assuming dateFetched in D1 is the day of the call in D2
    AND DATE(d2.call_date) = d1.dateFetched;
'''

def join_datasets_pandas(df1, df2):
    """
    Pandas approach to join Dataset 1 (df1) and Dataset 2 (df2).
    Assuming df1 is daily aggregated data per source, and df2 is granular leads.
    """
    # Convert dates to standard format
    df1['dateFetched'] = pd.to_datetime(df1['dateFetched']).dt.date
    df2['call_date_only'] = pd.to_datetime(df2['call_date']).dt.date
    
    # Merge on date and source identifier
    merged_df = pd.merge(
        df2, 
        df1, 
        left_on=['call_date_only', 'source_id'], 
        right_on=['dateFetched', 'offershop_source'], 
        how='left'
    )
    return merged_df

# =============================================================================
# OBJECTIVE 2: Full-Funnel Attribution & "Lead Bleed" Analytics
# =============================================================================

def calculate_cpa(df1):
    """
    Calculates the Cost-per-Acquisition (CPA) from Dataset 1.
    """
    df1['CPA'] = df1['Amount_Spent'] / df1['MTN_Activated_Sales'].replace(0, np.nan)
    return df1[['dateFetched', 'offershop_source', 'Amount_Spent', 'MTN_Activated_Sales', 'CPA']]

def generate_waterfall_chart(df1):
    """
    Generates a Waterfall chart mapping the drop-off from Impressions to Sales.
    Using dummy aggregated sums across the entire dataframe.
    """
    totals = df1[['Impressions', 'Form_Completion', 'Total_Leads_Passed_BLC_Vetting', 'MTN_Activated_Sales']].sum()
    
    fig = go.Figure(go.Waterfall(
        name = "Lead Funnel", 
        orientation = "v",
        measure = ["absolute", "relative", "relative", "relative"],
        x = ["Impressions", "Form Completion", "Passed BLC Vetting", "MTN Activated Sales"],
        textposition = "outside",
        text = [f"{v:,.0f}" for v in totals.values],
        y = [
            totals['Impressions'], 
            -(totals['Impressions'] - totals['Form_Completion']), 
            -(totals['Form_Completion'] - totals['Total_Leads_Passed_BLC_Vetting']), 
            -(totals['Total_Leads_Passed_BLC_Vetting'] - totals['MTN_Activated_Sales'])
        ],
        connector = {"line":{"color":"rgb(63, 63, 63)"}},
    ))
    
    fig.update_layout(title="Full-Funnel Attribution & Lead Bleed (Waterfall)", showlegend=False)
    return fig

# =============================================================================
# OBJECTIVE 3: Predictive Lead Scoring
# =============================================================================

def train_lead_scoring_model(df2):
    """
    Builds a Baseline Random Forest model to predict successful sales.
    """
    # 1. Target Variable Definition (Assuming 'SALE' or 'ACTV' denotes success)
    success_statuses = ['SALE', 'ACTV', 'SOLD']
    df2['is_sale'] = df2['status'].isin(success_statuses).astype(int)
    
    # 2. Feature Engineering
    # Extract time of day (hour) from start_epoch
    df2['hour_of_day'] = pd.to_datetime(df2['start_epoch'], unit='s').dt.hour
    
    features = ['called_count', 'gender', 'Segment', 'Device_Model', 'hour_of_day']
    target = 'is_sale'
    
    # Select subset and drop missing values for simplicity in baseline
    model_df = df2[features + [target]].dropna()
    
    # One-hot encode categorical variables
    X = pd.get_dummies(model_df[features], columns=['gender', 'Segment', 'Device_Model'], drop_first=True)
    y = model_df[target]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train Random Forest
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
    rf_model.fit(X_train, y_train)
    
    # Predictions
    y_pred_prob = rf_model.predict_proba(X_test)[:, 1]
    
    # Output Feature Importance
    importance_df = pd.DataFrame({
        'Feature': X.columns,
        'Importance': rf_model.feature_importances_
    }).sort_values(by='Importance', ascending=False)
    
    print("--- Feature Importance ---")
    print(importance_df.head(10))
    
    # Generate ROC-AUC Curve
    fpr, tpr, _ = roc_curve(y_test, y_pred_prob)
    roc_auc = auc(fpr, tpr)
    
    plt.figure(figsize=(8,6))
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (area = {roc_auc:.2f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic - Lead Scoring')
    plt.legend(loc="lower right")
    plt.show()
    
    return rf_model, importance_df

# =============================================================================
# OBJECTIVE 4: Call Center Operational Efficiency
# =============================================================================

def analyze_agent_efficiency(df2):
    """
    Aggregates metrics by user (agent) and generates a scatter plot for 
    Average Call Duration vs Conversion Rate.
    """
    success_statuses = ['SALE', 'ACTV', 'SOLD']
    df2['is_sale'] = df2['status'].isin(success_statuses).astype(int)
    
    # Convert length_in_sec to numeric, coercing errors
    df2['length_in_sec'] = pd.to_numeric(df2['length_in_sec'], errors='coerce')
    
    # Group by agent
    agent_metrics = df2.groupby('user').agg(
        total_calls=('lead_id', 'count'),
        avg_duration_sec=('length_in_sec', 'mean'),
        total_sales=('is_sale', 'sum')
    ).reset_index()
    
    # Calculate conversion rate
    agent_metrics['conversion_rate'] = (agent_metrics['total_sales'] / agent_metrics['total_calls']) * 100
    
    # Filter out agents with very few calls to avoid noise
    agent_metrics = agent_metrics[agent_metrics['total_calls'] > 20]
    
    # Scatter Plot using Plotly
    fig = px.scatter(
        agent_metrics, 
        x='avg_duration_sec', 
        y='conversion_rate',
        size='total_calls',
        hover_name='user',
        title="Agent Operational Efficiency: Avg Call Duration vs. Conversion Rate",
        labels={
            'avg_duration_sec': 'Average Call Duration (Seconds)',
            'conversion_rate': 'Conversion Rate (%)',
            'total_calls': 'Total Calls Handled'
        },
        color='conversion_rate',
        color_continuous_scale='Viridis'
    )
    
    return agent_metrics, fig

if __name__ == "__main__":
    print("Analytics Pipeline Loaded.")
