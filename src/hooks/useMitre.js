import { useState, useEffect } from 'react';
import { loadMitreData, searchTechniques, getTechniqueById } from '../services/mitre';

export const useMitre = () => {
  const [mitreData, setMitreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMitreData()
      .then(data => {
        setMitreData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const search = (query) => searchTechniques(mitreData, query);
  const getById = (id) => getTechniqueById(mitreData, id);

  return { mitreData, loading, error, search, getById };
};
