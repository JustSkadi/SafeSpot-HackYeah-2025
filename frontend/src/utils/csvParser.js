import Papa from 'papaparse';

export const fetchIncidents = async () => {
  const response = await fetch('/api/incidents.csv');
  const csv = await response.text();
  
  return new Promise((resolve) => {
    Papa.parse(csv, {
      header: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data)
    });
  });
};