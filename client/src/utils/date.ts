export const formatSchedule = (start: string | Date, end: string | Date) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const datePart = s.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const startTime = s.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = e.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return sameDay ? `${datePart} ${startTime} - ${endTime}` : `${datePart} ${startTime}`;
};

export const getCountdown = (target: string | Date) => {
  const t = new Date(target).getTime();
  const diff = Math.max(0, t - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { diff, days, hours, minutes, seconds };
};
