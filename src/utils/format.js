export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

export const calculateVolume = (data) => {
  let vol = 0;
  Object.values(data).forEach((sets) => {
    sets.forEach((set) => {
      if (set.done && set.weight && set.reps) {
        vol += parseFloat(set.weight) * parseFloat(set.reps);
      }
    });
  });
  return vol;
};
