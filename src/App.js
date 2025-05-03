import React, { useState } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// Cloud Function endpoint URL from environment variable
const FUNCTION_URL = process.env.REACT_APP_FUNCTION_URL;

// Required feature fields
const requiredFields = [
  'Age','BusinessTravel','DailyRate','Department','DistanceFromHome',
  'Education','EducationField','EnvironmentSatisfaction','Gender',
  'HourlyRate','JobInvolvement','JobLevel','JobRole','JobSatisfaction',
  'MaritalStatus','MonthlyIncome','NumCompaniesWorked','OverTime',
  'PercentSalaryHike','PerformanceRating','RelationshipSatisfaction',
  'StockOptionLevel','TotalWorkingYears','TrainingTimesLastYear',
  'WorkLifeBalance','YearsAtCompany','YearsInCurrentRole',
  'YearsSinceLastPromotion','YearsWithCurrManager'
];
const numericFields = [
  'Age','DailyRate','DistanceFromHome','Education','HourlyRate',
  'JobInvolvement','JobLevel','JobSatisfaction','MonthlyIncome',
  'NumCompaniesWorked','PercentSalaryHike','PerformanceRating',
  'RelationshipSatisfaction','StockOptionLevel','TotalWorkingYears',
  'TrainingTimesLastYear','WorkLifeBalance','YearsAtCompany',
  'YearsInCurrentRole','YearsSinceLastPromotion','YearsWithCurrManager'
];

export default function App() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessed(false);
    setProgress(0);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const cols = results.meta.fields.filter(f => requiredFields.includes(f));
        setHeaders(cols);
        setData(results.data.map(row => cols.reduce((acc, f) => ({ ...acc, [f]: row[f] }), {})));
        setStatus(`Loaded ${results.data.length} rows.`);
      }
    });
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProcessed(false);
    setProgress(0);
    const updated = [];
    for (let i = 0; i < data.length; i++) {
      setStatus(`Processing ${i + 1}/${data.length}`);
      const row = data[i];
      const features = {};
      headers.forEach(f => (features[f] = numericFields.includes(f) ? Number(row[f]) : row[f]));
      try {
        const res = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features })
        });
        const json = await res.json();
        updated.push({ ...row, attrition_probability: json.attrition_probability, attrition_label: json.attrition_label });
      } catch {
        updated.push({ ...row, attrition_probability: null, attrition_label: 'Error' });
      }
      setProgress(Math.round(((i + 1) / data.length) * 100));
    }
    setHeaders(prev => [...prev, 'attrition_probability','attrition_label']);
    setData(updated);
    setProcessing(false);
    setProcessed(true);
    setStatus('Processing complete!');
  };

  const downloadCSV = () => {
    const csv = Papa.unparse({ fields: headers, data });
    saveAs(new Blob([csv], { type: 'text/csv' }), 'predictions.csv');
  };

  return (
    <div style={{ position: 'relative', background: '#fff', minHeight: '100vh', overflow: 'hidden' }}>

      {/* Pink banner with title */}
      <header style={{ background: '#F8C8DC', padding: '1.5rem 0', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', zIndex: 1 }}>
        <h1 style={{ color: '#000', textAlign: 'center', fontSize: '4rem', margin: 0 }}>
          Narjis's Attrition App
        </h1>
      </header>

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <input id='csvInput' type='file' accept='.csv' onChange={handleFileUpload} style={{ display: 'none' }} />
        <label htmlFor='csvInput' style={{
          display: 'inline-block', padding: '1rem 2rem', fontSize: '1.6rem', borderRadius: '8px', background: '#F8C8DC', color: '#000', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'background 0.3s', marginBottom: '1rem'
        }}>
          Choose CSV File
        </label>

        {status && <p style={{ margin: '1rem 0', color: '#333', fontSize: '1.2rem' }}>{status}</p>}
        {processing && (
          <div style={{ width: '100%', maxWidth: '600px', margin: '1rem 0' }}>
            <div style={{ background: '#e0e0e0', borderRadius: '8px', overflow: 'hidden', height: '16px' }}>
              <div style={{ width: `${progress}%`, background: '#F8C8DC', height: '100%', transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: '1rem', color: '#333', textAlign: 'center' }}>{`${progress}%`}</p>
          </div>
        )}
        {data.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={handleProcess} disabled={processing} style={{ padding: '1rem 2rem', fontSize: '1.6rem', borderRadius: '12px', border: 'none', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', background: '#F8C8DC', color: '#000', cursor: processing ? 'not-allowed' : 'pointer' }}>
              {processing ? 'Processing...' : 'Run Predictions'}
            </button>
            <button onClick={downloadCSV} disabled={!processed} style={{ padding: '1rem 2rem', fontSize: '1.6rem', borderRadius: '12px', border: 'none', boxShadow: processed ? '0 4px 8px rgba(0,0,0,0.1)' : 'none', background: processed ? '#F8C8DC' : '#e0c2d1', color: '#000', cursor: processed ? 'pointer' : 'not-allowed' }}>
              Download Results
            </button>
          </div>
        )}
      </main>
    </div>
  );
}