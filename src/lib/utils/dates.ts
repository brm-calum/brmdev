// Format date with fallback
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'No date';
  
  // Handle Unix timestamps (numbers)
  if (typeof dateString === 'number') {
    dateString = new Date(dateString).toISOString();
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Invalid date';
    }
    
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid date';
  }
}

// Format relative time (e.g. "2 hours ago")
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'No relative date';

  // Handle Unix timestamps (numbers)
  if (typeof dateString === 'number') {
    dateString = new Date(dateString).toISOString();
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (days < 7) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      return formatDate(dateString);
    }
  } catch (err) {
    console.error('Error formatting relative time:', err);
    return 'Invalid date';
  }
}