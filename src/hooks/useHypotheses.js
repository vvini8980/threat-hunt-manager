import { useState, useEffect, useCallback } from 'react';
import * as storage from '../services/storage';

export const useHypotheses = () => {
  const [hypotheses, setHypotheses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await storage.getAllHypotheses();
    setHypotheses(data);
    setStats(storage.getStats(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async (data) => {
    await storage.addHypothesis(data);
    await refresh();
  };

  const update = async (id, data) => {
    await storage.updateHypothesis(id, data);
    await refresh();
  };

  const remove = async (id) => {
    await storage.deleteHypothesis(id);
    await refresh();
  };

  const addComment = async (id, text, analyst) => {
    await storage.addComment(id, text, analyst);
    await refresh();
  };

  return {
    hypotheses,
    stats,
    loading,
    refresh,
    add,
    update,
    remove,
    addComment
  };
};
