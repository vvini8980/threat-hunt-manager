import { useState, useEffect, useCallback } from 'react';
import * as storage from '../services/storage';

export const useHypotheses = () => {
  const [hypotheses, setHypotheses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const hypoData = await storage.getAllHypotheses();
    const assignData = await storage.getAllAssignments();
    setHypotheses(hypoData);
    setAssignments(assignData);
    setStats(storage.getStats(hypoData));
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

  const updateAssignment = async (id, data) => {
    await storage.updateAssignment(id, data);
    await refresh();
  };

  const remove = async (id) => {
    await storage.deleteHypothesis(id);
    await refresh();
  };

  const removeAssignment = async (id) => {
    await storage.deleteAssignment(id);
    await refresh();
  };

  const addComment = async (id, text, analyst) => {
    await storage.addComment(id, text, analyst);
    await refresh();
  };

  return {
    hypotheses,
    assignments,
    stats,
    loading,
    refresh,
    add,
    update,
    updateAssignment,
    remove,
    removeAssignment,
    addComment
  };
};
